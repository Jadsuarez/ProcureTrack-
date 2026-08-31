<?php
/**
 * User login — username/password against users table
 */
require_once __DIR__ . '/db.php';
session_start();
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $username = trim($input['username'] ?? '');
    $password = $input['password'] ?? '';

    if ($username === '' || $password === '') {
        echo json_encode(['success' => false, 'message' => 'Username and password are required.']);
        exit;
    }

    try {
        $pdo = getConnection();
        $stmt = $pdo->prepare(
            'SELECT id, username, password_hash, office FROM users WHERE username = ? LIMIT 1'
        );
        $stmt->execute([$username]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['password_hash'])) {
            echo json_encode(['success' => false, 'message' => 'Invalid username or password.']);
            exit;
        }

        if (!isValidOffice($user['office'])) {
            echo json_encode(['success' => false, 'message' => 'Account office assignment is invalid.']);
            exit;
        }

        $_SESSION['user_id'] = (int) $user['id'];
        $_SESSION['username'] = $user['username'];
        $_SESSION['role'] = $user['office'];
        $_SESSION['role_label'] = roleLabel($user['office']);

        echo json_encode([
            'success' => true,
            'username' => $user['username'],
            'role' => $user['office'],
            'role_label' => $_SESSION['role_label'],
        ]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Database error. Ensure importdb.sql was imported.']);
    }
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['action']) && $_GET['action'] === 'session') {
    echo json_encode([
        'success' => true,
        'logged_in' => !empty($_SESSION['role']),
        'user_id' => $_SESSION['user_id'] ?? null,
        'username' => $_SESSION['username'] ?? null,
        'role' => $_SESSION['role'] ?? null,
        'role_label' => $_SESSION['role_label'] ?? null,
    ]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['action']) && $_GET['action'] === 'logout') {
    session_destroy();
    echo json_encode(['success' => true]);
    exit;
}

echo json_encode(['success' => false, 'message' => 'Invalid request.']);
