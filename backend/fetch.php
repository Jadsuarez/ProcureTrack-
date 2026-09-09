<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/workflow.php';
session_start();
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

if (empty($_SESSION['role'])) {
    jsonResponse(['success' => false, 'message' => 'Unauthorized.'], 401);
}

$pdo = getConnection();
$action = $_GET['action'] ?? '';
$role = $_SESSION['role'];

try {
    switch ($action) {
        case 'summary':
            $allRequests = $pdo->query(
                'SELECT tracking_number, title, status, updated_at, created_at FROM requests'
            )->fetchAll();
            $visible = filterRequestsForRole($allRequests, $role);

            $byStatusMap = [];
            foreach ($visible as $r) {
                $byStatusMap[$r['status']] = ($byStatusMap[$r['status']] ?? 0) + 1;
            }
            $byStatus = [];
            foreach ($byStatusMap as $status => $count) {
                $byStatus[] = ['status' => $status, 'count' => $count];
            }
            usort($byStatus, fn($a, $b) => $b['count'] <=> $a['count']);

            usort($visible, fn($a, $b) => strcmp($b['updated_at'], $a['updated_at']));
            $recent = array_slice($visible, 0, 8);

            $focusStatuses = match ($role) {
                'accounting' => ['DV Processing', 'For Payment'],
                'cashier' => ['For Payment', 'Paid', 'Completed'],
                'budget' => ['Registered', 'Under Budget Review', 'Reviewed'],
                'procurement' => ['Reviewed', 'Canvass', 'PO'],
                'pso' => ['Delivered', 'For Inspection', 'Accepted'],
                default => [],
            };

            jsonResponse([
                'success' => true,
                'total' => count($visible),
                'by_status' => $byStatus,
                'recent' => $recent,
                'role' => $role,
                'focus_statuses' => $focusStatuses,
            ]);
            break;

        case 'search':
            $tracking = trim($_GET['tracking'] ?? '');
            if ($tracking === '') {
                jsonResponse(['success' => false, 'message' => 'Enter a tracking number.'], 400);
            }

            $exactStmt = $pdo->prepare('SELECT * FROM requests WHERE UPPER(tracking_number) = UPPER(?)');
            $exactStmt->execute([$tracking]);
            $exact = $exactStmt->fetch();
            if ($exact && !isRequestVisibleToRole($exact['status'], $role)) {
                jsonResponse(['success' => false, 'message' => requestVisibilityMessage($role)], 403);
            }

            $stmt = $pdo->prepare(
                'SELECT * FROM requests WHERE UPPER(tracking_number) LIKE UPPER(?) ORDER BY tracking_number'
            );
            $stmt->execute(['%' . $tracking . '%']);
            $requests = filterRequestsForRole($stmt->fetchAll(), $role);
            jsonResponse(['success' => true, 'requests' => $requests]);
            break;

        case 'status_requests':
            $status = trim($_GET['status'] ?? '');
            if (!in_array($status, statusesForOffice($role), true)) {
                jsonResponse(['success' => false, 'message' => 'Invalid status for this office.'], 400);
            }
            $statusStmt = $pdo->prepare(
                'SELECT tracking_number, title, status, updated_at, created_at
                 FROM requests WHERE status = ? ORDER BY updated_at DESC, tracking_number ASC'
            );
            $statusStmt->execute([$status]);
            $requests = filterRequestsForRole($statusStmt->fetchAll(), $role);
            jsonResponse([
                'success' => true,
                'status' => $status,
                'requests' => $requests,
                'total' => count($requests),
            ]);
            break;

        case 'requesting_requests':
            if ($role !== 'requesting') {
                jsonResponse(['success' => false, 'message' => 'Requesting Office access required.'], 403);
            }
            $requestingStmt = $pdo->query(
                "SELECT tracking_number, title, status, request_amount, created_at, updated_at
                 FROM requests
                 WHERE funding_office = 'requesting' OR funding_office IS NULL
                 ORDER BY updated_at DESC, tracking_number ASC"
            );
            $requestingRequests = $requestingStmt->fetchAll();
            jsonResponse([
                'success' => true,
                'requests' => $requestingRequests,
                'total' => count($requestingRequests),
            ]);
            break;

        case 'office_requests':
            $officeStmt = $pdo->query(
                'SELECT tracking_number, title, status, request_amount, created_at, updated_at
                 FROM requests ORDER BY updated_at DESC, tracking_number ASC'
            );
            $officeRequests = filterRequestsForRole($officeStmt->fetchAll(), $role);
            jsonResponse([
                'success' => true,
                'office_label' => roleLabel($role),
                'requests' => $officeRequests,
                'total' => count($officeRequests),
                'statuses' => statusesForOffice($role),
            ]);
            break;

        case 'detail':
            $tracking = trim($_GET['tracking'] ?? '');
            if ($tracking === '') {
                jsonResponse(['success' => false, 'message' => 'Tracking number required.'], 400);
            }
            $stmt = $pdo->prepare('SELECT * FROM requests WHERE UPPER(tracking_number) = UPPER(?)');
            $stmt->execute([$tracking]);
            $request = $stmt->fetch();
            if (!$request) {
                jsonResponse(['success' => false, 'message' => 'Request not found.'], 404);
            }

            if (!isRequestVisibleToRole($request['status'], $role)) {
                jsonResponse(['success' => false, 'message' => requestVisibilityMessage($role)], 403);
            }

            $logStmt = $pdo->prepare(
                'SELECT status, notes, updated_by, created_at
                 FROM status_logs WHERE request_id = ? ORDER BY created_at ASC'
            );
            $logStmt->execute([$request['id']]);
            $timeline = $logStmt->fetchAll();

            $docStmt = $pdo->prepare(
                'SELECT id, file_name, file_path, uploaded_by, uploaded_at
                 FROM documents WHERE request_id = ? ORDER BY uploaded_at DESC'
            );
            $docStmt->execute([$request['id']]);
            $documents = $docStmt->fetchAll();

            $signatoryStmt = $pdo->prepare(
                'SELECT id, signatory_name, designation, document_location, assigned_office, approval_order, status, signed_at, updated_by, updated_at
                 FROM request_signatories
                 WHERE request_id = ? ORDER BY approval_order ASC, id ASC'
            );
            $signatoryStmt->execute([$request['id']]);
            $signatories = $signatoryStmt->fetchAll();
            $signatoryLogStmt = $pdo->prepare(
                'SELECT id, signatory_id, assigned_office, action, status, updated_by, created_at
                 FROM request_signatory_logs WHERE request_id = ? ORDER BY created_at ASC, id ASC'
            );
            $signatoryHistory = $signatoryLogStmt->execute([$request['id']]) ? $signatoryLogStmt->fetchAll() : [];
            $signedCount = count(array_filter($signatories, fn($s) => $s['status'] === 'Signed'));
            $remainingCount = count(array_filter($signatories, fn($s) => $s['status'] === 'Pending Signature'));
            $currentOffice = officeForStatus($request['status']);
            $currentOfficeRows = array_values(array_filter(
                $signatories,
                fn($signatory) => $signatory['assigned_office'] === $currentOffice
            ));
            $allSignaturesResolved = $signatories
                && $remainingCount === 0;
            $currentOfficeReady = $currentOfficeRows
                ? count(array_filter($currentOfficeRows, fn($s) => $s['status'] === 'Pending Signature')) === 0
                : $allSignaturesResolved;
            $currentSignatory = null;
            foreach ($signatories as $signatory) {
                if ($signatory['assigned_office'] === $currentOffice
                    && $signatory['status'] === 'Pending Signature') {
                    $currentSignatory = $signatory;
                    break;
                }
            }
            $officeSummary = [];
            foreach ($signatories as $signatory) {
                $office = $signatory['assigned_office'] ?: 'unassigned';
                if (!isset($officeSummary[$office])) {
                    $officeSummary[$office] = ['office' => $office, 'total' => 0, 'completed' => 0, 'remaining' => 0];
                }
                $officeSummary[$office]['total']++;
                if ($signatory['status'] === 'Signed' || $signatory['status'] === 'Skipped') {
                    $officeSummary[$office]['completed']++;
                }
                if ($signatory['status'] === 'Pending Signature') {
                    $officeSummary[$office]['remaining']++;
                }
            }

            jsonResponse([
                'success' => true,
                'request' => $request,
                'timeline' => $timeline,
                'documents' => $documents,
                'signatories' => $signatories,
                'signatory_history' => $signatoryHistory,
                'signatory_summary' => [
                    'current' => $currentSignatory,
                    'completed' => $signedCount,
                    'remaining' => $remainingCount,
                    'overall_status' => $signatories && $remainingCount === 0
                        ? 'Signatures Complete'
                        : ($signatories ? 'Awaiting Signatures' : 'No Signatories Configured'),
                    'current_office' => $currentOffice,
                    'ready_for_status_update' => $currentOfficeReady,
                    'by_office' => array_values($officeSummary),
                ],
            ]);
            break;

        case 'notifications':
            $notificationLimit = $role === 'procurement' ? '' : ' LIMIT 120';
            $logStmt = $pdo->query(
                'SELECT sl.id, sl.status, sl.notes, sl.updated_by, sl.created_at,
                        r.tracking_number, r.title, r.status AS current_status
                 FROM status_logs sl
                 INNER JOIN requests r ON r.id = sl.request_id
                 ORDER BY sl.created_at DESC, sl.id DESC' . $notificationLimit
            );

            $notifications = [];
            foreach ($logStmt as $row) {
                $adj = adjacentOfficesForStatus($row['status']);
                $targets = officesNotifiedForStatus($row['status']);
                if (!in_array($role, $targets, true)) {
                    continue;
                }

                $tracking = $row['tracking_number'];
                $status = $row['status'];
                $isNew = $status === 'Registered';
                $isNext = $role === $adj['next'];
                $isPrev = $role === $adj['previous'];

                if ($isNew && $role === 'procurement') {
                    $message = "New request {$tracking} was submitted by Requesting Office.";
                    if (!isRequestVisibleToRole($row['current_status'], $role)) {
                        $message .= ' Awaiting Budget review.';
                    }
                } elseif ($isNew && $isNext && !$isPrev) {
                    $message = "New request {$tracking} is ready for your office.";
                } elseif ($isNew && $isPrev) {
                    $message = "Request {$tracking} was submitted.";
                } elseif ($isNext && !$isPrev) {
                    $message = "{$tracking} is now \"{$status}\" and ready for your office.";
                } else {
                    $message = "{$tracking} moved to \"{$status}\".";
                }

                $notifications[] = [
                    'id' => (int) $row['id'],
                    'tracking_number' => $tracking,
                    'title' => $row['title'],
                    'status' => $status,
                    'message' => $message,
                    'can_view' => isRequestVisibleToRole($row['current_status'], $role),
                    'kind' => $isNext && !$isPrev ? 'incoming' : 'update',
                    'created_at' => $row['created_at'],
                ];

                if ($role !== 'procurement' && count($notifications) >= 20) {
                    break;
                }
            }

            jsonResponse(['success' => true, 'notifications' => $notifications]);
            break;

        case 'status_options':
            $options = match ($role) {
                'budget' => ['Under Budget Review', 'Reviewed'],
                'procurement' => ['Canvass', 'PO'],
                'pso' => ['Delivered', 'For Inspection', 'Accepted'],
                'accounting' => ['DV Processing', 'For Payment'],
                'cashier' => ['Paid', 'Completed'],
                default => [],
            };
            jsonResponse(['success' => true, 'options' => $options, 'role' => $role]);
            break;

        default:
            jsonResponse(['success' => false, 'message' => 'Unknown action.'], 400);
    }
} catch (PDOException $e) {
    jsonResponse(['success' => false, 'message' => 'Database error. Ensure importdb.sql was imported.'], 500);
}
