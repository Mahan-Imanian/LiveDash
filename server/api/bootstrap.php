<?php
declare(strict_types=1);

$configPath = __DIR__ . '/config.php';
$config = file_exists($configPath) ? require $configPath : require __DIR__ . '/config.sample.php';

function livedash_cors(array $config): void {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $allowed = $config['ALLOWED_ORIGINS'] ?? [];
    $allow = in_array($origin, $allowed, true) || str_starts_with($origin, 'chrome-extension://');
    if ($allow && $origin) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
    }
    header('Access-Control-Allow-Credentials: false');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, client, version');
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
    header('Access-Control-Expose-Headers: refresh_token');
    header('Content-Type: application/json; charset=utf-8');
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

livedash_cors($config);

function json_response(array $payload, int $status = 200): void {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function request_json(): array {
    $raw = file_get_contents('php://input') ?: '';
    if ($raw === '') return [];
    $data = json_decode($raw, true);
    if (!is_array($data)) json_response(['ok' => false, 'error' => 'Invalid JSON'], 400);
    return $data;
}

function db(array $config): mysqli {
    foreach (['DB_HOST','DB_NAME','DB_USER','APP_SECRET'] as $key) {
        if (empty($config[$key])) json_response(['ok' => false, 'error' => 'Server is not configured'], 500);
    }
    mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
    $mysqli = new mysqli($config['DB_HOST'], $config['DB_USER'], $config['DB_PASS'], $config['DB_NAME']);
    $mysqli->set_charset('utf8mb4');
    return $mysqli;
}


function ensure_reward_columns(mysqli $db): void {
    static $done = false;
    if ($done) return;
    $done = true;
    $columns = [];
    $result = $db->query("SHOW COLUMNS FROM livedash_users");
    while ($row = $result->fetch_assoc()) $columns[$row['Field']] = true;
    if (empty($columns['referral_code'])) $db->query("ALTER TABLE livedash_users ADD COLUMN referral_code VARCHAR(32) NULL UNIQUE AFTER avatar_url");
    if (empty($columns['referred_by_user_id'])) $db->query("ALTER TABLE livedash_users ADD COLUMN referred_by_user_id BIGINT UNSIGNED NULL AFTER referral_code");
    if (empty($columns['coins'])) $db->query("ALTER TABLE livedash_users ADD COLUMN coins INT NOT NULL DEFAULT 100 AFTER referred_by_user_id");
}

function make_referral_code(string $email, int $userId): string {
    $base = strtoupper(preg_replace('/[^A-Z0-9]/', '', explode('@', $email)[0]));
    if ($base === '') $base = 'LD';
    $base = substr($base, 0, 7);
    return $base . strtoupper(substr(hash('crc32b', $email . ':' . $userId), 0, 5));
}

function ensure_user_rewards(mysqli $db, int $userId, string $email): array {
    ensure_reward_columns($db);
    $stmt = $db->prepare('SELECT referral_code, coins FROM livedash_users WHERE id = ? LIMIT 1');
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc() ?: [];
    $code = (string)($row['referral_code'] ?? '');
    if ($code === '') {
        $code = make_referral_code($email, $userId);
        $attempt = 0;
        while (true) {
            try {
                $stmt = $db->prepare('UPDATE livedash_users SET referral_code = ?, coins = GREATEST(coins, 100) WHERE id = ?');
                $stmt->bind_param('si', $code, $userId);
                $stmt->execute();
                break;
            } catch (mysqli_sql_exception $e) {
                $attempt++;
                if ($attempt > 4) throw $e;
                $code = make_referral_code($email . $attempt, $userId);
            }
        }
        $row['coins'] = max((int)($row['coins'] ?? 0), 100);
    }
    return ['referral_code' => $code, 'coins' => (int)($row['coins'] ?? 100)];
}

function random_token(): string {
    return rtrim(strtr(base64_encode(random_bytes(48)), '+/', '-_'), '=');
}

function issue_token(mysqli $db, int $userId): string {
    $token = random_token();
    $hash = hash('sha256', $token);
    $expires = (new DateTimeImmutable('+90 days'))->format('Y-m-d H:i:s');
    $agent = substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 255);
    $ip = substr($_SERVER['REMOTE_ADDR'] ?? '', 0, 64);
    $stmt = $db->prepare('INSERT INTO livedash_tokens (user_id, token_hash, user_agent, ip_address, expires_at) VALUES (?, ?, ?, ?, ?)');
    $stmt->bind_param('issss', $userId, $hash, $agent, $ip, $expires);
    $stmt->execute();
    return $token;
}

