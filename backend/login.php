<?php
/**
 * Role-based login (session only — monitoring demo)
 */
session_start();
header('Content-Type: application/json; charset=utf-8');

$allowed = ['requesting', 'budget', 'procurement', 'accounting', 'cashier'];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $role = trim($input['role'] ?? '');

    if (!in_array($role, $allowed, true)) {
        echo json_encode(['success' => false, 'message' => 'Invalid role selected.']);
        exit;
    }

    $_SESSION['role'] = $role;
    $_SESSION['role_label'] = match ($role) {
        'requesting' => 'Requesting Office',
        'budget' => 'Budget Office',
        'procurement' => 'Procurement Office',
        'accounting' => 'Accounting Office',
        'cashier' => 'Cashier',
        default => $role,
    };

    echo json_encode([
        'success' => true,
        'role' => $role,
        'role_label' => $_SESSION['role_label'],
    ]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['action']) && $_GET['action'] === 'session') {
    echo json_encode([
        'success' => true,
        'logged_in' => !empty($_SESSION['role']),
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
