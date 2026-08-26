<?php
/**
 * Create user account — Procurement Office only (legacy endpoint)
 */
require_once __DIR__ . '/db.php';
requireRole(['procurement']);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'message' => 'POST required.'], 405);
}

$input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
$username = trim($input['username'] ?? '');
$password = $input['password'] ?? '';
$office = trim($input['office'] ?? '');

if ($username === '' || $password === '' || $office === '') {
    jsonResponse(['success' => false, 'message' => 'Username, password, and office are required.'], 400);
}

if (!preg_match('/^[a-zA-Z0-9_]{3,50}$/', $username)) {
    jsonResponse([
        'success' => false,
        'message' => 'Username must be 3–50 characters (letters, numbers, underscore only).',
    ], 400);
}

if (strlen($password) < 6) {
    jsonResponse(['success' => false, 'message' => 'Password must be at least 6 characters.'], 400);
}

if (!isValidOffice($office)) {
    jsonResponse(['success' => false, 'message' => 'Invalid office selected.'], 400);
}

try {
    $pdo = getConnection();

    $check = $pdo->prepare('SELECT id FROM users WHERE username = ? LIMIT 1');
    $check->execute([$username]);
    if ($check->fetch()) {
        jsonResponse(['success' => false, 'message' => 'Username is already taken.'], 409);
    }

    $hash = password_hash($password, PASSWORD_DEFAULT);
    $insert = $pdo->prepare(
        'INSERT INTO users (username, password_hash, office, created_by) VALUES (?, ?, ?, ?)'
    );
    $insert->execute([
        $username,
        $hash,
        $office,
        $_SESSION['username'] ?? roleLabel('procurement'),
    ]);

    jsonResponse([
        'success' => true,
        'message' => 'Account created for ' . roleLabel($office) . '.',
        'username' => $username,
        'office' => $office,
        'office_label' => roleLabel($office),
    ]);
} catch (PDOException $e) {
    jsonResponse(['success' => false, 'message' => 'Database error. Ensure the users table exists.'], 500);
}
