<?php
require __DIR__ . '/bootstrap.php';

function livedash_refresh_google_token(mysqli $db, array $config, array $connection): ?string {
    $refreshToken = (string)($connection['refresh_token'] ?? '');
    if (!$refreshToken) return null;
    $ch = curl_init('https://oauth2.googleapis.com/token');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_TIMEOUT => 12,
        CURLOPT_POSTFIELDS => http_build_query([
            'client_id' => $config['GOOGLE_CLIENT_ID'],
            'client_secret' => $config['GOOGLE_CLIENT_SECRET'],
            'refresh_token' => $refreshToken,
            'grant_type' => 'refresh_token'
        ])
    ]);
    $response = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($status !== 200 || !$response) return null;
    $payload = json_decode($response, true);
    if (!is_array($payload) || empty($payload['access_token'])) return null;
    $accessToken = (string)$payload['access_token'];
    $expiresAt = gmdate('Y-m-d H:i:s', time() + (int)($payload['expires_in'] ?? 3600));
    $stmt = $db->prepare('UPDATE livedash_google_connections SET access_token = ?, expires_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    $id = (int)$connection['id'];
    $stmt->bind_param('ssi', $accessToken, $expiresAt, $id);
    $stmt->execute();
    return $accessToken;
}

$mysqli = db($config);
$user = current_user($mysqli);
$uid = (int)$user['id'];
$stmt = $mysqli->prepare('SELECT * FROM livedash_google_connections WHERE user_id = ? LIMIT 1');
$stmt->bind_param('i', $uid);
$stmt->execute();
$connection = $stmt->get_result()->fetch_assoc();
if (!$connection) json_response(['events' => [], 'connected' => false]);

$accessToken = (string)$connection['access_token'];
if (strtotime((string)$connection['expires_at']) <= time() + 60) {
    $refreshed = livedash_refresh_google_token($mysqli, $config, $connection);
    if ($refreshed) $accessToken = $refreshed;
}

$start = (string)($_GET['start'] ?? gmdate('c'));
$end = (string)($_GET['end'] ?? gmdate('c', time() + 7 * 86400));
if (!$end) $end = gmdate('c', time() + 7 * 86400);
$params = http_build_query([
    'timeMin' => $start,
    'timeMax' => $end,
    'singleEvents' => 'true',
    'orderBy' => 'startTime',
    'maxResults' => 25
]);
$url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events?' . $params;
$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 12,
    CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $accessToken, 'Accept: application/json']
]);
$response = curl_exec($ch);
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);
if ($status === 401 && !empty($connection['refresh_token'])) {
    $refreshed = livedash_refresh_google_token($mysqli, $config, $connection);
    if ($refreshed) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 12,
            CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $refreshed, 'Accept: application/json']
        ]);
        $response = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
    }
}
if ($status < 200 || $status >= 300 || !$response) json_response(['events' => [], 'connected' => true]);
$payload = json_decode($response, true);
$events = is_array($payload) ? ($payload['items'] ?? []) : [];
json_response(['events' => $events, 'connected' => true]);
