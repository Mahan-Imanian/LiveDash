<?php
$envFile = __DIR__ . '/.env';
if (is_file($envFile)) {
    foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        if (str_starts_with(trim($line), '#') || !str_contains($line, '=')) {
            continue;
        }
        [$key, $value] = explode('=', $line, 2);
        $key = trim($key);
        $value = trim($value, " \t\n\r\0\x0B\"'");
        if ($key !== '') {
            $_ENV[$key] = $value;
            putenv($key . '=' . $value);
        }
    }
}

function env_value(string $key, ?string $default = null): ?string
{
    $value = getenv($key);
    if ($value === false || $value === '') {
        return $_ENV[$key] ?? $default;
    }
    return $value;
}

function config(): array
{
    return [
        'db_host' => env_value('DB_HOST', 'localhost'),
        'db_name' => env_value('DB_NAME', ''),
        'db_user' => env_value('DB_USER', ''),
        'db_pass' => env_value('DB_PASS', ''),
        'app_secret' => env_value('APP_SECRET', ''),
        'app_url' => rtrim(env_value('APP_URL', 'https://livedash.codersays.com'), '/'),
        'allowed_origins' => array_values(array_filter(array_map('trim', explode(',', env_value('ALLOWED_ORIGINS', 'https://livedash.codersays.com'))))),
        'google_client_id' => env_value('GOOGLE_CLIENT_ID', ''),
        'google_client_secret' => env_value('GOOGLE_CLIENT_SECRET', ''),
        'google_redirect_uri' => env_value('GOOGLE_REDIRECT_URI', 'https://livedash.codersays.com/auth/google/callback.php'),
    ];
}

function db(): mysqli
{
    $c = config();
    mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
    $db = new mysqli($c['db_host'], $c['db_user'], $c['db_pass'], $c['db_name']);
    $db->set_charset('utf8mb4');
    return $db;
}

function send_json(mixed $payload, int $status = 200, array $headers = []): void
{
    http_response_code($status);
    foreach ($headers as $key => $value) {
        header($key . ': ' . $value);
    }
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function input_json(): array
{
    $raw = file_get_contents('php://input');
    if (!$raw) {
        return [];
    }
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function cors(): void
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $allowed = config()['allowed_origins'];
    $isExtension = str_starts_with($origin, 'chrome-extension://') || str_starts_with($origin, 'moz-extension://');
    if ($origin && (in_array($origin, $allowed, true) || $isExtension)) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
    }
    header('Access-Control-Allow-Headers: Authorization, Content-Type, client, version');
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
    header('Access-Control-Expose-Headers: refresh_token');
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

function base64_url_encode(string $value): string
{
    return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
}

function base64_url_decode(string $value): string|false
{
    $padding = strlen($value) % 4;
    if ($padding) {
        $value .= str_repeat('=', 4 - $padding);
    }
    return base64_decode(strtr($value, '-_', '+/'), true);
}

function make_token(array $user, int $ttl = 2592000): string
{
    $secret = config()['app_secret'];
    $payload = [
        'sub' => (string) $user['id'],
        'email' => $user['email'] ?? null,
        'name' => $user['name'] ?? null,
        'avatar' => $user['avatar'] ?? null,
        'iat' => time(),
        'exp' => time() + $ttl,
    ];
    $body = base64_url_encode(json_encode($payload, JSON_UNESCAPED_SLASHES));
    $sig = base64_url_encode(hash_hmac('sha256', $body, $secret, true));
    return $body . '.' . $sig;
}

function read_token_from_string(string $token): ?array
{
    $parts = explode('.', $token);
    if (count($parts) !== 2) {
        return null;
    }
    [$body, $sig] = $parts;
    $expected = base64_url_encode(hash_hmac('sha256', $body, config()['app_secret'], true));
    if (!hash_equals($expected, $sig)) {
        return null;
    }
    $payload = json_decode(base64_url_decode($body), true);
    if (!is_array($payload) || ($payload['exp'] ?? 0) < time()) {
        return null;
    }
    return $payload;
}

function read_token(): ?array
{
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (!preg_match('/Bearer\s+(.+)/i', $header, $m)) {
        return null;
    }
    return read_token_from_string($m[1]);
}

function current_user(): ?array
{
    $payload = read_token();
    if (!$payload || empty($payload['sub'])) {
        return null;
    }
    return find_user_by_id((int) $payload['sub']);
}

function require_user(): array
{
    $user = current_user();
    if (!$user) {
        send_json(['message' => 'Unauthorized'], 401);
    }
    return $user;
}

function find_user_by_id(int $id): ?array
{
    $db = db();
    $stmt = $db->prepare('SELECT id, google_id, email, name, avatar, created_at FROM users WHERE id = ? LIMIT 1');
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $result = $stmt->get_result()->fetch_assoc();
    return $result ?: null;
}

function google_user_from_access_token(string $token): array
{
    $ch = curl_init('https://www.googleapis.com/oauth2/v3/userinfo');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $token],
        CURLOPT_TIMEOUT => 15,
    ]);
    $raw = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);
    $data = json_decode((string) $raw, true);
    if ($status < 200 || $status >= 300 || !is_array($data) || empty($data['email'])) {
        send_json(['message' => 'Google authentication failed'], 401);
    }
    return $data;
}

