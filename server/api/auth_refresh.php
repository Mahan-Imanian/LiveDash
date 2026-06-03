<?php
require __DIR__ . '/bootstrap.php';
$input = request_json();
$token = (string)($input['refresh_token'] ?? bearer_token());
$mysqli = db($config);
$user = user_from_token($mysqli, $token);
if (!$user) json_response(['statusCode' => 401, 'message' => 'Unauthorized', 'data' => null], 401);
$newToken = issue_token($mysqli, (int)$user['id']);
header('refresh_token: ' . $newToken);
json_response(['statusCode' => 200, 'message' => null, 'data' => $newToken]);
