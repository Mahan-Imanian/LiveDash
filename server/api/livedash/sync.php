<?php
require dirname(__DIR__) . '/bootstrap.php';
$mysqli = db($config);
$user = current_user($mysqli);
$input = request_json();
$state = $input['state'] ?? null;
if (!is_array($state)) json_response(['ok' => false, 'error' => 'Missing state payload'], 422);
$schema = (string)($input['schema'] ?? ($state['schema'] ?? '17'));
$json = json_encode($state, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
$uid = (int)$user['id'];
$stmt = $mysqli->prepare('INSERT INTO livedash_dashboard_states (user_id, schema_version, state_json) VALUES (?, ?, CAST(? AS JSON)) ON DUPLICATE KEY UPDATE schema_version = VALUES(schema_version), state_json = VALUES(state_json), updated_at = CURRENT_TIMESTAMP');
$stmt->bind_param('iss', $uid, $schema, $json);
$stmt->execute();
record_event($mysqli, $uid, 'sync', ['reason' => $input['reason'] ?? 'unknown']);
json_response(['ok' => true, 'syncedAt' => gmdate('c')]);
