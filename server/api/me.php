<?php
require __DIR__ . '/bootstrap.php';
$mysqli = db($config);
$user = current_user($mysqli);
$uid = (int)$user['id'];
$stmt = $mysqli->prepare('SELECT schema_version, state_json, updated_at FROM livedash_dashboard_states WHERE user_id = ? LIMIT 1');
$stmt->bind_param('i', $uid);
$stmt->execute();
$row = $stmt->get_result()->fetch_assoc();
$events = [];
$eventStmt = $mysqli->prepare('SELECT event_type, event_body, created_at FROM livedash_events WHERE user_id = ? ORDER BY created_at DESC LIMIT 12');
$eventStmt->bind_param('i', $uid);
$eventStmt->execute();
$result = $eventStmt->get_result();
while ($event = $result->fetch_assoc()) {
    $events[] = [
        'type' => $event['event_type'],
        'body' => json_decode((string)($event['event_body'] ?? '{}'), true) ?: [],
        'createdAt' => $event['created_at']
    ];
}
json_response([
    'ok' => true,
    'user' => [
        'id' => $uid,
        'email' => $user['email'],
        'displayName' => $user['display_name'] ?: null,
        'avatarUrl' => $user['avatar_url'] ?: null
    ],
    'state' => $row ? json_decode($row['state_json'], true) : null,
    'schema' => $row['schema_version'] ?? null,
    'stateUpdatedAt' => $row['updated_at'] ?? null,
    'events' => $events
]);
