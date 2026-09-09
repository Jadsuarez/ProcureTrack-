<?php
/**
 * Request-specific signatory monitoring. No digital signatures are collected.
 */
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/workflow.php';
session_start();
if (empty($_SESSION['role'])) {
    jsonResponse(['success' => false, 'message' => 'Unauthorized. Please log in.'], 401);
}

$role = currentRole();
$input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
$action = $_GET['action'] ?? ($input['action'] ?? 'list');
$tracking = trim($_GET['tracking'] ?? ($input['tracking_number'] ?? ''));

function findRequestForSignatories(PDO $pdo, string $tracking): array
{
    if ($tracking === '') {
        jsonResponse(['success' => false, 'message' => 'Tracking number required.'], 400);
    }

    $stmt = $pdo->prepare('SELECT id, tracking_number, status FROM requests WHERE UPPER(tracking_number) = UPPER(?)');
    $stmt->execute([$tracking]);
    $request = $stmt->fetch();
    if (!$request) {
        jsonResponse(['success' => false, 'message' => 'Request not found.'], 404);
    }
    if (!isRequestVisibleToRole($request['status'], currentRole())) {
        jsonResponse(['success' => false, 'message' => requestVisibilityMessage(currentRole())], 403);
    }
    return $request;
}

function signatoryRows(PDO $pdo, int $requestId): array
{
    $stmt = $pdo->prepare(
        'SELECT id, signatory_name, designation, document_location, assigned_office, approval_order, status, signed_at, updated_by
         FROM request_signatories WHERE request_id = ? ORDER BY approval_order ASC, id ASC'
    );
    $stmt->execute([$requestId]);
    return $stmt->fetchAll();
}

function validAssignedOffice(string $office): bool
{
    return in_array($office, ['requesting', 'budget', 'accounting', 'procurement', 'pso', 'cashier'], true);
}

$pdo = getConnection();
$request = findRequestForSignatories($pdo, $tracking);
$requestId = (int) $request['id'];
$actor = $_SESSION['username'] ?? roleLabel($role);

if ($_SERVER['REQUEST_METHOD'] === 'GET' || $action === 'list') {
    jsonResponse(['success' => true, 'signatories' => signatoryRows($pdo, $requestId)]);
}

if (!in_array($action, ['add', 'update', 'delete', 'reorder', 'set_status'], true)) {
    jsonResponse(['success' => false, 'message' => 'Invalid signatory action.'], 400);
}

if ($action !== 'set_status' && !in_array($role, ['requesting', 'procurement'], true)) {
    jsonResponse(['success' => false, 'message' => 'Only Requesting Office or Procurement administrators can configure signatories.'], 403);
}

