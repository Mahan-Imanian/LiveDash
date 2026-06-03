<?php
require __DIR__ . '/bootstrap.php';
$mysqli = db($config);
$user = current_user($mysqli);
$rewards = ensure_user_rewards($mysqli, (int)$user['id'], (string)$user['email']);
json_response(['referralCode' => $rewards['referral_code']]);