function upsert_google_user(array $googleUser): array
{
    $db = db();
    $googleId = (string) ($googleUser['sub'] ?? '');
    $email = (string) ($googleUser['email'] ?? '');
    $name = (string) ($googleUser['name'] ?? $email);
    $avatar = (string) ($googleUser['picture'] ?? '');
    $stmt = $db->prepare('SELECT id, google_id, email, name, avatar, created_at FROM users WHERE google_id = ? OR email = ? LIMIT 1');
    $stmt->bind_param('ss', $googleId, $email);
    $stmt->execute();
    $existing = $stmt->get_result()->fetch_assoc();
    if ($existing) {
        $stmt = $db->prepare('UPDATE users SET google_id = ?, email = ?, name = ?, avatar = ?, updated_at = NOW() WHERE id = ?');
        $id = (int) $existing['id'];
        $stmt->bind_param('ssssi', $googleId, $email, $name, $avatar, $id);
        $stmt->execute();
        $existing['google_id'] = $googleId;
        $existing['email'] = $email;
        $existing['name'] = $name;
        $existing['avatar'] = $avatar;
        $existing['is_new'] = false;
        return $existing;
    }
    $stmt = $db->prepare('INSERT INTO users (google_id, email, name, avatar, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())');
    $stmt->bind_param('ssss', $googleId, $email, $name, $avatar);
    $stmt->execute();
    return [
        'id' => $db->insert_id,
        'google_id' => $googleId,
        'email' => $email,
        'name' => $name,
        'avatar' => $avatar,
        'created_at' => date('c'),
        'is_new' => true,
    ];
}

