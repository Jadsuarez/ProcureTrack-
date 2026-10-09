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
$includeAcademicSignatory = $input['include_academic_signatory'] ?? false;
if (!is_bool($includeAcademicSignatory)) {
    jsonResponse(['success' => false, 'message' => 'Choose whether to include the optional Academic Affairs signatory.'], 400);
}
$additionalSignatories = $input['signatories'] ?? [];
$validSignatoryOffices = ['requesting', 'budget', 'accounting', 'procurement', 'pso', 'cashier'];
if (!is_array($additionalSignatories)) {
    jsonResponse(['success' => false, 'message' => 'Invalid additional signatory data.'], 400);
}
foreach ($additionalSignatories as $signatory) {
    if (!is_array($signatory)
        || !is_string($signatory['signatory_name'] ?? null)
        || !is_string($signatory['designation'] ?? '')
        || !is_string($signatory['document_location'] ?? '')
        || !is_string($signatory['assigned_office'] ?? null)) {
        jsonResponse(['success' => false, 'message' => 'Invalid signatory data.'], 400);
    }
    $name = trim($signatory['signatory_name']);
    $designation = trim($signatory['designation'] ?? '');
    $documentLocation = trim($signatory['document_location'] ?? '');
    $assignedOffice = trim($signatory['assigned_office']);
    if ($name === '' || strlen($name) > 150 || strlen($designation) > 150
        || strlen($documentLocation) > 255 || !in_array($assignedOffice, $validSignatoryOffices, true)) {
        jsonResponse(['success' => false, 'message' => 'Each additional signatory needs a name and valid assigned office.'], 400);
    }
}

try {
    $pdo->beginTransaction();
    // Lock the central Budget Office balance so concurrent requests cannot overspend it.
    $fund = $pdo->prepare('SELECT fund_allocation FROM offices WHERE slug = "budget" FOR UPDATE');
    $fund->execute();
    if (!$fund->fetch()) {
        $pdo->rollBack();
        jsonResponse(['success' => false, 'message' => 'Funding office not found.'], 400);
    }
    $templateQuery = $pdo->prepare(
        'SELECT template_key, signatory_name, designation, department, approval_order, is_required
         FROM signatory_templates
         WHERE is_required = 1 OR (? = 1 AND template_key = "vice_chancellor_academic_affairs_2")
         ORDER BY approval_order'
    );
    $templateQuery->execute([$includeAcademicSignatory ? 1 : 0]);
    $signatories = $templateQuery->fetchAll();
    $requiredCount = count(array_filter($signatories, fn($signatory) => (int) $signatory['is_required'] === 1));
    if ($requiredCount !== 4 || count($signatories) !== ($includeAcademicSignatory ? 5 : 4)) {
        $pdo->rollBack();
        jsonResponse(['success' => false, 'message' => 'The required signatory settings are incomplete. Contact the system administrator.'], 500);
    }
    foreach ($signatories as $signatory) {
        if (trim($signatory['signatory_name']) === '') {
            $pdo->rollBack();
            jsonResponse(['success' => false, 'message' => 'A signatory name is missing from Office Settings.'], 500);
        }
    }
    $tracking = suggestNextTracking($pdo);

    $deduct = $pdo->prepare('UPDATE offices SET fund_allocation = fund_allocation - ? WHERE slug = "budget" AND fund_allocation >= ?');
    $deduct->execute([$amount, $amount]);
    if ($deduct->rowCount() !== 1) {
        $pdo->rollBack();
        jsonResponse(['success' => false, 'message' => 'Insufficient available funds for this request.'], 400);
    }

    $updatedBy = currentActorLabel();
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

    $signatoryInsert = $pdo->prepare(
        'INSERT INTO request_signatories
         (request_id, template_key, signatory_name, designation, department, assigned_office, approval_order, status, updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, "Pending Signature", ?)'
    );
    $signatoryLog = $pdo->prepare(
        'INSERT INTO request_signatory_logs
         (request_id, signatory_id, assigned_office, action, status, updated_by)
         VALUES (?, ?, ?, "Added", "Pending Signature", ?)'
    );
    $officeOrders = [];
    foreach ($signatories as $signatory) {
        $assignedOffice = 'requesting';
        $signatoryInsert->execute([
            $requestId,
            $signatory['template_key'],
            $signatory['signatory_name'],
            $signatory['designation'],
            $signatory['department'],
            $assignedOffice,
            (int) $signatory['approval_order'],
            $updatedBy,
        ]);
        $officeOrders[$assignedOffice] = max(
            $officeOrders[$assignedOffice] ?? 0,
            (int) $signatory['approval_order']
        );
        $signatoryLog->execute([$requestId, (int) $pdo->lastInsertId(), $assignedOffice, $updatedBy]);
    }
    foreach ($additionalSignatories as $signatory) {
        $assignedOffice = trim($signatory['assigned_office']);
        $officeOrders[$assignedOffice] = ($officeOrders[$assignedOffice] ?? 0) + 1;
        $signatoryInsert->execute([
            $requestId,
            null,
            trim($signatory['signatory_name']),
            trim($signatory['designation'] ?? '') ?: null,
            null,
            $assignedOffice,
            $officeOrders[$assignedOffice],
            $updatedBy,
        ]);
        $signatoryLog->execute([$requestId, (int) $pdo->lastInsertId(), $assignedOffice, $updatedBy]);
    }

    $fund->execute();
    $remaining = $fund->fetchColumn();
    $pdo->commit();

    jsonResponse([
        'success' => true,
        'message' => 'Request created and amount deducted from the Budget Office allocation.',
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
