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
        ensureUserProfileColumns($pdo);
        ensureRequestFundingColumns($pdo);
        ensureSignatoryTables($pdo);
        ensureSignatoryAuditTables($pdo);
        ensureLegacyStatusMigration($pdo);
        ensureExistingFundDeductions($pdo);
    }
    return $pdo;
}

function ensureSignatoryAuditTables(PDO $pdo): void
{
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS request_signatory_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            request_id INT NOT NULL,
            signatory_id INT DEFAULT NULL,
            assigned_office VARCHAR(30) DEFAULT NULL,
            action VARCHAR(30) NOT NULL,
            status VARCHAR(30) DEFAULT NULL,
            notes TEXT DEFAULT NULL,
            updated_by VARCHAR(50) DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE,
            INDEX idx_signatory_logs_request (request_id, created_at, id)
        ) ENGINE=InnoDB'
    );
}

function ensureExistingFundDeductions(PDO $pdo): void
{
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS system_migrations (
            migration_key VARCHAR(100) PRIMARY KEY,
            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB'
    );
    $check = $pdo->prepare('SELECT 1 FROM system_migrations WHERE migration_key = ?');
    $check->execute(['reconcile_request_funds']);
    if ($check->fetchColumn()) {
        return;
    }

    $pdo->beginTransaction();
    try {
        $pdo->exec(
            "UPDATE offices o
             SET fund_allocation = GREATEST(0, fund_allocation - COALESCE((
                 SELECT SUM(r.request_amount)
                 FROM requests r
                 WHERE (r.funding_office = o.slug OR (o.slug = 'requesting' AND r.funding_office IS NULL))
             ), 0))"
        );
        $mark = $pdo->prepare('INSERT INTO system_migrations (migration_key) VALUES (?)');
        $mark->execute(['reconcile_request_funds']);
        $pdo->commit();
    } catch (PDOException $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
}

function ensureLegacyStatusMigration(PDO $pdo): void
{
    static $migrated = false;
    if ($migrated) {
        return;
    }
    $migrated = true;

    $statusMap = [
        'Abstract of Canvass' => 'PO',
        'For Bidding' => 'PO',
        'Bidding Award' => 'Delivered',
    ];
    foreach ($statusMap as $legacy => $replacement) {
        $stmt = $pdo->prepare('UPDATE requests SET status = ? WHERE status = ?');
        $stmt->execute([$replacement, $legacy]);
        $stmt = $pdo->prepare('UPDATE status_logs SET status = ? WHERE status = ?');
        $stmt->execute([$replacement, $legacy]);
    }
}

function ensureSignatoryTables(PDO $pdo): void
{
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS request_signatories (
            id INT AUTO_INCREMENT PRIMARY KEY,
            request_id INT NOT NULL,
            signatory_name VARCHAR(150) NOT NULL,
            designation VARCHAR(150) DEFAULT NULL,
            assigned_office VARCHAR(30) DEFAULT NULL,
            approval_order INT NOT NULL DEFAULT 1,
            status VARCHAR(30) NOT NULL DEFAULT "Pending Signature",
            signed_at TIMESTAMP NULL DEFAULT NULL,
            updated_by VARCHAR(50) DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE,
            INDEX idx_request_signatories_order (request_id, approval_order, id)
        ) ENGINE=InnoDB'
    );
    $columns = $pdo->query('SHOW COLUMNS FROM request_signatories')->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array('document_location', $columns, true)) {
        $pdo->exec('ALTER TABLE request_signatories ADD COLUMN document_location VARCHAR(255) DEFAULT NULL AFTER designation');
    }
    if (!in_array('assigned_office', $columns, true)) {
        $pdo->exec('ALTER TABLE request_signatories ADD COLUMN assigned_office VARCHAR(30) DEFAULT NULL AFTER document_location');
    }
}

function ensureUserProfileColumns(PDO $pdo): void
{
    static $checked = false;
    if ($checked) {
        return;
    }
    $checked = true;

    try {
        $columns = $pdo->query('SHOW COLUMNS FROM users')->fetchAll(PDO::FETCH_COLUMN);
    } catch (PDOException $e) {
        return;
    }

    foreach ([
        'display_name' => 'VARCHAR(100) DEFAULT NULL',
        'email' => 'VARCHAR(150) DEFAULT NULL',
        'preferences' => 'TEXT DEFAULT NULL',
    ] as $name => $definition) {
        if (!in_array($name, $columns, true)) {
            try {
                $pdo->exec("ALTER TABLE users ADD COLUMN $name $definition");
            } catch (PDOException $e) {
                if (($e->errorInfo[1] ?? null) !== 1060) {
                    throw $e;
                }
            }
        }
    }
}

function decodeUserPreferences(mixed $json): array
{
    if (!is_string($json) || trim($json) === '') {
        return [];
    }
    $data = json_decode($json, true);
    return is_array($data) ? $data : [];
}

function currentActorLabel(): string
{
    $name = trim((string) ($_SESSION['display_name'] ?? ''));
    if ($name !== '') {
        return substr($name, 0, 50);
    }
    $username = trim((string) ($_SESSION['username'] ?? ''));
    if ($username !== '') {
        return substr($username, 0, 50);
    }
    return roleLabel(currentRole());
}

function ensureRequestFundingColumns(PDO $pdo): void
{
    $columns = $pdo->query('SHOW COLUMNS FROM requests')->fetchAll(PDO::FETCH_COLUMN);
    foreach ([
        'request_amount' => 'DECIMAL(15, 2) NOT NULL DEFAULT 0',
        'funding_office' => 'VARCHAR(30) DEFAULT NULL',
    ] as $name => $definition) {
        if (!in_array($name, $columns, true)) {
            try {
                $pdo->exec("ALTER TABLE requests ADD COLUMN $name $definition");
            } catch (PDOException $e) {
                if (($e->errorInfo[1] ?? null) !== 1060) throw $e;
            }
        }
    }
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
