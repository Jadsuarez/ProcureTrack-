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
        ensureSystemOffices($pdo);
        ensureSignatoryTables($pdo);
        ensureSignatoryTemplates($pdo);
        ensureSignatoryAuditTables($pdo);
        ensureLegacyStatusMigration($pdo);
        ensureExistingFundDeductions($pdo);
        ensureRequiredSignatoryRouting($pdo);
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

function ensureRequiredSignatoryRouting(PDO $pdo): void
{
    $check = $pdo->prepare('SELECT 1 FROM system_migrations WHERE migration_key = ?');
    $check->execute(['route_required_signatories']);
    if ($check->fetchColumn()) {
        return;
    }

    $officeByTemplate = [
        'head_accounting' => 'accounting',
        'vice_chancellor_admin_finance' => 'vc_admin_finance',
        'chancellor' => 'chancellor',
        'vice_chancellor_academic_affairs' => 'academic_affairs',
        'vice_chancellor_academic_affairs_2' => 'academic_affairs',
    ];
    $orderByTemplate = [
        'head_accounting' => 1,
        'vice_chancellor_admin_finance' => 2,
        'chancellor' => 3,
        'vice_chancellor_academic_affairs' => 4,
        'vice_chancellor_academic_affairs_2' => 5,
    ];

    $pdo->beginTransaction();
    try {
        $update = $pdo->prepare(
            'UPDATE request_signatories
             SET assigned_office = ?, approval_order = ?
             WHERE template_key = ?'
        );
        foreach ($officeByTemplate as $templateKey => $office) {
            $update->execute([$office, $orderByTemplate[$templateKey], $templateKey]);
        }

        $missing = $pdo->query(
            "SELECT r.id AS request_id, r.updated_by, t.template_key, t.signatory_name,
                    t.designation, t.department, t.approval_order
             FROM requests r
             CROSS JOIN signatory_templates t
             WHERE r.status = 'Registered'
               AND t.is_required = 1
               AND NOT EXISTS (
                   SELECT 1 FROM request_signatories s
                   WHERE s.request_id = r.id AND s.template_key = t.template_key
               )
             ORDER BY r.id, t.approval_order"
        )->fetchAll();
        $insert = $pdo->prepare(
            'INSERT INTO request_signatories
             (request_id, template_key, signatory_name, designation, department, assigned_office, approval_order, status, updated_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, "Pending Signature", ?)'
        );
        $log = $pdo->prepare(
            'INSERT INTO request_signatory_logs
             (request_id, signatory_id, assigned_office, action, status, updated_by)
             VALUES (?, ?, ?, "Added", "Pending Signature", "System")'
        );
        foreach ($missing as $signatory) {
            $office = $officeByTemplate[$signatory['template_key']] ?? null;
            if ($office === null) {
                throw new RuntimeException('Unknown required signatory template during routing migration.');
            }
            $insert->execute([
                (int) $signatory['request_id'],
                $signatory['template_key'],
                $signatory['signatory_name'],
                $signatory['designation'],
                $signatory['department'],
                $office,
                (int) $signatory['approval_order'],
                $signatory['updated_by'] ?: 'System',
            ]);
            $log->execute([(int) $signatory['request_id'], (int) $pdo->lastInsertId(), $office]);
        }

        $mark = $pdo->prepare('INSERT INTO system_migrations (migration_key) VALUES (?)');
        $mark->execute(['route_required_signatories']);
        $pdo->commit();
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $error;
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
            template_key VARCHAR(50) DEFAULT NULL,
            signatory_name VARCHAR(150) NOT NULL,
            designation VARCHAR(150) DEFAULT NULL,
            department VARCHAR(150) DEFAULT NULL,
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
    if (!in_array('template_key', $columns, true)) {
        $pdo->exec('ALTER TABLE request_signatories ADD COLUMN template_key VARCHAR(50) DEFAULT NULL AFTER request_id');
    }
    if (!in_array('department', $columns, true)) {
        $pdo->exec('ALTER TABLE request_signatories ADD COLUMN department VARCHAR(150) DEFAULT NULL AFTER designation');
    }
}

function ensureSignatoryTemplates(PDO $pdo): void
{
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS signatory_templates (
            template_key VARCHAR(50) PRIMARY KEY,
            signatory_name VARCHAR(150) NOT NULL,
            designation VARCHAR(150) NOT NULL,
            department VARCHAR(150) NOT NULL,
            approval_order INT NOT NULL,
            is_required TINYINT(1) NOT NULL DEFAULT 1
        ) ENGINE=InnoDB'
    );
    $insert = $pdo->prepare(
        'INSERT IGNORE INTO signatory_templates
         (template_key, signatory_name, designation, department, approval_order, is_required)
         VALUES (?, ?, ?, ?, ?, ?)'
    );
    $templates = [
        ['head_accounting', 'Maria Elena Santos', 'Head, Accounting, BatstateU Lipa', 'Accounting Office, BatstateU Lipa', 1, 1],
        ['vice_chancellor_admin_finance', 'Jose Miguel Reyes', 'Vice Chancellor for Administration and Finance', 'Office of the Vice Chancellor for Administration and Finance, BatStateU Lipa', 2, 1],
        ['chancellor', 'Alberto Cruz', 'Chancellor, BatStateU Lipa', 'Office of the Chancellor, BatStateU Lipa', 3, 1],
        ['vice_chancellor_academic_affairs', 'Patricia Anne Mendoza', 'Vice Chancellor for Academic Affairs, BatStateU Lipa', 'Office of the Vice Chancellor for Academic Affairs, BatStateU Lipa', 4, 1],
        ['vice_chancellor_academic_affairs_2', 'Ramon Luis Bautista', 'Vice Chancellor for Academic Affairs, BatStateU Lipa', 'Office of the Vice Chancellor for Academic Affairs, BatStateU Lipa', 5, 0],
    ];
    foreach ($templates as $template) {
        $insert->execute($template);
    }
    $pdo->exec(
        "UPDATE signatory_templates SET
            designation = CASE template_key
                WHEN 'head_accounting' THEN 'Head, Accounting, BatstateU Lipa'
                WHEN 'vice_chancellor_admin_finance' THEN 'Vice Chancellor for Administration and Finance'
                WHEN 'chancellor' THEN 'Chancellor, BatStateU Lipa'
                WHEN 'vice_chancellor_academic_affairs' THEN 'Vice Chancellor for Academic Affairs, BatStateU Lipa'
                WHEN 'vice_chancellor_academic_affairs_2' THEN 'Vice Chancellor for Academic Affairs, BatStateU Lipa'
                ELSE designation END,
            department = CASE template_key
                WHEN 'head_accounting' THEN 'Accounting Office, BatstateU Lipa'
                WHEN 'vice_chancellor_admin_finance' THEN 'Office of the Vice Chancellor for Administration and Finance, BatStateU Lipa'
                WHEN 'chancellor' THEN 'Office of the Chancellor, BatStateU Lipa'
                WHEN 'vice_chancellor_academic_affairs' THEN 'Office of the Vice Chancellor for Academic Affairs, BatStateU Lipa'
                WHEN 'vice_chancellor_academic_affairs_2' THEN 'Office of the Vice Chancellor for Academic Affairs, BatStateU Lipa'
                ELSE department END,
            approval_order = CASE template_key
                WHEN 'head_accounting' THEN 1
                WHEN 'vice_chancellor_admin_finance' THEN 2
                WHEN 'chancellor' THEN 3
                WHEN 'vice_chancellor_academic_affairs' THEN 4
                WHEN 'vice_chancellor_academic_affairs_2' THEN 5
                ELSE approval_order END,
            is_required = CASE template_key
                WHEN 'head_accounting' THEN 1
                WHEN 'vice_chancellor_admin_finance' THEN 1
                WHEN 'chancellor' THEN 1
                WHEN 'vice_chancellor_academic_affairs' THEN 1
                WHEN 'vice_chancellor_academic_affairs_2' THEN 0
                ELSE is_required END"
    );
    $pdo->exec(
        "UPDATE signatory_templates SET signatory_name = CASE template_key
            WHEN 'head_accounting' THEN 'Maria Elena Santos'
            WHEN 'vice_chancellor_admin_finance' THEN 'Jose Miguel Reyes'
            WHEN 'chancellor' THEN 'Alberto Cruz'
            WHEN 'vice_chancellor_academic_affairs' THEN 'Patricia Anne Mendoza'
            ELSE signatory_name END
         WHERE (template_key = 'head_accounting' AND signatory_name = 'Ms. Accounting Head')
            OR (template_key = 'vice_chancellor_admin_finance' AND signatory_name = 'Vice Chancellor for Administration and Finance')
            OR (template_key = 'chancellor' AND signatory_name = 'Chancellor, BatStateU Lipa')
            OR (template_key = 'vice_chancellor_academic_affairs' AND signatory_name = 'Vice Chancellor for Academic Affairs, BatStateU Lipa')"
    );
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
        'funds_restored' => 'TINYINT(1) NOT NULL DEFAULT 0',
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

function ensureSystemOffices(PDO $pdo): void
{
    $pdo->exec(
        "INSERT IGNORE INTO offices (slug, label, is_system, created_by, fund_allocation)
         VALUES
            ('pso', 'Property and Supply Office', 1, 'system', 0),
            ('vc_admin_finance', 'Office of the Vice Chancellor for Administration and Finance', 1, 'system', 0),
            ('chancellor', 'Office of the Chancellor, BatStateU Lipa', 1, 'system', 0),
            ('academic_affairs', 'Office of the Vice Chancellor for Academic Affairs, BatStateU Lipa', 1, 'system', 0)"
    );
    $pdo->exec(
        "INSERT IGNORE INTO users (username, password_hash, office, created_by)
         VALUES
            ('vc_admin_finance_user', '\$2y\$10\$sDFSq4d.H.1Rvh6NWFaYju/gWuqY1DGyygGoKnQk8RJcQFWHNMsE.', 'vc_admin_finance', 'system'),
            ('chancellor_user', '\$2y\$10\$iBRKXmuuuhoV60EX7vssleWFVltRzRQtyB/GX94zDP7wlfIfaGcVO', 'chancellor', 'system'),
            ('academic_affairs_user', '\$2y\$10\$IRoEwwoXNAPWT0wnv7UUXOP8K3VWgLBO2o2JAMW7opTAfU74OYEVi', 'academic_affairs', 'system')"
    );
}

function isClosedStatus(string $status): bool
{
    return in_array($status, ['Returned', 'Cancelled'], true);
}

function restoreRequestFunds(PDO $pdo, array $request): void
{
    if ((int) ($request['funds_restored'] ?? 0) === 1) {
        return;
    }
    $amount = round((float) ($request['request_amount'] ?? 0), 2);
    $office = trim((string) ($request['funding_office'] ?? '')) ?: 'requesting';
    if ($amount > 0) {
        $stmt = $pdo->prepare('UPDATE offices SET fund_allocation = fund_allocation + ? WHERE slug = "budget"');
        $stmt->execute([$amount]);
    }
    $mark = $pdo->prepare('UPDATE requests SET funds_restored = 1 WHERE id = ?');
    $mark->execute([(int) $request['id']]);
}

function ensureOfficeFundAllocationColumn(PDO $pdo): void
{
    static $checked = false;
    if ($checked) {
        return;
    }
    $checked = true;
    $hasColumn = false;

    try {
        $pdo->query('SELECT fund_allocation FROM offices LIMIT 1');
        $hasColumn = true;
    } catch (PDOException $e) {
        try {
            $pdo->exec(
                'ALTER TABLE offices ADD COLUMN fund_allocation DECIMAL(15, 2) NOT NULL DEFAULT 0'
            );
            $hasColumn = true;
        } catch (PDOException $ignored) {
            // offices table may not exist yet
        }
    }

    if ($hasColumn) {
        $pdo->exec('UPDATE offices SET fund_allocation = 0 WHERE slug <> "budget"');
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
        ['id' => 0, 'slug' => 'pso', 'label' => 'Property and Supply Office', 'is_system' => 1],
        ['id' => 0, 'slug' => 'cashier', 'label' => 'Cashier', 'is_system' => 1],
        ['id' => 0, 'slug' => 'vc_admin_finance', 'label' => 'Office of the Vice Chancellor for Administration and Finance', 'is_system' => 1],
        ['id' => 0, 'slug' => 'chancellor', 'label' => 'Office of the Chancellor, BatStateU Lipa', 'is_system' => 1],
        ['id' => 0, 'slug' => 'academic_affairs', 'label' => 'Office of the Vice Chancellor for Academic Affairs, BatStateU Lipa', 'is_system' => 1],
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
