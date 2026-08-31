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
        ensureOfficeFundAllocationColumn($pdo);
    }
    return $pdo;
}

function ensureOfficeFundAllocationColumn(PDO $pdo): void
{
    static $checked = false;
    if ($checked) {
        return;
    }
    $checked = true;

    try {
        $pdo->query('SELECT fund_allocation FROM offices LIMIT 1');
    } catch (PDOException $e) {
        try {
            $pdo->exec(
                'ALTER TABLE offices ADD COLUMN fund_allocation DECIMAL(15, 2) NOT NULL DEFAULT 0'
            );
        } catch (PDOException $ignored) {
            // offices table may not exist yet
        }
    }
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

function defaultOfficeRows(): array
{
    return [
        ['id' => 0, 'slug' => 'requesting', 'label' => 'Requesting Office', 'is_system' => 1],
        ['id' => 0, 'slug' => 'budget', 'label' => 'Budget Office', 'is_system' => 1],
        ['id' => 0, 'slug' => 'procurement', 'label' => 'Procurement Office', 'is_system' => 1],
        ['id' => 0, 'slug' => 'accounting', 'label' => 'Accounting Office', 'is_system' => 1],
        ['id' => 0, 'slug' => 'cashier', 'label' => 'Cashier', 'is_system' => 1],
    ];
}

function getOfficeRows(bool $forceReload = false): array
{
    static $rows = null;
    if ($forceReload) {
        $rows = null;
    }
    if ($rows !== null) {
        return $rows;
    }

    try {
        $pdo = getConnection();
        $stmt = $pdo->query(
            'SELECT id, slug, label, is_system FROM offices ORDER BY label ASC'
        );
        $fetched = $stmt->fetchAll();
        if ($fetched) {
            $rows = $fetched;
            return $rows;
        }
    } catch (PDOException $e) {
        // offices table may not exist yet
    }

    $rows = defaultOfficeRows();
    return $rows;
}

function refreshOfficeCache(): void
{
    getOfficeRows(true);
}

function allowedOffices(): array
{
    return array_column(getOfficeRows(), 'slug');
}

function roleLabel(string $role): string
{
    foreach (getOfficeRows() as $row) {
        if ($row['slug'] === $role) {
            return $row['label'];
        }
    }
    return $role;
}

function isValidOffice(string $office): bool
{
    return in_array($office, allowedOffices(), true);
}

function parseFundAllocation(mixed $value): float
{
    if ($value === null || $value === '') {
        return 0.0;
    }
    if (!is_numeric($value)) {
        jsonResponse(['success' => false, 'message' => 'Fund allocation must be a number.'], 400);
    }
    $amount = round((float) $value, 2);
    if ($amount < 0) {
        jsonResponse(['success' => false, 'message' => 'Fund allocation cannot be negative.'], 400);
    }
    if ($amount > 999999999999.99) {
        jsonResponse(['success' => false, 'message' => 'Fund allocation is too large.'], 400);
    }
    return $amount;
}
