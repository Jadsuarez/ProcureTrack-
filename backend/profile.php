<?php
/**
 * Current-user profile and office settings
 */
require_once __DIR__ . '/db.php';
session_start();

if (empty($_SESSION['role']) || empty($_SESSION['user_id'])) {
    jsonResponse(['success' => false, 'message' => 'Unauthorized. Please log in.'], 401);
}

$pdo = getConnection();
$userId = (int) $_SESSION['user_id'];

function profilePayload(PDO $pdo, array $user): array
{
    $office = $user['office'];
    $prefs = decodeUserPreferences($user['preferences'] ?? null);
    $templates = $pdo->query(
        'SELECT template_key, signatory_name, designation, department, approval_order, is_required
         FROM signatory_templates ORDER BY approval_order'
    )->fetchAll();
    return [
        'id' => (int) $user['id'],
        'username' => $user['username'],
        'display_name' => $user['display_name'] ?? '',
        'email' => $user['email'] ?? '',
        'office' => $office,
        'office_label' => roleLabel($office),
        'preferences' => $prefs,
        'signatory_templates' => $templates,
    ];
}

function sanitizeSignatoryNames(mixed $input): array
{
    $keys = [
        'head_accounting',
        'vice_chancellor_admin_finance',
        'chancellor',
        'vice_chancellor_academic_affairs',
        'vice_chancellor_academic_affairs_2',
    ];
    if (!is_array($input)) {
        jsonResponse(['success' => false, 'message' => 'Signatory names must be provided for all five signatory offices.'], 400);
    }

    $names = [];
    foreach ($keys as $key) {
        $rawName = $input[$key] ?? null;
        if (!is_string($rawName)) {
            jsonResponse(['success' => false, 'message' => 'Each signatory name must be text.'], 400);
        }
        $name = trim($rawName);
        if ($name === '' || strlen($name) > 150) {
            jsonResponse(['success' => false, 'message' => 'Each signatory name is required and must be 150 characters or less.'], 400);
        }
        $names[$key] = $name;
    }
    return $names;
}

function loadCurrentUser(PDO $pdo, int $userId): ?array
{
    $stmt = $pdo->prepare(
        'SELECT id, username, office, display_name, email, preferences FROM users WHERE id = ? LIMIT 1'
    );
    $stmt->execute([$userId]);
    $user = $stmt->fetch();
    return $user ?: null;
}

function applyUserToSession(array $user): void
{
    $_SESSION['username'] = $user['username'];
    $_SESSION['role'] = $user['office'];
    $_SESSION['role_label'] = roleLabel($user['office']);
    $_SESSION['display_name'] = $user['display_name'] ?? '';
    $_SESSION['email'] = $user['email'] ?? '';
    $_SESSION['preferences'] = decodeUserPreferences($user['preferences'] ?? null);
}

