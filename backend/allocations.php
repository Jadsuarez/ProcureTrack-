<?php
/**
 * Per-office fund allocations — any logged-in user can view; Budget Office can update
 */
require_once __DIR__ . '/db.php';
session_start();
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

if (empty($_SESSION['role'])) {
    jsonResponse(['success' => false, 'message' => 'Unauthorized.'], 401);
}

$pdo = getConnection();
$method = $_SERVER['REQUEST_METHOD'];
$canEdit = ($_SESSION['role'] ?? '') === 'budget';

function fetchAllocationRows(PDO $pdo): array
{
    $stmt = $pdo->query(
    'SELECT o.id, o.slug, o.label, o.is_system, o.created_at,
                COUNT(u.id) AS user_count
         FROM offices o
         LEFT JOIN users u ON u.office = o.slug
         GROUP BY o.id
         ORDER BY o.label ASC'
    );
    $offices = $stmt->fetchAll();
    $usageStmt = $pdo->query(
        'SELECT COALESCE(funding_office, "requesting") AS funding_office,
                COALESCE(SUM(request_amount), 0) AS used_amount,
                COUNT(*) AS request_count
         FROM requests
         WHERE COALESCE(funds_restored, 0) = 0
         GROUP BY COALESCE(funding_office, "requesting")'
    );
    $usage = [];
    foreach ($usageStmt as $usageRow) {
        $usage[$usageRow['funding_office']] = [
            'used_amount' => (float) $usageRow['used_amount'],
            'request_count' => (int) $usageRow['request_count'],
        ];
    }

    $budgetStmt = $pdo->query('SELECT fund_allocation FROM offices WHERE slug = "budget" LIMIT 1');
    $budgetAllocation = (float) ($budgetStmt->fetchColumn() ?: 0);
    $totalUsed = array_sum(array_column($usage, 'used_amount'));

    $withFunds = 0;
    foreach ($offices as &$row) {
        $used = $usage[$row['slug']]['used_amount'] ?? 0.0;
        $amount = $budgetAllocation;
        if ($amount >= 0) {
            $withFunds++;
        }
        $row['id'] = (int) $row['id'];
        $row['is_system'] = (int) $row['is_system'];
        $row['user_count'] = (int) $row['user_count'];
        $row['fund_allocation'] = $row['slug'] === 'budget' ? $amount : 0.0;
        $row['budget_allocation'] = $budgetAllocation;
        $row['remaining_funds'] = $amount;
        $row['used_amount'] = $used;
        $row['request_count'] = $usage[$row['slug']]['request_count'] ?? 0;
        $row['share_pct'] = $budgetAllocation > 0 ? round(($used / $budgetAllocation) * 100, 1) : 0;
    }
    unset($row);

    return [
        'offices' => $offices,
        'total_allocated' => round($budgetAllocation, 2),
        'budget_allocation' => round($budgetAllocation, 2),
        'total_used' => round($totalUsed, 2),
        'offices_with_funds' => $withFunds,
        'office_count' => count($offices),
        'office_role' => $_SESSION['role'] ?? '',
    ];
}

try {
    if ($method === 'GET') {
        $data = fetchAllocationRows($pdo);
        if (!$canEdit) {
            $data['offices'] = array_values(array_filter(
                $data['offices'],
                fn($office) => $office['slug'] === ($_SESSION['role'] ?? '')
            ));
            $data['office_count'] = count($data['offices']);
            $data['offices_with_funds'] = count(array_filter(
                $data['offices'],
                fn($office) => (float) $office['remaining_funds'] >= 0
            ));
        }
        jsonResponse([
            'success' => true,
            'can_edit' => $canEdit,
            'total_allocated' => $data['total_allocated'],
            'budget_allocation' => $data['budget_allocation'],
            'total_used' => $data['total_used'],
            'offices_with_funds' => $data['offices_with_funds'],
            'office_count' => $data['office_count'],
            'offices' => $data['offices'],
            'office_role' => $_SESSION['role'],
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

    if ($office['slug'] !== 'budget') {
        jsonResponse(['success' => false, 'message' => 'Only the Budget Office allocation can be updated.'], 400);
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
        'budget_allocation' => $data['budget_allocation'],
        'total_used' => $data['total_used'],
        'offices_with_funds' => $data['offices_with_funds'],
        'office_count' => $data['office_count'],
        'offices' => $data['offices'],
        'office_role' => $_SESSION['role'],
    ]);
} catch (PDOException $e) {
    jsonResponse(['success' => false, 'message' => 'Database error. Ensure the offices table exists.'], 500);
}
