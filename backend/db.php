<?php
/**
 * Database connection for Procurement Monitoring System (XAMPP)
 */
define('DB_HOST', 'localhost');
define('DB_NAME', 'procurement_monitoring');
define('DB_USER', 'root');
define('DB_PASS', '');

function getConnection(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4';
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    }
    return $pdo;
}

function jsonResponse(array $data, int $code = 200): void
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data);
    exit;
}

function requireRole(array $allowed): void
{
    session_start();
    if (empty($_SESSION['role']) || !in_array($_SESSION['role'], $allowed, true)) {
        jsonResponse(['success' => false, 'message' => 'Unauthorized. Please log in.'], 401);
    }
}

function currentRole(): string
{
    return $_SESSION['role'] ?? '';
}

function roleLabel(string $role): string
{
    $labels = [
        'requesting' => 'Requesting Office',
        'budget' => 'Budget Office',
        'procurement' => 'Procurement Office',
        'accounting' => 'Accounting Office',
        'cashier' => 'Cashier',
    ];
    return $labels[$role] ?? $role;
}