function ensure_google_connections_table(mysqli $db): void
{
    $db->query('CREATE TABLE IF NOT EXISTS google_connections (
        user_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
        google_id VARCHAR(191) NULL,
        email VARCHAR(255) NULL,
        access_token TEXT NOT NULL,
        refresh_token TEXT NULL,
        scope TEXT NULL,
        expires_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX google_connections_email_index (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');
}

function user_has_google_connection(int $userId): bool
{
    $db = db();
    ensure_google_connections_table($db);
    $stmt = $db->prepare('SELECT user_id FROM google_connections WHERE user_id = ? LIMIT 1');
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    return (bool) $stmt->get_result()->fetch_assoc();
}

function google_connection_for_user(int $userId): ?array
{
    $db = db();
    ensure_google_connections_table($db);
    $stmt = $db->prepare('SELECT user_id, google_id, email, access_token, refresh_token, scope, expires_at FROM google_connections WHERE user_id = ? LIMIT 1');
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $connection = $stmt->get_result()->fetch_assoc();
    return $connection ?: null;
}

function store_google_connection(int $userId, array $tokens, array $googleUser): void
{
    $db = db();
    ensure_google_connections_table($db);
    $googleId = (string) ($googleUser['sub'] ?? '');
    $email = (string) ($googleUser['email'] ?? '');
    $accessToken = (string) ($tokens['access_token'] ?? '');
    $refreshToken = $tokens['refresh_token'] ?? null;
    $scope = $tokens['scope'] ?? null;
    $expiresAt = date('Y-m-d H:i:s', time() + (int) ($tokens['expires_in'] ?? 3600));

    $existing = google_connection_for_user($userId);
    if ($existing && !$refreshToken) {
        $refreshToken = $existing['refresh_token'] ?? null;
    }

    $stmt = $db->prepare('INSERT INTO google_connections (user_id, google_id, email, access_token, refresh_token, scope, expires_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE google_id = VALUES(google_id), email = VALUES(email), access_token = VALUES(access_token), refresh_token = VALUES(refresh_token), scope = VALUES(scope), expires_at = VALUES(expires_at), updated_at = NOW()');
    $stmt->bind_param('issssss', $userId, $googleId, $email, $accessToken, $refreshToken, $scope, $expiresAt);
    $stmt->execute();
}

function delete_google_connection(int $userId): void
{
    $db = db();
    ensure_google_connections_table($db);
    $stmt = $db->prepare('DELETE FROM google_connections WHERE user_id = ?');
    $stmt->bind_param('i', $userId);
    $stmt->execute();
}

function signed_google_state(array $payload): string
{
    $body = base64_url_encode(json_encode($payload + ['iat' => time()], JSON_UNESCAPED_SLASHES));
    $sig = base64_url_encode(hash_hmac('sha256', $body, config()['app_secret'], true));
    return $body . '.' . $sig;
}

function read_signed_google_state(string $state): array
{
    $parts = explode('.', $state);
    if (count($parts) !== 2) {
        send_json(['message' => 'Invalid Google callback'], 400);
    }
    [$body, $sig] = $parts;
    $expected = base64_url_encode(hash_hmac('sha256', $body, config()['app_secret'], true));
    if (!hash_equals($expected, $sig)) {
        send_json(['message' => 'Invalid state'], 400);
    }
    $payload = json_decode(base64_url_decode($body), true);
    if (!is_array($payload)) {
        send_json(['message' => 'Invalid state payload'], 400);
    }
    return $payload;
}

function google_auth_url(string $extensionRedirect, string $mode = 'login', ?int $userId = null): string
{
    $c = config();
    $scopes = ['openid', 'email', 'profile'];
    if ($mode === 'connect') {
        $scopes[] = 'https://www.googleapis.com/auth/calendar.readonly';
    }

    $params = [
        'client_id' => $c['google_client_id'],
        'redirect_uri' => $c['google_redirect_uri'],
        'response_type' => 'code',
        'scope' => implode(' ', $scopes),
        'access_type' => 'offline',
        'prompt' => $mode === 'connect' ? 'consent select_account' : 'select_account',
        'state' => signed_google_state([
            'mode' => $mode,
            'redirect_uri' => $extensionRedirect,
            'user_id' => $userId,
        ]),
    ];

    return 'https://accounts.google.com/o/oauth2/v2/auth?' . http_build_query($params);
}

function google_redirect_back(string $extensionRedirect, array $payload): void
{
    $separator = str_contains($extensionRedirect, '#') ? '&' : '#';
    header('Location: ' . $extensionRedirect . $separator . http_build_query($payload));
    exit;
}

function exchange_google_code(string $code): array
{
    $c = config();
    $ch = curl_init('https://oauth2.googleapis.com/token');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => http_build_query([
            'code' => $code,
            'client_id' => $c['google_client_id'],
            'client_secret' => $c['google_client_secret'],
            'redirect_uri' => $c['google_redirect_uri'],
            'grant_type' => 'authorization_code',
        ]),
        CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded'],
        CURLOPT_TIMEOUT => 15,
    ]);
    $raw = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);
    $tokens = json_decode((string) $raw, true);
    if ($status < 200 || $status >= 300 || empty($tokens['access_token'])) {
        send_json(['message' => 'Google token exchange failed'], 401);
    }
    return $tokens;
}