try {
    $pdo->beginTransaction();
    $rows = signatoryRows($pdo, $requestId);

    if ($action === 'add') {
        $name = trim($input['signatory_name'] ?? '');
        $designation = trim($input['designation'] ?? '');
        $documentLocation = trim($input['document_location'] ?? '');
        $assignedOffice = trim($input['assigned_office'] ?? '');
        if ($name === '' || strlen($name) > 150 || strlen($designation) > 150 || strlen($documentLocation) > 255 || !validAssignedOffice($assignedOffice)) {
            jsonResponse(['success' => false, 'message' => 'Enter a signatory name and valid assigned office.'], 400);
        }
        $insert = $pdo->prepare(
            'INSERT INTO request_signatories
               (request_id, signatory_name, designation, document_location, assigned_office, approval_order, status, updated_by)
               VALUES (?, ?, ?, ?, ?, ?, "Pending Signature", ?)'
        );
        $officeCount = count(array_filter($rows, fn($row) => $row['assigned_office'] === $assignedOffice));
        $insert->execute([$requestId, $name, $designation ?: null, $documentLocation ?: null, $assignedOffice, $officeCount + 1, $actor]);
    } elseif ($action === 'update') {
        $id = (int) ($input['id'] ?? 0);
        $name = trim($input['signatory_name'] ?? '');
        $designation = trim($input['designation'] ?? '');
        $documentLocation = trim($input['document_location'] ?? '');
        $assignedOffice = trim($input['assigned_office'] ?? '');
        if ($name === '' || strlen($name) > 150 || strlen($designation) > 150 || strlen($documentLocation) > 255 || !validAssignedOffice($assignedOffice)) {
            jsonResponse(['success' => false, 'message' => 'Enter a signatory name and valid assigned office.'], 400);
        }
        $update = $pdo->prepare(
            'UPDATE request_signatories SET signatory_name = ?, designation = ?, document_location = ?, assigned_office = ?, updated_by = ?
             WHERE id = ? AND request_id = ?'
        );
        $update->execute([$name, $designation ?: null, $documentLocation ?: null, $assignedOffice, $actor, $id, $requestId]);
    } elseif ($action === 'delete') {
        $id = (int) ($input['id'] ?? 0);
        $delete = $pdo->prepare('DELETE FROM request_signatories WHERE id = ? AND request_id = ?');
        $delete->execute([$id, $requestId]);
        if ($delete->rowCount() !== 1) {
            jsonResponse(['success' => false, 'message' => 'Signatory not found.'], 404);
        }
    } elseif ($action === 'reorder') {
        $order = $input['order'] ?? [];
        $orderIds = array_map('intval', $order);
        $orderRows = array_filter($rows, fn($row) => in_array((int) $row['id'], $orderIds, true));
        $offices = array_unique(array_map(fn($row) => $row['assigned_office'], $orderRows));
        if (count($offices) !== 1) {
            jsonResponse(['success' => false, 'message' => 'Signatories can only be reordered within the same office.'], 400);
        }
        $existingIds = array_map(fn($row) => (int) $row['id'], $orderRows);
        $submittedIds = array_map('intval', $order);
        sort($existingIds);
        $sortedSubmitted = $submittedIds;
        sort($sortedSubmitted);
        if ($existingIds !== $sortedSubmitted) {
            jsonResponse(['success' => false, 'message' => 'Invalid signatory order.'], 400);
        }
        $update = $pdo->prepare(
            'UPDATE request_signatories SET approval_order = ?, updated_by = ? WHERE id = ? AND request_id = ?'
        );
        foreach ($submittedIds as $position => $id) {
            $update->execute([$position + 1, $actor, $id, $requestId]);
        }
    } elseif ($action === 'set_status') {
        $id = (int) ($input['id'] ?? 0);
        $status = trim($input['status'] ?? '');
        if (!in_array($status, ['Signed', 'Skipped'], true)) {
            jsonResponse(['success' => false, 'message' => 'Invalid signatory status.'], 400);
        }
        $current = null;
        foreach ($rows as $row) {
            if ($row['status'] === 'Pending Signature') {
                $current = $row;
                break;
            }
        }
        if (!in_array($role, ['requesting', 'procurement'], true)
            && (!$current || $current['assigned_office'] !== $role)) {
            jsonResponse(['success' => false, 'message' => 'Only the assigned office can update this signatory.'], 403);
        }
        if (!$current || (int) $current['id'] !== $id) {
            jsonResponse(['success' => false, 'message' => 'Only the current signatory can be marked Signed or Skipped.'], 409);
        }
        $update = $pdo->prepare(
            'UPDATE request_signatories SET status = ?, signed_at = ?, updated_by = ?
             WHERE id = ? AND request_id = ? AND status = "Pending Signature"'
        );
        $update->execute([$status, $status === 'Signed' ? date('Y-m-d H:i:s') : null, $actor, $id, $requestId]);
    }

    $pdo->commit();
    jsonResponse(['success' => true, 'message' => 'Signatory workflow updated.', 'signatories' => signatoryRows($pdo, $requestId)]);
} catch (PDOException $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    jsonResponse(['success' => false, 'message' => 'Database error.'], 500);
}