function bearer_token(): string {
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (preg_match('/Bearer\s+(.+)/i', $header, $m)) return trim($m[1]);
    return '';
}


function user_from_token(mysqli $db, string $token): ?array {
    if (!$token) return null;
    $hash = hash('sha256', $token);
    $stmt = $db->prepare('SELECT u.id, u.email, u.display_name, u.avatar_url FROM livedash_tokens t JOIN livedash_users u ON u.id = t.user_id WHERE t.token_hash = ? AND t.expires_at > NOW() LIMIT 1');
    $stmt->bind_param('s', $hash);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    if ($row) ensure_user_rewards($db, (int)$row['id'], (string)$row['email']);
    return $row ?: null;
}

function current_user(mysqli $db): array {
    $token = bearer_token();
    if (!$token) json_response(['ok' => false, 'error' => 'Missing token'], 401);
    $hash = hash('sha256', $token);
    $stmt = $db->prepare('SELECT u.id, u.email, u.display_name, u.avatar_url FROM livedash_tokens t JOIN livedash_users u ON u.id = t.user_id WHERE t.token_hash = ? AND t.expires_at > NOW() LIMIT 1');
    $stmt->bind_param('s', $hash);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    if (!$row) json_response(['ok' => false, 'error' => 'Invalid token'], 401);
    $rewards = ensure_user_rewards($db, (int)$row['id'], (string)$row['email']);
    $row['referral_code'] = $rewards['referral_code'];
    $row['coins'] = $rewards['coins'];
    return $row;
}

function upsert_user_by_email(mysqli $db, string $email, ?string $password = null, ?string $display = null): array {
    $email = strtolower(trim($email));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) json_response(['ok' => false, 'error' => 'Invalid email'], 422);
    $stmt = $db->prepare('SELECT id, email, password_hash, display_name, avatar_url FROM livedash_users WHERE email = ? LIMIT 1');
    $stmt->bind_param('s', $email);
    $stmt->execute();
    $existing = $stmt->get_result()->fetch_assoc();
    if ($existing) {
        ensure_user_rewards($db, (int)$existing['id'], (string)$existing['email']);
        if ($password && !empty($existing['password_hash']) && !password_verify($password, $existing['password_hash'])) {
            json_response(['ok' => false, 'error' => 'Invalid password'], 401);
        }
        return $existing;
    }
    $hash = $password ? password_hash($password, PASSWORD_DEFAULT) : null;
    ensure_reward_columns($db);
    $stmt = $db->prepare('INSERT INTO livedash_users (email, password_hash, display_name, coins) VALUES (?, ?, ?, 100)');
    $stmt->bind_param('sss', $email, $hash, $display);
    $stmt->execute();
    $id = (int)$db->insert_id;
    ensure_user_rewards($db, $id, $email);
    return ['id' => $id, 'email' => $email, 'display_name' => $display, 'avatar_url' => null];
}

function record_event(mysqli $db, int $userId, string $type, array $body = []): void {
    $json = json_encode($body, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    $stmt = $db->prepare('INSERT INTO livedash_events (user_id, event_type, event_body) VALUES (?, ?, ?)');
    $stmt->bind_param('iss', $userId, $type, $json);
    $stmt->execute();
}
