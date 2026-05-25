<?php
require_once __DIR__ . '/db.php';
session_start();

if (empty($_SESSION['role'])) {
    jsonResponse(['success' => false, 'message' => 'Unauthorized.'], 401);
}

$pdo = getConnection();
$action = $_GET['action'] ?? '';

try {
    switch ($action) {
        case 'summary':
            $total = (int) $pdo->query('SELECT COUNT(*) FROM requests')->fetchColumn();
            $byStatus = $pdo->query(
                'SELECT status, COUNT(*) AS count FROM requests GROUP BY status ORDER BY count DESC'
            )->fetchAll();
            $recent = $pdo->query(
                'SELECT tracking_number, title, status, updated_at
                 FROM requests ORDER BY updated_at DESC LIMIT 8'
            )->fetchAll();
            $role = $_SESSION['role'];
            $focusStatuses = match ($role) {
                'accounting' => ['PO', 'DV Processing', 'For Payment'],
                'cashier' => ['For Payment', 'Paid', 'Completed'],
                'budget' => ['Registered', 'Under Budget Review', 'Reviewed'],
                'procurement' => ['Reviewed', 'Canvass', 'Abstract of Canvass', 'PO'],
                default => [],
            };

            jsonResponse([
                'success' => true,
                'total' => $total,
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
            $stmt = $pdo->prepare(
                'SELECT * FROM requests WHERE tracking_number LIKE ? ORDER BY tracking_number'
            );
            $stmt->execute(['%' . $tracking . '%']);
            jsonResponse(['success' => true, 'requests' => $stmt->fetchAll()]);
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
            $role = $_SESSION['role'];
            $options = match ($role) {
                'budget' => ['Under Budget Review', 'Reviewed'],
                'procurement' => ['Canvass', 'Abstract of Canvass', 'PO'],
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
