<?php
/**
 * Document upload and track lookup (Requesting Office)
 */
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/workflow.php';
session_start();

if (empty($_SESSION['role'])) {
    jsonResponse(['success' => false, 'message' => 'Unauthorized.'], 401);
}

$uploadDir = dirname(__DIR__) . '/uploads/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

// JSON track lookup (verify tracking exists)
if ($_SERVER['REQUEST_METHOD'] === 'GET' && ($_GET['action'] ?? '') === 'lookup') {
    $tracking = trim($_GET['tracking'] ?? '');
    if ($tracking === '') {
        jsonResponse(['success' => false, 'message' => 'Enter tracking number.'], 400);
    }
    try {
        $pdo = getConnection();
        $stmt = $pdo->prepare('SELECT id, tracking_number, title, status FROM requests WHERE UPPER(tracking_number) = UPPER(?)');
        $stmt->execute([$tracking]);
        $row = $stmt->fetch();
        if (!$row) {
            jsonResponse(['success' => false, 'message' => 'Tracking number not found.'], 404);
        }
        if (!isRequestVisibleToRole($row['status'], $_SESSION['role'])) {
            jsonResponse(['success' => false, 'message' => requestVisibilityMessage($_SESSION['role'])], 403);
        }
        jsonResponse(['success' => true, 'request' => $row]);
    } catch (PDOException $e) {
        jsonResponse(['success' => false, 'message' => 'Database error.'], 500);
    }
}

// File upload
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $tracking = trim($_POST['tracking_number'] ?? '');
    if ($tracking === '') {
        jsonResponse(['success' => false, 'message' => 'Tracking number required.'], 400);
    }

    if (empty($_FILES['document']) || $_FILES['document']['error'] !== UPLOAD_ERR_OK) {
        jsonResponse(['success' => false, 'message' => 'Please select a file to upload.'], 400);
    }

    $file = $_FILES['document'];
    $allowed = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png'];
    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

    if (!in_array($ext, $allowed, true)) {
        jsonResponse(['success' => false, 'message' => 'File type not allowed. Use PDF, Office docs, or images.'], 400);
    }

    if ($file['size'] > 10 * 1024 * 1024) {
        jsonResponse(['success' => false, 'message' => 'File too large (max 10MB).'], 400);
    }

    try {
        $pdo = getConnection();
        $stmt = $pdo->prepare('SELECT id, tracking_number, status FROM requests WHERE UPPER(tracking_number) = UPPER(?)');
        $stmt->execute([$tracking]);
        $row = $stmt->fetch();
        if (!$row) {
            jsonResponse(['success' => false, 'message' => 'Tracking number not found.'], 404);
        }
        if (!isRequestVisibleToRole($row['status'], $_SESSION['role'])) {
            jsonResponse(['success' => false, 'message' => requestVisibilityMessage($_SESSION['role'])], 403);
        }

        $requestId = (int) $row['id'];
        $tracking = $row['tracking_number'];
        $safeName = preg_replace('/[^a-zA-Z0-9._-]/', '_', basename($file['name']));
        $storedName = $tracking . '_' . time() . '_' . $safeName;
        $targetPath = $uploadDir . $storedName;
        $relativePath = 'uploads/' . $storedName;

        if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
            jsonResponse(['success' => false, 'message' => 'Failed to save file.'], 500);
        }

        $uploadedBy = roleLabel($_SESSION['role']);
        $doc = $pdo->prepare(
            'INSERT INTO documents (request_id, file_name, file_path, uploaded_by) VALUES (?, ?, ?, ?)'
        );
        $doc->execute([$requestId, $file['name'], $relativePath, $uploadedBy]);

        // Keep latest path on requests table for backward compatibility
        $pdo->prepare('UPDATE requests SET file_path = ? WHERE id = ?')->execute([$relativePath, $requestId]);

        jsonResponse(['success' => true, 'message' => 'Document uploaded successfully.', 'file_path' => $relativePath]);
    } catch (PDOException $e) {
        jsonResponse(['success' => false, 'message' => 'Database error.'], 500);
    }
}

jsonResponse(['success' => false, 'message' => 'Invalid request.'], 400);
