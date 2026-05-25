<?php
/**
 * Create a new tracking record (Requesting Office only)
 */
require_once __DIR__ . '/db.php';
requireRole(['requesting']);

$pdo = getConnection();

function suggestNextTracking(PDO $pdo): string
{
    $stmt = $pdo->query(
        "SELECT tracking_number FROM requests
         WHERE tracking_number REGEXP '^PR-[0-9]+$'
         ORDER BY CAST(SUBSTRING(tracking_number, 4) AS UNSIGNED) DESC
         LIMIT 1"
    );
    $row = $stmt->fetch();
    if (!$row) {
        return 'PR-0001';
    }
    $num = (int) substr($row['tracking_number'], 3) + 1;
    return 'PR-' . str_pad((string) $num, 4, '0', STR_PAD_LEFT);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET' && ($_GET['action'] ?? '') === 'next_id') {
    jsonResponse(['success' => true, 'tracking_number' => suggestNextTracking($pdo)]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'message' => 'POST required.'], 405);
}

$input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
$tracking = strtoupper(trim($input['tracking_number'] ?? ''));
$title = trim($input['title'] ?? '');
$description = trim($input['description'] ?? '');

if ($tracking === '') {
    $tracking = suggestNextTracking($pdo);
}

if (!preg_match('/^[A-Z0-9][A-Z0-9-]{2,49}$/', $tracking)) {
    jsonResponse(['success' => false, 'message' => 'Invalid tracking number format (e.g. PR-0006).'], 400);
}

try {
    $check = $pdo->prepare('SELECT id FROM requests WHERE UPPER(tracking_number) = UPPER(?)');
    $check->execute([$tracking]);
    if ($check->fetch()) {
        jsonResponse(['success' => false, 'message' => 'Tracking number already exists.'], 409);
    }

    $updatedBy = roleLabel('requesting');
    $insert = $pdo->prepare(
        'INSERT INTO requests (tracking_number, title, description, status, updated_by)
         VALUES (?, ?, ?, ?, ?)'
    );
    $insert->execute([
        $tracking,
        $title !== '' ? $title : null,
        $description !== '' ? $description : null,
        'Registered',
        $updatedBy,
    ]);

    $requestId = (int) $pdo->lastInsertId();

    $log = $pdo->prepare(
        'INSERT INTO status_logs (request_id, status, notes, updated_by) VALUES (?, ?, ?, ?)'
    );
    $log->execute([
        $requestId,
        'Registered',
        'New tracking record created by Requesting Office',
        $updatedBy,
    ]);

    jsonResponse([
        'success' => true,
        'message' => 'New track request created.',
        'request' => [
            'id' => $requestId,
            'tracking_number' => $tracking,
            'title' => $title,
            'status' => 'Registered',
        ],
    ]);
} catch (PDOException $e) {
    jsonResponse(['success' => false, 'message' => 'Database error.'], 500);
}
