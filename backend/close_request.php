<?php
/**
 * Cancel or return a request and restore deducted funds once.
 */
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/workflow.php';
session_start();

if (empty($_SESSION['role'])) {
    jsonResponse(['success' => false, 'message' => 'Unauthorized. Please log in.'], 401);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'message' => 'POST required.'], 405);
}

$input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
$tracking = trim($input['tracking_number'] ?? '');
$action = trim($input['action'] ?? '');
$notes = trim($input['notes'] ?? '');
$role = currentRole();

if ($tracking === '' || !in_array($action, ['cancel', 'return'], true)) {
    jsonResponse(['success' => false, 'message' => 'Tracking number and a valid action are required.'], 400);
}

if ($action === 'cancel' && $role !== 'requesting') {
    jsonResponse(['success' => false, 'message' => 'Only Requesting Office can cancel a request.'], 403);
}

if ($action === 'return' && $role !== 'budget') {
    jsonResponse(['success' => false, 'message' => 'Only Budget Office can return a request.'], 403);
}

$newStatus = $action === 'cancel' ? 'Cancelled' : 'Returned';

try {
    $pdo = getConnection();
    $pdo->beginTransaction();
    $stmt = $pdo->prepare(
        'SELECT id, status, request_amount, funding_office, funds_restored
         FROM requests WHERE UPPER(tracking_number) = UPPER(?) FOR UPDATE'
    );
    $stmt->execute([$tracking]);
    $row = $stmt->fetch();
    if (!$row) {
        $pdo->rollBack();
        jsonResponse(['success' => false, 'message' => 'Request not found.'], 404);
    }

    if (isClosedStatus($row['status']) || $row['status'] === 'Completed') {
        $pdo->rollBack();
        jsonResponse(['success' => false, 'message' => 'This request can no longer be cancelled or returned.'], 400);
    }

    if ($action === 'return' && !in_array($row['status'], ['Registered', 'Under Budget Review', 'Reviewed'], true)) {
        $pdo->rollBack();
        jsonResponse(['success' => false, 'message' => 'Budget can only return requests that are still in the budget stage.'], 400);
    }

    if ($action === 'cancel' && in_array($row['status'], ['Paid', 'Completed'], true)) {
        $pdo->rollBack();
        jsonResponse(['success' => false, 'message' => 'Paid or completed requests cannot be cancelled.'], 400);
    }

    $updatedBy = currentActorLabel();
    $reason = $notes !== '' ? $notes : ($action === 'cancel'
        ? 'Request cancelled by Requesting Office'
        : 'Request returned to Requesting Office');

    $update = $pdo->prepare('UPDATE requests SET status = ?, notes = ?, updated_by = ? WHERE id = ?');
    $update->execute([$newStatus, $reason, $updatedBy, (int) $row['id']]);

    $log = $pdo->prepare(
        'INSERT INTO status_logs (request_id, status, notes, updated_by) VALUES (?, ?, ?, ?)'
    );
    $log->execute([(int) $row['id'], $newStatus, $reason, $updatedBy]);

    restoreRequestFunds($pdo, $row);
    $pdo->commit();

    jsonResponse([
        'success' => true,
        'message' => $action === 'cancel'
            ? 'Request cancelled and funds restored.'
            : 'Request returned and funds restored.',
        'status' => $newStatus,
    ]);
} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    jsonResponse(['success' => false, 'message' => 'Database error.'], 500);
}
