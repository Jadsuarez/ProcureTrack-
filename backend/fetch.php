<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/workflow.php';
session_start();

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
                'accounting' => ['Accepted', 'DV Processing', 'For Payment'],
                'cashier' => ['For Payment', 'Paid', 'Completed'],
                'budget' => ['Registered', 'Under Budget Review', 'Reviewed'],
                'procurement' => ['Reviewed', 'Canvass', 'Abstract of Canvass', 'PO', 'For Bidding', 'Bidding Award'],
                'pso' => ['Bidding Award', 'Delivered', 'For Inspection', 'Accepted'],
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
                'SELECT * FROM requests WHERE tracking_number LIKE ? ORDER BY tracking_number'
            );
            $stmt->execute(['%' . $tracking . '%']);
            $requests = filterRequestsForRole($stmt->fetchAll(), $role);
            jsonResponse(['success' => true, 'requests' => $requests]);
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

            jsonResponse([
                'success' => true,
                'request' => $request,
                'timeline' => $timeline,
                'documents' => $documents,
            ]);
            break;

        case 'status_options':
            $options = match ($role) {
                'budget' => ['Under Budget Review', 'Reviewed'],
                'procurement' => ['Canvass', 'Abstract of Canvass', 'PO', 'For Bidding', 'Bidding Award'],
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
