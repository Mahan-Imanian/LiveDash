<?php
require dirname(__DIR__) . '/bootstrap.php';
$input = request_json();
$email = (string)($input['email'] ?? '');
$password = (string)($input['password'] ?? '');
$mysqli = db($config);
$user = upsert_user_by_email($mysqli, $email, $password ?: null);
$token = issue_token($mysqli, (int)$user['id']);
record_event($mysqli, (int)$user['id'], 'sign_in', ['client' => $input['client'] ?? 'unknown']);
json_response(['ok' => true, 'token' => $token, 'user' => ['id' => (int)$user['id'], 'email' => $user['email'], 'displayName' => $user['display_name'] ?? null, 'avatarUrl' => $user['avatar_url'] ?? null]]);
