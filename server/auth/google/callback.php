<?php
require dirname(__DIR__, 2) . '/bootstrap.php';
$code = $_GET['code'] ?? '';
$state = $_GET['state'] ?? '';
if (!$code || !$state) {
    send_json(['message' => 'Invalid Google callback'], 400);
}
$stateData = read_signed_google_state($state);
$extensionRedirect = $stateData['redirect_uri'] ?? '';
if (!$extensionRedirect) {
    send_json(['message' => 'Missing extension redirect'], 400);
}
$tokens = exchange_google_code($code);
$google = google_user_from_access_token($tokens['access_token']);
$mode = $stateData['mode'] ?? 'login';
if ($mode === 'connect') {
    $userId = (int) ($stateData['user_id'] ?? 0);
    if ($userId <= 0 || !find_user_by_id($userId)) {
        google_redirect_back($extensionRedirect, ['error' => 'Invalid LiveDash session. Sign in again.']);
    }
    store_google_connection($userId, $tokens, $google);
    google_redirect_back($extensionRedirect, ['connected' => '1']);
}
$user = upsert_google_user($google);
$token = make_token($user);
google_redirect_back($extensionRedirect, ['token' => $token, 'new' => !empty($user['is_new']) ? '1' : '0']);
