<?php
require_once __DIR__ . '/db.php';
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

$budgetStatuses = ['Under Budget Review', 'Reviewed'];
$procurementStatuses = ['Canvass', 'Abstract of Canvass', 'PO', 'For Bidding', 'Bidding Award'];
$psoStatuses = ['Delivered', 'For Inspection', 'Accepted'];
$accountingStatuses = ['DV Processing', 'For Payment'];
$cashierStatuses = ['Paid', 'Completed'];

if ($tracking === '' || $status === '') {
    jsonResponse(['success' => false, 'message' => 'Tracking number and status are required.'], 400);
}

if ($role === 'budget' && !in_array($status, $budgetStatuses, true)) {
    jsonResponse(['success' => false, 'message' => 'Invalid status for Budget Office.'], 400);
}

if ($role === 'procurement' && !in_array($status, $procurementStatuses, true)) {
    jsonResponse(['success' => false, 'message' => 'Invalid status for Procurement Office.'], 400);
}

if ($role === 'pso' && !in_array($status, $psoStatuses, true)) {
    jsonResponse(['success' => false, 'message' => 'Invalid status for Property and Supply Office.'], 400);
}

if ($role === 'accounting' && !in_array($status, $accountingStatuses, true)) {
    jsonResponse(['success' => false, 'message' => 'Invalid status for Accounting Office.'], 400);
}

if ($role === 'cashier' && !in_array($status, $cashierStatuses, true)) {
    jsonResponse(['success' => false, 'message' => 'Invalid status for Cashier.'], 400);
}

try {
    $pdo = getConnection();
    $stmt = $pdo->prepare('SELECT id, status FROM requests WHERE UPPER(tracking_number) = UPPER(?)');
    $stmt->execute([$tracking]);
    $row = $stmt->fetch();

    if (!$row) {
        jsonResponse(['success' => false, 'message' => 'Request not found.'], 404);
    }

    if (!isRequestVisibleToRole($row['status'], $role)) {
        jsonResponse(['success' => false, 'message' => requestVisibilityMessage($role)], 403);
    }

    $requestId = (int) $row['id'];
    $updatedBy = roleLabel($role);

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

    jsonResponse(['success' => true, 'message' => 'Status updated successfully.']);
} catch (PDOException $e) {
    jsonResponse(['success' => false, 'message' => 'Database error.'], 500);
}
