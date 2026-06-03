<?php
declare(strict_types=1);

$config = require dirname(__DIR__, 2) . '/api/config.php';

function livedash_base64url_encode(string $value): string {
    return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
}

function livedash_is_extension_redirect(string $url): bool {
    return preg_match('/^https:\/\/[a-z0-9]+\.chromiumapp\.org(?:\/.*)?$/i', $url) === 1;
}

function livedash_redirect_error(string $returnUrl, string $error): void {
    $separator = str_contains($returnUrl, '?') ? '&' : '?';
    header('Location: ' . $returnUrl . $separator . 'livedash_error=' . rawurlencode($error));
    exit;
}

$returnUrl = (string)($_GET['returnUrl'] ?? $config['APP_URL']);
$mode = (string)($_GET['mode'] ?? 'web');
$purpose = (string)($_GET['purpose'] ?? 'signin');
$scopeMode = (string)($_GET['scope'] ?? 'profile');
$extensionRedirectUri = (string)($_GET['extension_redirect_uri'] ?? ($_GET['redirect_uri'] ?? ''));
$userToken = (string)($_GET['user_token'] ?? '');

if (empty($config['GOOGLE_CLIENT_ID']) || empty($config['GOOGLE_CLIENT_SECRET']) || empty($config['GOOGLE_REDIRECT_URI'])) {
    livedash_redirect_error($returnUrl, 'google_not_configured');
}

if ($mode === 'extension') {
    if (!$extensionRedirectUri || !livedash_is_extension_redirect($extensionRedirectUri)) {
        http_response_code(400);
        echo 'Invalid extension redirect URI';
        exit;
    }
    $returnUrl = $extensionRedirectUri;
}

$scopes = ['openid', 'email', 'profile'];
if ($scopeMode === 'calendar' || $purpose === 'calendar') {
    $scopes[] = 'https://www.googleapis.com/auth/calendar.readonly';
}

$statePayload = [
    'returnUrl' => $returnUrl,
    'extensionRedirectUri' => $mode === 'extension' ? $extensionRedirectUri : '',
    'nonce' => bin2hex(random_bytes(16)),
    'mode' => $mode,
    'purpose' => $purpose,
    'userToken' => $userToken,
    'iat' => time()
];
$statePayload['sig'] = hash_hmac('sha256', json_encode($statePayload, JSON_UNESCAPED_SLASHES), $config['APP_SECRET']);
$state = livedash_base64url_encode(json_encode($statePayload, JSON_UNESCAPED_SLASHES));

$params = http_build_query([
    'client_id' => $config['GOOGLE_CLIENT_ID'],
    'redirect_uri' => $config['GOOGLE_REDIRECT_URI'],
    'response_type' => 'code',
    'scope' => implode(' ', $scopes),
    'state' => $state,
    'access_type' => $scopeMode === 'calendar' || $purpose === 'calendar' ? 'offline' : 'online',
    'include_granted_scopes' => 'true',
    'prompt' => $scopeMode === 'calendar' || $purpose === 'calendar' ? 'consent select_account' : 'select_account'
]);

header('Location: https://accounts.google.com/o/oauth2/v2/auth?' . $params);
exit;
