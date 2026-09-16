<?php
/**
 * User account management — Procurement Office only
 */
require_once __DIR__ . '/db.php';
requireRole(['procurement']);

$pdo = getConnection();
$method = $_SERVER['REQUEST_METHOD'];

function validateUsername(string $username): ?string
{
    if (!preg_match('/^[a-zA-Z0-9_]{3,50}$/', $username)) {
        return 'Username must be 3–50 characters (letters, numbers, underscore only).';
    }
    return null;
}

function validatePassword(?string $password, bool $required = false): ?string
{
    if ($password === null || $password === '') {
        return $required ? 'Password is required.' : null;
    }
    if (strlen($password) < 6) {
        return 'Password must be at least 6 characters.';
    }
    return null;
}

try {
    if ($method === 'GET') {
        $stmt = $pdo->query(
            'SELECT id, username, office, created_by, created_at
             FROM users ORDER BY username ASC'
        );
        $users = $stmt->fetchAll();
        foreach ($users as &$user) {
            $user['office_label'] = roleLabel($user['office']);
        }
        unset($user);

        jsonResponse(['success' => true, 'users' => $users]);
    }

    if ($method !== 'POST') {
        jsonResponse(['success' => false, 'message' => 'Method not allowed.'], 405);
    }

    $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $action = trim($input['action'] ?? 'create');
    $currentUserId = (int) ($_SESSION['user_id'] ?? 0);
    $actor = $_SESSION['username'] ?? roleLabel('procurement');

    if ($action === 'create') {
        $username = trim($input['username'] ?? '');
        $password = $input['password'] ?? '';
        $office = trim($input['office'] ?? '');

        if ($username === '' || $password === '' || $office === '') {
            jsonResponse(['success' => false, 'message' => 'Username, password, and office are required.'], 400);
        }

        if ($err = validateUsername($username)) {
            jsonResponse(['success' => false, 'message' => $err], 400);
        }
        if ($err = validatePassword($password, true)) {
            jsonResponse(['success' => false, 'message' => $err], 400);
        }
        if (!isValidOffice($office)) {
            jsonResponse(['success' => false, 'message' => 'Invalid office selected.'], 400);
        }

        $check = $pdo->prepare('SELECT id FROM users WHERE username = ? LIMIT 1');
        $check->execute([$username]);
        if ($check->fetch()) {
            jsonResponse(['success' => false, 'message' => 'Username is already taken.'], 409);
        }

        $hash = password_hash($password, PASSWORD_DEFAULT);
        $insert = $pdo->prepare(
            'INSERT INTO users (username, password_hash, office, created_by) VALUES (?, ?, ?, ?)'
        );
        $insert->execute([$username, $hash, $office, $actor]);

        jsonResponse([
            'success' => true,
            'message' => 'Account created for ' . roleLabel($office) . '.',
            'user' => [
                'id' => (int) $pdo->lastInsertId(),
                'username' => $username,
                'office' => $office,
                'office_label' => roleLabel($office),
            ],
        ]);
    }

    if ($action === 'update') {
        $id = (int) ($input['id'] ?? 0);
        $username = trim($input['username'] ?? '');
        $office = trim($input['office'] ?? '');
        $password = $input['password'] ?? '';

        if ($id <= 0 || $username === '' || $office === '') {
            jsonResponse(['success' => false, 'message' => 'User ID, username, and office are required.'], 400);
        }

        if ($err = validateUsername($username)) {
            jsonResponse(['success' => false, 'message' => $err], 400);
        }
        if ($password !== '' && ($err = validatePassword($password))) {
            jsonResponse(['success' => false, 'message' => $err], 400);
        }
        if (!isValidOffice($office)) {
            jsonResponse(['success' => false, 'message' => 'Invalid office selected.'], 400);
        }

        $existing = $pdo->prepare('SELECT id, username FROM users WHERE id = ? LIMIT 1');
        $existing->execute([$id]);
        $user = $existing->fetch();
        if (!$user) {
            jsonResponse(['success' => false, 'message' => 'Account not found.'], 404);
        }

        $dup = $pdo->prepare('SELECT id FROM users WHERE username = ? AND id != ? LIMIT 1');
        $dup->execute([$username, $id]);
        if ($dup->fetch()) {
            jsonResponse(['success' => false, 'message' => 'Username is already taken.'], 409);
        }

        if ($password !== '') {
            $hash = password_hash($password, PASSWORD_DEFAULT);
            $update = $pdo->prepare(
                'UPDATE users SET username = ?, office = ?, password_hash = ? WHERE id = ?'
            );
            $update->execute([$username, $office, $hash, $id]);
        } else {
            $update = $pdo->prepare('UPDATE users SET username = ?, office = ? WHERE id = ?');
            $update->execute([$username, $office, $id]);
        }

        jsonResponse([
            'success' => true,
            'message' => 'Account updated successfully.',
            'user' => [
                'id' => $id,
                'username' => $username,
                'office' => $office,
                'office_label' => roleLabel($office),
            ],
        ]);
    }

    if ($action === 'delete') {
        $id = (int) ($input['id'] ?? 0);
        if ($id <= 0) {
            jsonResponse(['success' => false, 'message' => 'User ID is required.'], 400);
        }
        if ($id === $currentUserId) {
            jsonResponse(['success' => false, 'message' => 'You cannot delete your own account while logged in.'], 400);
        }

        $existing = $pdo->prepare('SELECT username FROM users WHERE id = ? LIMIT 1');
        $existing->execute([$id]);
        $user = $existing->fetch();
        if (!$user) {
            jsonResponse(['success' => false, 'message' => 'Account not found.'], 404);
        }

        $delete = $pdo->prepare('DELETE FROM users WHERE id = ?');
        $delete->execute([$id]);

        jsonResponse([
            'success' => true,
            'message' => 'Account "' . $user['username'] . '" deleted.',
        ]);
    }

    jsonResponse(['success' => false, 'message' => 'Unknown action.'], 400);
} catch (PDOException $e) {
    jsonResponse(['success' => false, 'message' => 'Database error. Ensure the users table exists.'], 500);
}
