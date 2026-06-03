<?php
require __DIR__ . '/bootstrap.php';
$mysqli = db($config);
$user = current_user($mysqli);
$uid = (int)$user['id'];
$stmt = $mysqli->prepare('DELETE FROM livedash_google_connections WHERE user_id = ?');
$stmt->bind_param('i', $uid);
$stmt->execute();
record_event($mysqli, $uid, 'google_calendar_disconnected', []);
json_response(['ok' => true, 'connected' => false]);
