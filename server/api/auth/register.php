<?php
require dirname(__DIR__) . '/bootstrap.php';
$input = request_json();
$email = (string)($input['email'] ?? '');
$password = (string)($input['password'] ?? '');
if (strlen($password) < 8) json_response(['ok' => false, 'error' => 'Password must be at least 8 characters'], 422);
$mysqli = db($config);
$user = upsert_user_by_email($mysqli, $email, $password, $input['displayName'] ?? null);
$token = issue_token($mysqli, (int)$user['id']);
record_event($mysqli, (int)$user['id'], 'register', ['client' => $input['client'] ?? 'unknown']);
json_response(['ok' => true, 'token' => $token, 'user' => ['id' => (int)$user['id'], 'email' => $user['email'], 'displayName' => $user['display_name'] ?? null]]);
