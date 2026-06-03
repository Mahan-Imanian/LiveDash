<?php
require dirname(__DIR__) . '/bootstrap.php';
$mysqli = db($config);
$user = current_user($mysqli);
$uid = (int)$user['id'];
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
    $input = request_json();
    $state = $input['state'] ?? null;
    if (!is_array($state)) json_response(['ok' => false, 'error' => 'Missing state payload'], 422);
    $schema = (string)($input['schema'] ?? ($state['schema'] ?? '17'));
    $json = json_encode($state, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    $stmt = $mysqli->prepare('INSERT INTO livedash_dashboard_states (user_id, schema_version, state_json) VALUES (?, ?, CAST(? AS JSON)) ON DUPLICATE KEY UPDATE schema_version = VALUES(schema_version), state_json = VALUES(state_json), updated_at = CURRENT_TIMESTAMP');
    $stmt->bind_param('iss', $uid, $schema, $json);
    $stmt->execute();
    record_event($mysqli, $uid, 'backup_saved', []);
    json_response(['ok' => true, 'savedAt' => gmdate('c')]);
}
$stmt = $mysqli->prepare('SELECT schema_version, state_json, updated_at FROM livedash_dashboard_states WHERE user_id = ? LIMIT 1');
$stmt->bind_param('i', $uid);
$stmt->execute();
$row = $stmt->get_result()->fetch_assoc();
if (!$row) json_response(['ok' => true, 'state' => null]);
json_response(['ok' => true, 'schema' => $row['schema_version'], 'state' => json_decode($row['state_json'], true), 'updatedAt' => $row['updated_at']]);
