<?php
/**
 * Per-office fund allocations — any logged-in user can view; Budget Office can update
 */
require_once __DIR__ . '/db.php';
session_start();

if (empty($_SESSION['role'])) {
    jsonResponse(['success' => false, 'message' => 'Unauthorized.'], 401);
}

$pdo = getConnection();
$method = $_SERVER['REQUEST_METHOD'];
$canEdit = ($_SESSION['role'] ?? '') === 'budget';

function fetchAllocationRows(PDO $pdo): array
{
    $stmt = $pdo->query(
        'SELECT o.id, o.slug, o.label, o.is_system, o.fund_allocation, o.created_at,
                COUNT(u.id) AS user_count
         FROM offices o
         LEFT JOIN users u ON u.office = o.slug
         GROUP BY o.id
         ORDER BY o.label ASC'
    );
    $offices = $stmt->fetchAll();
    $total = 0.0;
    foreach ($offices as $row) {
        $total += (float) $row['fund_allocation'];
    }

    $withFunds = 0;
    foreach ($offices as &$row) {
        $amount = (float) $row['fund_allocation'];
        if ($amount > 0) {
            $withFunds++;
        }
        $row['id'] = (int) $row['id'];
        $row['is_system'] = (int) $row['is_system'];
        $row['user_count'] = (int) $row['user_count'];
        $row['fund_allocation'] = $amount;
        $row['share_pct'] = $total > 0 ? round(($amount / $total) * 100, 1) : 0;
    }
    unset($row);

    return [
        'offices' => $offices,
        'total_allocated' => round($total, 2),
        'offices_with_funds' => $withFunds,
        'office_count' => count($offices),
    ];
}

try {
    if ($method === 'GET') {
        $data = fetchAllocationRows($pdo);
        jsonResponse([
            'success' => true,
            'can_edit' => $canEdit,
            'total_allocated' => $data['total_allocated'],
            'offices_with_funds' => $data['offices_with_funds'],
            'office_count' => $data['office_count'],
            'offices' => $data['offices'],
        ]);
    }

    if ($method !== 'POST') {
        jsonResponse(['success' => false, 'message' => 'Method not allowed.'], 405);
    }

    if (!$canEdit) {
        jsonResponse(['success' => false, 'message' => 'Only Budget Office can update fund allocations.'], 403);
    }

    $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $id = (int) ($input['id'] ?? 0);
    if ($id <= 0) {
        jsonResponse(['success' => false, 'message' => 'Office ID is required.'], 400);
    }

    $allocation = parseFundAllocation($input['fund_allocation'] ?? null);

    $existing = $pdo->prepare('SELECT id, slug, label FROM offices WHERE id = ? LIMIT 1');
    $existing->execute([$id]);
    $office = $existing->fetch();
    if (!$office) {
        jsonResponse(['success' => false, 'message' => 'Office not found.'], 404);
    }

    $update = $pdo->prepare('UPDATE offices SET fund_allocation = ? WHERE id = ?');
    $update->execute([$allocation, $id]);
    refreshOfficeCache();

    $data = fetchAllocationRows($pdo);
    jsonResponse([
        'success' => true,
        'message' => 'Fund allocation updated for ' . $office['label'] . '.',
        'can_edit' => true,
        'total_allocated' => $data['total_allocated'],
        'offices_with_funds' => $data['offices_with_funds'],
        'office_count' => $data['office_count'],
        'offices' => $data['offices'],
    ]);
} catch (PDOException $e) {
    jsonResponse(['success' => false, 'message' => 'Database error. Ensure the offices table exists.'], 500);
}
