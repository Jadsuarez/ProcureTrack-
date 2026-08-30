<?php
/**
 * Office registry — Procurement Office manages offices; all roles can list for dropdowns
 */
require_once __DIR__ . '/db.php';
session_start();

if (empty($_SESSION['role'])) {
    jsonResponse(['success' => false, 'message' => 'Unauthorized.'], 401);
}

$pdo = getConnection();
$method = $_SERVER['REQUEST_METHOD'];
$isProcurement = ($_SESSION['role'] ?? '') === 'procurement';

function validateOfficeSlug(string $slug): ?string
{
    if (!preg_match('/^[a-z][a-z0-9_]{2,29}$/', $slug)) {
        return 'Office code must be 3–30 characters: lowercase letters, numbers, underscore; start with a letter.';
    }
    return null;
}

function validateOfficeLabel(string $label): ?string
{
    if (strlen($label) < 2 || strlen($label) > 100) {
        return 'Office name must be 2–100 characters.';
    }
    return null;
}

function fetchOfficesWithCounts(PDO $pdo): array
{
    $stmt = $pdo->query(
        'SELECT o.id, o.slug, o.label, o.is_system, o.fund_allocation, o.created_by, o.created_at,
                COUNT(u.id) AS user_count
         FROM offices o
         LEFT JOIN users u ON u.office = o.slug
         GROUP BY o.id
         ORDER BY o.label ASC'
    );
    return $stmt->fetchAll();
}

try {
    if ($method === 'GET') {
        jsonResponse(['success' => true, 'offices' => fetchOfficesWithCounts($pdo)]);
    }

    if (!$isProcurement) {
        jsonResponse(['success' => false, 'message' => 'Only Procurement Office can manage offices.'], 403);
    }

    if ($method !== 'POST') {
        jsonResponse(['success' => false, 'message' => 'Method not allowed.'], 405);
    }

    $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $action = trim($input['action'] ?? 'create');
    $actor = $_SESSION['username'] ?? roleLabel('procurement');

    if ($action === 'create') {
        $slug = strtolower(trim($input['slug'] ?? ''));
        $label = trim($input['label'] ?? '');

        if ($slug === '' || $label === '') {
            jsonResponse(['success' => false, 'message' => 'Office code and name are required.'], 400);
        }
        if ($err = validateOfficeSlug($slug)) {
            jsonResponse(['success' => false, 'message' => $err], 400);
        }
        if ($err = validateOfficeLabel($label)) {
            jsonResponse(['success' => false, 'message' => $err], 400);
        }

        $check = $pdo->prepare('SELECT id FROM offices WHERE slug = ? LIMIT 1');
        $check->execute([$slug]);
        if ($check->fetch()) {
            jsonResponse(['success' => false, 'message' => 'Office code is already in use.'], 409);
        }

        $allocation = parseFundAllocation($input['fund_allocation'] ?? 0);

        $insert = $pdo->prepare(
            'INSERT INTO offices (slug, label, is_system, created_by, fund_allocation) VALUES (?, ?, 0, ?, ?)'
        );
        $insert->execute([$slug, $label, $actor, $allocation]);
        refreshOfficeCache();

        jsonResponse([
            'success' => true,
            'message' => 'Office "' . $label . '" added.',
            'office' => [
                'id' => (int) $pdo->lastInsertId(),
                'slug' => $slug,
                'label' => $label,
                'is_system' => 0,
                'fund_allocation' => $allocation,
            ],
        ]);
    }

    if ($action === 'update') {
        $id = (int) ($input['id'] ?? 0);
        $label = trim($input['label'] ?? '');

        if ($id <= 0 || $label === '') {
            jsonResponse(['success' => false, 'message' => 'Office ID and name are required.'], 400);
        }
        if ($err = validateOfficeLabel($label)) {
            jsonResponse(['success' => false, 'message' => $err], 400);
        }

        $existing = $pdo->prepare('SELECT id, slug, is_system FROM offices WHERE id = ? LIMIT 1');
        $existing->execute([$id]);
        $office = $existing->fetch();
        if (!$office) {
            jsonResponse(['success' => false, 'message' => 'Office not found.'], 404);
        }

        if (array_key_exists('fund_allocation', $input)) {
            $allocation = parseFundAllocation($input['fund_allocation']);
            $update = $pdo->prepare('UPDATE offices SET label = ?, fund_allocation = ? WHERE id = ?');
            $update->execute([$label, $allocation, $id]);
        } else {
            $current = $pdo->prepare('SELECT fund_allocation FROM offices WHERE id = ?');
            $current->execute([$id]);
            $allocation = (float) ($current->fetchColumn() ?: 0);
            $update = $pdo->prepare('UPDATE offices SET label = ? WHERE id = ?');
            $update->execute([$label, $id]);
        }
        refreshOfficeCache();

        jsonResponse([
            'success' => true,
            'message' => 'Office updated successfully.',
            'office' => [
                'id' => $id,
                'slug' => $office['slug'],
                'label' => $label,
                'is_system' => (int) $office['is_system'],
                'fund_allocation' => $allocation,
            ],
        ]);
    }

    if ($action === 'delete') {
        $id = (int) ($input['id'] ?? 0);
        if ($id <= 0) {
            jsonResponse(['success' => false, 'message' => 'Office ID is required.'], 400);
        }

        $existing = $pdo->prepare('SELECT id, slug, label, is_system FROM offices WHERE id = ? LIMIT 1');
        $existing->execute([$id]);
        $office = $existing->fetch();
        if (!$office) {
            jsonResponse(['success' => false, 'message' => 'Office not found.'], 404);
        }
        if ((int) $office['is_system'] === 1) {
            jsonResponse(['success' => false, 'message' => 'Built-in offices cannot be deleted.'], 400);
        }

        $users = $pdo->prepare('SELECT COUNT(*) FROM users WHERE office = ?');
        $users->execute([$office['slug']]);
        if ((int) $users->fetchColumn() > 0) {
            jsonResponse(['success' => false, 'message' => 'Remove or reassign users before deleting this office.'], 400);
        }

        $delete = $pdo->prepare('DELETE FROM offices WHERE id = ?');
        $delete->execute([$id]);
        refreshOfficeCache();

        jsonResponse([
            'success' => true,
            'message' => 'Office "' . $office['label'] . '" deleted.',
        ]);
    }

    jsonResponse(['success' => false, 'message' => 'Unknown action.'], 400);
} catch (PDOException $e) {
    jsonResponse(['success' => false, 'message' => 'Database error. Ensure the offices table exists.'], 500);
}
