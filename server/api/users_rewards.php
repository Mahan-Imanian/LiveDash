<?php
require __DIR__ . '/bootstrap.php';
$mysqli = db($config);
$user = current_user($mysqli);
$rewards = ensure_user_rewards($mysqli, (int)$user['id'], (string)$user['email']);
json_response([
    'code' => $rewards['referral_code'],
    'referrals' => [],
    'totalPages' => 1,
    'totalCount' => 0,
    'tasks' => [
        ['task' => 'Create your LiveDash account', 'reward_coin' => '100', 'isDone' => true, 'icon' => '/live-assets/livecoin.svg'],
        ['task' => 'Connect Google', 'reward_coin' => '50', 'isDone' => true, 'icon' => '/live-assets/google.svg'],
        ['task' => 'Invite a friend with your referral code', 'reward_coin' => '250', 'isDone' => false, 'icon' => '/live-assets/livecoin.svg']
    ]
]);
