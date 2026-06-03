<?php
declare(strict_types=1);

require dirname(__DIR__, 2) . '/api/bootstrap.php';

function livedash_base64url_decode(string $value): string|false {
    $padded = strtr($value, '-_', '+/');
    $pad = strlen($padded) % 4;
    if ($pad) $padded .= str_repeat('=', 4 - $pad);
    return base64_decode($padded, true);
}

function livedash_is_extension_redirect(string $url): bool {
    return preg_match('/^https:\/\/[a-z0-9]+\.chromiumapp\.org(?:\/.*)?$/i', $url) === 1;
}

function livedash_redirect_with_error(string $url, string $error): void {
    if (livedash_is_extension_redirect($url)) {
        header('Location: ' . $url . '#livedash_error=' . rawurlencode($error));
        exit;
    }
    $separator = str_contains($url, '?') ? '&' : '?';
    header('Location: ' . $url . $separator . 'livedash_error=' . rawurlencode($error));
    exit;
}

function livedash_redirect_with_auth(string $url, string $token, string $email, bool $isNewUser, ?string $connected = null): void {
    $params = [
        'access_token' => 'LD_' . $token,
        'livedash_token' => $token,
        'token' => $token,
        'email' => $email,
        'new' => $isNewUser ? '1' : '0'
    ];
    if ($connected) $params['connected'] = $connected;
    if (livedash_is_extension_redirect($url)) {
        header('Location: ' . $url . '#' . http_build_query($params));
        exit;
    }
    $separator = str_contains($url, '?') ? '&' : '?';
    unset($params['access_token']);
    header('Location: ' . $url . $separator . http_build_query($params));
    exit;
}

function livedash_state_is_valid(array $state, array $config): bool {
    $sig = (string)($state['sig'] ?? '');
    if (!$sig) return false;
    unset($state['sig']);
    $expected = hash_hmac('sha256', json_encode($state, JSON_UNESCAPED_SLASHES), $config['APP_SECRET']);
    return hash_equals($expected, $sig);
}

$code = (string)($_GET['code'] ?? '');
$stateRaw = (string)($_GET['state'] ?? '');
$decoded = $stateRaw ? livedash_base64url_decode($stateRaw) : false;
$decodedState = $decoded ? (json_decode($decoded, true) ?: []) : [];
$returnUrl = (string)($decodedState['returnUrl'] ?? $config['APP_URL']);
$extensionRedirectUri = (string)($decodedState['extensionRedirectUri'] ?? '');
$targetUrl = $extensionRedirectUri ?: $returnUrl;
$purpose = (string)($decodedState['purpose'] ?? 'signin');
$userToken = (string)($decodedState['userToken'] ?? '');

if (!$decodedState || !livedash_state_is_valid($decodedState, $config)) {
    livedash_redirect_with_error($targetUrl, 'invalid_state');
}

if ($extensionRedirectUri && !livedash_is_extension_redirect($extensionRedirectUri)) {
    http_response_code(400);
    echo 'Invalid extension redirect URI';
    exit;
}

if (!$code) livedash_redirect_with_error($targetUrl, 'missing_code');

$ch = curl_init('https://oauth2.googleapis.com/token');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_TIMEOUT => 12,
    CURLOPT_POSTFIELDS => http_build_query([
        'code' => $code,
        'client_id' => $config['GOOGLE_CLIENT_ID'],
        'client_secret' => $config['GOOGLE_CLIENT_SECRET'],
        'redirect_uri' => $config['GOOGLE_REDIRECT_URI'],
        'grant_type' => 'authorization_code'
    ])
]);
$response = curl_exec($ch);
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($status !== 200 || !$response) livedash_redirect_with_error($targetUrl, 'token_exchange_failed');

$tokenPayload = json_decode($response, true);
$idToken = (string)($tokenPayload['id_token'] ?? '');
if (!$idToken) livedash_redirect_with_error($targetUrl, 'no_id_token');

$verifyUrl = 'https://oauth2.googleapis.com/tokeninfo?id_token=' . rawurlencode($idToken);
$ch = curl_init($verifyUrl);
curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10]);
$verify = curl_exec($ch);
$verifyStatus = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$profile = json_decode($verify ?: '', true);
if ($verifyStatus !== 200 || !is_array($profile) || ($profile['aud'] ?? '') !== $config['GOOGLE_CLIENT_ID']) {
    livedash_redirect_with_error($targetUrl, 'verification_failed');
}

$mysqli = db($config);
$email = (string)($profile['email'] ?? '');
$beforeStmt = $mysqli->prepare('SELECT id FROM livedash_users WHERE email = ? LIMIT 1');
$beforeStmt->bind_param('s', $email);
$beforeStmt->execute();
$existingUser = $beforeStmt->get_result()->fetch_assoc();
$isNewUser = !$existingUser;
$user = upsert_user_by_email($mysqli, $email, null, $profile['name'] ?? null);
$uid = (int)$user['id'];
$sub = (string)($profile['sub'] ?? '');
$avatar = (string)($profile['picture'] ?? '');
$name = (string)($profile['name'] ?? '');
$stmt = $mysqli->prepare('UPDATE livedash_users SET google_sub = ?, display_name = COALESCE(NULLIF(display_name, ""), ?), avatar_url = ? WHERE id = ?');
$stmt->bind_param('sssi', $sub, $name, $avatar, $uid);
$stmt->execute();

if ($purpose === 'calendar' && $userToken) {
    $current = user_from_token($mysqli, $userToken);
    if (!$current) livedash_redirect_with_error($targetUrl, 'invalid_livedash_session');
    $connectedUserId = (int)$current['id'];
    $accessToken = (string)($tokenPayload['access_token'] ?? '');
    $refreshToken = (string)($tokenPayload['refresh_token'] ?? '');
    $scope = (string)($tokenPayload['scope'] ?? '');
    $expiresAt = gmdate('Y-m-d H:i:s', time() + (int)($tokenPayload['expires_in'] ?? 3600));
    $stmt = $mysqli->prepare('INSERT INTO livedash_google_connections (user_id, google_email, google_sub, access_token, refresh_token, scope, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE google_email=VALUES(google_email), google_sub=VALUES(google_sub), access_token=VALUES(access_token), refresh_token=COALESCE(NULLIF(VALUES(refresh_token), ""), refresh_token), scope=VALUES(scope), expires_at=VALUES(expires_at), updated_at=CURRENT_TIMESTAMP');
    $stmt->bind_param('issssss', $connectedUserId, $email, $sub, $accessToken, $refreshToken, $scope, $expiresAt);
    $stmt->execute();
    record_event($mysqli, $connectedUserId, 'google_calendar_connected', ['email' => $email]);
    livedash_redirect_with_auth($targetUrl, $userToken, (string)$current['email'], false, 'google');
}

$token = issue_token($mysqli, $uid);
record_event($mysqli, $uid, 'google_oauth_callback', [
    'mode' => $extensionRedirectUri ? 'extension' : 'web'
]);

livedash_redirect_with_auth($targetUrl, $token, $email, $isNewUser, null);
