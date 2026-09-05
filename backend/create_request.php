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
$title = trim($input['title'] ?? '');
$description = trim($input['description'] ?? '');
$amount = $input['request_amount'] ?? '';
if (!is_scalar($amount) || !preg_match('/^\d{1,13}(\.\d{1,2})?$/', (string) $amount)
    || (float) $amount <= 0 || (float) $amount > 999999999999.99) {
    jsonResponse(['success' => false, 'message' => 'Enter a positive request amount with at most two decimal places.'], 400);
}
$fundingOffice = currentRole();

try {
    $pdo->beginTransaction();
    // Lock the office balance so concurrent requests cannot spend the same funds.
    $fund = $pdo->prepare('SELECT fund_allocation FROM offices WHERE slug = ? FOR UPDATE');
    $fund->execute([$fundingOffice]);
    if (!$fund->fetch()) {
        $pdo->rollBack();
        jsonResponse(['success' => false, 'message' => 'Funding office not found.'], 400);
    }
    // All creators use the requesting office lock above; assign only after acquiring it.
    $tracking = suggestNextTracking($pdo);

    $deduct = $pdo->prepare('UPDATE offices SET fund_allocation = fund_allocation - ? WHERE slug = ? AND fund_allocation >= ?');
    $deduct->execute([$amount, $fundingOffice, $amount]);
    if ($deduct->rowCount() !== 1) {
        $pdo->rollBack();
        jsonResponse(['success' => false, 'message' => 'Insufficient available funds for this request.'], 400);
    }

    $updatedBy = roleLabel('requesting');
    $insert = $pdo->prepare(
        'INSERT INTO requests (tracking_number, title, description, status, updated_by, request_amount, funding_office)
         VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    $insert->execute([
        $tracking,
        $title !== '' ? $title : null,
        $description !== '' ? $description : null,
        'Registered',
        $updatedBy,
        $amount,
        $fundingOffice,
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

    $fund->execute([$fundingOffice]);
    $remaining = $fund->fetchColumn();
    $pdo->commit();

    jsonResponse([
        'success' => true,
        'message' => 'Request created and amount deducted from available funds.',
        'request' => [
            'id' => $requestId,
            'tracking_number' => $tracking,
            'title' => $title,
            'status' => 'Registered',
            'request_amount' => $amount,
            'remaining_funds' => $remaining,
        ],
    ]);
} catch (PDOException $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    jsonResponse(['success' => false, 'message' => 'Database error.'], 500);
}