function refresh_google_connection(array $connection): ?array
{
    if (empty($connection['refresh_token'])) {
        return null;
    }

    $c = config();
    $ch = curl_init('https://oauth2.googleapis.com/token');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => http_build_query([
            'client_id' => $c['google_client_id'],
            'client_secret' => $c['google_client_secret'],
            'refresh_token' => $connection['refresh_token'],
            'grant_type' => 'refresh_token',
        ]),
        CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded'],
        CURLOPT_TIMEOUT => 15,
    ]);
    $raw = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);
    $tokens = json_decode((string) $raw, true);
    if ($status < 200 || $status >= 300 || empty($tokens['access_token'])) {
        return null;
    }

    $db = db();
    ensure_google_connections_table($db);
    $accessToken = (string) $tokens['access_token'];
    $expiresAt = date('Y-m-d H:i:s', time() + (int) ($tokens['expires_in'] ?? 3600));
    $userId = (int) $connection['user_id'];
    $stmt = $db->prepare('UPDATE google_connections SET access_token = ?, expires_at = ?, updated_at = NOW() WHERE user_id = ?');
    $stmt->bind_param('ssi', $accessToken, $expiresAt, $userId);
    $stmt->execute();

    $connection['access_token'] = $accessToken;
    $connection['expires_at'] = $expiresAt;
    return $connection;
}

function google_calendar_events(int $userId, string $start, string $end): array
{
    $connection = google_connection_for_user($userId);
    if (!$connection) {
        return [];
    }

    if (!empty($connection['expires_at']) && strtotime($connection['expires_at']) < time() + 60) {
        $refreshed = refresh_google_connection($connection);
        if ($refreshed) {
            $connection = $refreshed;
        }
    }

    $params = [
        'singleEvents' => 'true',
        'orderBy' => 'startTime',
        'maxResults' => '20',
        'timeMin' => $start,
    ];
    if ($end !== '') {
        $params['timeMax'] = $end;
    }

    $ch = curl_init('https://www.googleapis.com/calendar/v3/calendars/primary/events?' . http_build_query($params));
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $connection['access_token']],
        CURLOPT_TIMEOUT => 15,
    ]);
    $raw = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);

    if ($status === 401) {
        $refreshed = refresh_google_connection($connection);
        if ($refreshed) {
            return google_calendar_events($userId, $start, $end);
        }
    }

    if ($status < 200 || $status >= 300) {
        return [];
    }

    $data = json_decode((string) $raw, true);
    return is_array($data['items'] ?? null) ? $data['items'] : [];
}

function extension_profile(array $user): array
{
    $connections = [];
    if (user_has_google_connection((int) $user['id'])) {
        $connections[] = 'google';
    }

    return [
        'email' => $user['email'],
        'phone' => null,
        'avatar' => $user['avatar'] ?: '',
        'username' => null,
        'name' => $user['name'] ?: $user['email'],
        'verified' => true,
        'connections' => $connections,
        'gender' => null,
        'friendshipStats' => ['accepted' => 0, 'pending' => 0],
        'wallpaper' => null,
        'theme' => 'dark',
        'activity' => null,
        'isBirthDateEditable' => true,
        'birthDate' => null,
        'font' => 'system-ui',
        'timeZone' => 'Europe/London',
        'coins' => 100,
        'city' => null,
        'occupation' => ['id' => '', 'label' => ''],
        'interests' => [],
        'joinedAt' => $user['created_at'] ?? date('c'),
        'progressbar' => [],
        'isProfileCompleted' => false,
        'hasTodayMood' => false,
    ];
}