function sanitizePreferences(array $input, string $office): array
{
    $notify = trim((string) ($input['notify_filter'] ?? 'all'));
    if (!in_array($notify, ['all', 'new'], true)) {
        $notify = 'all';
    }

    $prefs = ['notify_filter' => $notify];

    $notes = trim((string) ($input['default_notes'] ?? ''));
    if (strlen($notes) > 500) {
        jsonResponse(['success' => false, 'message' => 'Default notes must be 500 characters or less.'], 400);
    }
    if ($office !== 'requesting') {
        $prefs['default_notes'] = $notes;
    }

    if ($office === 'requesting') {
        $title = trim((string) ($input['default_title'] ?? ''));
        $description = trim((string) ($input['default_description'] ?? ''));
        if (strlen($title) > 255 || strlen($description) > 1000) {
            jsonResponse(['success' => false, 'message' => 'Default title or description is too long.'], 400);
        }
        $prefs['default_title'] = $title;
        $prefs['default_description'] = $description;
    }

    if ($office === 'budget') {
        $budgetType = trim((string) ($input['default_budget_type'] ?? ''));
        if (strlen($budgetType) > 100) {
            jsonResponse(['success' => false, 'message' => 'Default budget type is too long.'], 400);
        }
        $prefs['default_budget_type'] = $budgetType;
    }

    return $prefs;
}

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $user = loadCurrentUser($pdo, $userId);
        if (!$user) {
            jsonResponse(['success' => false, 'message' => 'Account not found.'], 404);
        }
        applyUserToSession($user);
        jsonResponse(['success' => true, 'profile' => profilePayload($pdo, $user)]);
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        jsonResponse(['success' => false, 'message' => 'Method not allowed.'], 405);
    }

    $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $action = trim($input['action'] ?? 'profile');
    $user = loadCurrentUser($pdo, $userId);
    if (!$user) {
        jsonResponse(['success' => false, 'message' => 'Account not found.'], 404);
    }

    if ($action === 'settings') {
        $office = $user['office'];
        $hasSignatoryNames = array_key_exists('signatory_names', $input);
        if ($hasSignatoryNames && $office !== 'requesting') {
            jsonResponse(['success' => false, 'message' => 'Only Requesting Office can change signatory names in Office Settings.'], 403);
        }
        $signatoryNames = $hasSignatoryNames ? sanitizeSignatoryNames($input['signatory_names']) : [];
        $prefs = sanitizePreferences($input, $office);
        $pdo->beginTransaction();
        $update = $pdo->prepare('UPDATE users SET preferences = ? WHERE id = ?');
        $update->execute([json_encode($prefs, JSON_UNESCAPED_UNICODE), $userId]);
        if ($hasSignatoryNames) {
            $updateName = $pdo->prepare('UPDATE signatory_templates SET signatory_name = ? WHERE template_key = ?');
            foreach ($signatoryNames as $key => $name) {
                $updateName->execute([$name, $key]);
            }
        }
        $pdo->commit();
        $user = loadCurrentUser($pdo, $userId);
        applyUserToSession($user);
        jsonResponse([
            'success' => true,
            'message' => 'Settings saved.',
            'profile' => profilePayload($pdo, $user),
        ]);
    }

    if ($action !== 'profile') {
        jsonResponse(['success' => false, 'message' => 'Unknown action.'], 400);
    }

    $username = trim($input['username'] ?? '');
    $displayName = trim($input['display_name'] ?? '');
    $email = trim($input['email'] ?? '');
    $password = (string) ($input['password'] ?? '');
    $confirm = (string) ($input['confirm_password'] ?? '');

    if (!preg_match('/^[a-zA-Z0-9_]{3,50}$/', $username)) {
        jsonResponse(['success' => false, 'message' => 'Username must be 3–50 characters (letters, numbers, underscore only).'], 400);
    }
    if (strlen($displayName) > 100) {
        jsonResponse(['success' => false, 'message' => 'Display name must be 100 characters or less.'], 400);
    }
    if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonResponse(['success' => false, 'message' => 'Enter a valid email address.'], 400);
    }
    if ($password !== '' || $confirm !== '') {
        if ($password !== $confirm) {
            jsonResponse(['success' => false, 'message' => 'Passwords do not match.'], 400);
        }
        if (strlen($password) < 6) {
            jsonResponse(['success' => false, 'message' => 'Password must be at least 6 characters.'], 400);
        }
    }

    $dup = $pdo->prepare('SELECT id FROM users WHERE username = ? AND id != ? LIMIT 1');
    $dup->execute([$username, $userId]);
    if ($dup->fetch()) {
        jsonResponse(['success' => false, 'message' => 'Username is already taken.'], 409);
    }

    if ($password !== '') {
        $hash = password_hash($password, PASSWORD_DEFAULT);
        $update = $pdo->prepare(
            'UPDATE users SET username = ?, display_name = ?, email = ?, password_hash = ? WHERE id = ?'
        );
        $update->execute([$username, $displayName !== '' ? $displayName : null, $email !== '' ? $email : null, $hash, $userId]);
    } else {
        $update = $pdo->prepare(
            'UPDATE users SET username = ?, display_name = ?, email = ? WHERE id = ?'
        );
        $update->execute([$username, $displayName !== '' ? $displayName : null, $email !== '' ? $email : null, $userId]);
    }

    $user = loadCurrentUser($pdo, $userId);
    applyUserToSession($user);
    jsonResponse([
        'success' => true,
        'message' => 'Profile updated.',
        'profile' => profilePayload($pdo, $user),
    ]);
} catch (PDOException $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    jsonResponse(['success' => false, 'message' => 'Database error.'], 500);
}
