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
    if (!isRequestAccessibleToRole($pdo, $request, currentRole())) {
        if ($request['status'] === 'Registered' && isSignatoryOffice(currentRole())) {
            $currentOffice = officeForRequestSignatures($pdo, (int) $request['id'], $request['status']);
            jsonResponse([
                'success' => false,
                'message' => 'This request is currently waiting for ' . roleLabel($currentOffice) . '. A signatory office can mark its signature only when that office is next.',
            ], 409);
        }
        jsonResponse(['success' => false, 'message' => requestVisibilityMessage(currentRole())], 403);
    }
    return $request;
}

function signatoryRows(PDO $pdo, int $requestId): array
{
    $stmt = $pdo->prepare(
        'SELECT id, template_key, signatory_name, designation, department, document_location, assigned_office, approval_order, status, signed_at, updated_by, updated_at
         FROM request_signatories WHERE request_id = ? ORDER BY approval_order ASC, id ASC'
    );
    $stmt->execute([$requestId]);
    return $stmt->fetchAll();
}

function validAssignedOffice(string $office): bool
{
    return in_array($office, ['requesting', 'budget', 'accounting', 'procurement', 'pso', 'cashier', 'vc_admin_finance', 'chancellor', 'academic_affairs'], true);
}

function logSignatoryChange(PDO $pdo, int $requestId, ?int $signatoryId, ?string $office, string $action, ?string $status, string $actor): void
{
    $stmt = $pdo->prepare(
        'INSERT INTO request_signatory_logs
         (request_id, signatory_id, assigned_office, action, status, updated_by)
         VALUES (?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([$requestId, $signatoryId, $office, $action, $status, $actor]);
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

$isAdmin = in_array($role, ['requesting', 'procurement'], true);
if (in_array($action, ['add', 'update', 'delete', 'reorder'], true) && !$isAdmin) {
    jsonResponse(['success' => false, 'message' => 'Only Requesting Office or Procurement can manage custom signatories.'], 403);
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
        $nextOrder = $rows
            ? max(array_map(fn($row) => (int) $row['approval_order'], $rows)) + 1
            : 1;
        $insert->execute([$requestId, $name, $designation ?: null, $documentLocation ?: null, $assignedOffice, $nextOrder, $actor]);
        logSignatoryChange($pdo, $requestId, (int) $pdo->lastInsertId(), $assignedOffice, 'Added', 'Pending Signature', $actor);
    } elseif ($action === 'update') {
        $id = (int) ($input['id'] ?? 0);
        $target = array_values(array_filter($rows, fn($row) => (int) $row['id'] === $id))[0] ?? null;
        if (!$target) {
            jsonResponse(['success' => false, 'message' => 'Signatory not found.'], 404);
        }
        if (!empty($target['template_key'])) {
            jsonResponse(['success' => false, 'message' => 'Signatory names can only be changed in Office Settings.'], 403);
        }
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
        logSignatoryChange($pdo, $requestId, $id, $assignedOffice, 'Updated', null, $actor);
    } elseif ($action === 'delete') {
        $id = (int) ($input['id'] ?? 0);
        $deleteSql = 'DELETE FROM request_signatories WHERE id = ? AND request_id = ?';
        $delete = $pdo->prepare($deleteSql);
        $deletedRow = array_values(array_filter($rows, fn($row) => (int) $row['id'] === $id))[0] ?? null;
        if (!$deletedRow) {
            jsonResponse(['success' => false, 'message' => 'Signatory not found.'], 404);
        }
        if (!empty($deletedRow['template_key'])) {
            jsonResponse(['success' => false, 'message' => 'Required signatories cannot be removed from a request.'], 403);
        }
        $delete->execute([$id, $requestId]);
        if ($delete->rowCount() !== 1) {
            jsonResponse(['success' => false, 'message' => 'Signatory not found.'], 404);
        }
        logSignatoryChange($pdo, $requestId, $id, $deletedRow['assigned_office'] ?? null, 'Removed', $deletedRow['status'] ?? null, $actor);
    } elseif ($action === 'reorder') {
        $order = $input['order'] ?? [];
        if (!is_array($order) || $order === [] || count($order) !== count(array_unique(array_map('intval', $order)))) {
            jsonResponse(['success' => false, 'message' => 'Select a valid order for the additional signatories.'], 400);
        }
        $orderIds = array_map('intval', $order);
        $orderRows = array_filter($rows, fn($row) => in_array((int) $row['id'], $orderIds, true));
        $officeSignatories = array_filter(
            $rows,
            fn($row) => empty($row['template_key'])
        );
        $existingIds = array_map(fn($row) => (int) $row['id'], $orderRows);
        $submittedIds = array_map('intval', $order);
        sort($existingIds);
        $sortedSubmitted = $submittedIds;
        sort($sortedSubmitted);
        $allOfficeCustomIds = array_map(fn($row) => (int) $row['id'], $officeSignatories);
        sort($allOfficeCustomIds);
        if ($existingIds !== $sortedSubmitted || $sortedSubmitted !== $allOfficeCustomIds) {
            jsonResponse(['success' => false, 'message' => 'Invalid signatory order.'], 400);
        }
        $update = $pdo->prepare(
            'UPDATE request_signatories SET approval_order = ?, updated_by = ? WHERE id = ? AND request_id = ?'
        );
        $fixedOrders = array_map(
            fn($row) => (int) $row['approval_order'],
            array_filter(
                $rows,
                fn($row) => !empty($row['template_key'])
            )
        );
        $firstCustomOrder = $fixedOrders ? max($fixedOrders) + 1 : 1;
        foreach ($submittedIds as $position => $id) {
            $update->execute([$firstCustomOrder + $position, $actor, $id, $requestId]);
        }
        logSignatoryChange($pdo, $requestId, null, null, 'Reordered', null, $actor);
    } elseif ($action === 'set_status') {
        $id = (int) ($input['id'] ?? 0);
        $status = trim($input['status'] ?? '');
        if ($id <= 0) {
            jsonResponse(['success' => false, 'message' => 'A valid signatory ID is required.'], 400);
        }
        if (!in_array($status, ['Pending Signature', 'Signed', 'Skipped'], true)) {
            jsonResponse(['success' => false, 'message' => 'Invalid signatory status.'], 400);
        }
        $target = null;
        foreach ($rows as $row) {
            if ((int) $row['id'] === $id) {
                $target = $row;
                break;
            }
        }
        if (!$target) {
            jsonResponse(['success' => false, 'message' => 'Signatory not found.'], 404);
        }
        if (!empty($target['template_key']) && $status !== 'Signed') {
            jsonResponse(['success' => false, 'message' => 'Required signatories can only be marked Signed.'], 400);
        }
        if (!empty($target['template_key']) && $role !== $target['assigned_office']) {
            jsonResponse(['success' => false, 'message' => 'Only the assigned signatory office account can record this required signature.'], 403);
        }
        $isAdmin = in_array($role, ['requesting', 'procurement'], true);
        if (!$isAdmin && ($target['assigned_office'] !== $role || $target['status'] !== 'Pending Signature')) {
            jsonResponse(['success' => false, 'message' => 'Only the assigned office can update this signatory.'], 403);
        }
        if (!$isAdmin) {
            $currentOffice = officeForRequestSignatures($pdo, $requestId, $request['status']);
            $current = null;
            foreach ($rows as $row) {
                if ($row['assigned_office'] === $currentOffice && $row['status'] === 'Pending Signature') {
                    $current = $row;
                    break;
                }
            }
            if (!$current || (int) $current['id'] !== $id) {
                jsonResponse(['success' => false, 'message' => 'Only the current signatory for this office can be updated.'], 409);
            }
        }
        if (!$isAdmin && $status === 'Pending Signature') {
            jsonResponse(['success' => false, 'message' => 'Only the current signatory can be marked Signed or Skipped.'], 409);
        }
        $statusWhere = $isAdmin ? '' : ' AND status = "Pending Signature"';
        $update = $pdo->prepare(
            'UPDATE request_signatories SET status = ?, signed_at = ?, updated_by = ?
             WHERE id = ? AND request_id = ?' . $statusWhere
        );
        $update->execute([$status, $status === 'Signed' ? date('Y-m-d H:i:s') : null, $actor, $id, $requestId]);
        logSignatoryChange($pdo, $requestId, $id, $target['assigned_office'], $status === 'Signed' ? 'Signed' : $status, $status, $actor);
    }

    $pdo->commit();
    jsonResponse(['success' => true, 'message' => 'Signatory workflow updated.', 'signatories' => signatoryRows($pdo, $requestId)]);
} catch (PDOException $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    jsonResponse(['success' => false, 'message' => 'Database error.'], 500);
}
