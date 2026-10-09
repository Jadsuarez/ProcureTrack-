<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/workflow.php';
requireRole(['budget', 'procurement', 'pso', 'accounting', 'cashier']);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'message' => 'POST required.'], 405);
}

$input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
$tracking = trim($input['tracking_number'] ?? '');
$status = trim($input['status'] ?? '');
$notes = trim($input['notes'] ?? '');
$bur = trim($input['bur'] ?? '');
$ors = trim($input['ors'] ?? '');
$budgetType = trim($input['budget_type'] ?? '');

$role = currentRole();

if ($tracking === '' || $status === '') {
    jsonResponse(['success' => false, 'message' => 'Tracking number and status are required.'], 400);
}

try {
    $pdo = getConnection();
    $pdo->beginTransaction();
    $stmt = $pdo->prepare('SELECT id, status FROM requests WHERE UPPER(tracking_number) = UPPER(?) FOR UPDATE');
    $stmt->execute([$tracking]);
    $row = $stmt->fetch();

    if (!$row) {
        $pdo->rollBack();
        jsonResponse(['success' => false, 'message' => 'Request not found.'], 404);
    }

    if (isSignatoryOffice($role) && $row['status'] === 'Registered') {
        $pdo->rollBack();
        jsonResponse(['success' => false, 'message' => 'Signatory offices can mark their assigned signatures only. The Budget Office must start review after required signatures are complete.'], 409);
    }

    if (isClosedStatus($row['status']) || $row['status'] === 'Completed') {
        $pdo->rollBack();
        jsonResponse(['success' => false, 'message' => 'Closed or completed requests cannot be updated.'], 400);
    }

    $nextStatus = nextStatusForOffice($role, (string) $row['status']);
    if ($nextStatus === null || $status !== $nextStatus) {
        $pdo->rollBack();
        jsonResponse([
            'success' => false,
            'message' => $nextStatus === null
                ? 'This request is not at a status your office can advance.'
                : "The next valid status is \"{$nextStatus}\". Requests cannot skip or repeat workflow stages.",
        ], 409);
    }

    if (!isRequestAccessibleToRole($pdo, $row, $role)) {
        $pdo->rollBack();
        jsonResponse(['success' => false, 'message' => requestVisibilityMessage($role)], 403);
    }

    if ($row['status'] === 'Registered' && !requiredSignaturesComplete($pdo, (int) $row['id'])) {
        $pdo->rollBack();
        jsonResponse([
            'success' => false,
            'message' => 'Budget review is locked until all four required signatories are marked Signed.',
        ], 409);
    }

    $currentOffice = officeForRequestSignatures($pdo, (int) $row['id'], $row['status']);
    $signatureCheck = $pdo->prepare(
        'SELECT COUNT(*) AS assigned_count,
                SUM(status = "Pending Signature") AS pending_count
         FROM request_signatories
         WHERE request_id = ? AND assigned_office = ?'
    );
    $signatureCheck->execute([(int) $row['id'], $currentOffice]);
    $signatureState = $signatureCheck->fetch();
    if ((int) $signatureState['pending_count'] > 0) {
        $pdo->rollBack();
        jsonResponse([
            'success' => false,
            'message' => roleLabel($currentOffice) . ' cannot update this request until its assigned signatories are complete.',
        ], 409);
    }

    $requestId = (int) $row['id'];
    $updatedBy = currentActorLabel();

    if ($role === 'budget') {
        $update = $pdo->prepare(
            'UPDATE requests SET status = ?, bur = COALESCE(NULLIF(?, ""), bur),
             ors = COALESCE(NULLIF(?, ""), ors), budget_type = COALESCE(NULLIF(?, ""), budget_type),
             notes = COALESCE(NULLIF(?, ""), notes), updated_by = ? WHERE id = ?'
        );
        $update->execute([$status, $bur, $ors, $budgetType, $notes, $updatedBy, $requestId]);
    } else {
        $update = $pdo->prepare(
            'UPDATE requests SET status = ?, notes = COALESCE(NULLIF(?, ""), notes), updated_by = ? WHERE id = ?'
        );
        $update->execute([$status, $notes, $updatedBy, $requestId]);
    }

    $log = $pdo->prepare(
        'INSERT INTO status_logs (request_id, status, notes, updated_by) VALUES (?, ?, ?, ?)'
    );
    $log->execute([$requestId, $status, $notes ?: null, $updatedBy]);

    $pdo->commit();
    jsonResponse(['success' => true, 'message' => 'Status updated successfully.']);
} catch (PDOException $e) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    jsonResponse(['success' => false, 'message' => 'Database error.'], 500);
}
