<?php
require __DIR__ . '/bootstrap.php';
$mysqli = db($config);
$user = current_user($mysqli);
$uid = (int)$user['id'];
$name = $user['display_name'] ?: explode('@', $user['email'])[0];
$rewards = ensure_user_rewards($mysqli, $uid, (string)$user['email']);
$tz = $_GET['timezone'] ?? ($_SERVER['HTTP_X_LIVEDASH_TIMEZONE'] ?? '');
if (!$tz) $tz = 'UTC';
json_response([
    'email' => $user['email'],
    'phone' => null,
    'avatar' => $user['avatar_url'] ?: '',
    'username' => $rewards['referral_code'],
    'name' => $name,
    'verified' => true,
    'connections' => ['google'],
    'gender' => null,
    'friendshipStats' => ['accepted' => 0, 'pending' => 0],
    'wallpaper' => null,
    'theme' => null,
    'activity' => 'Using LiveDash Cloud',
    'isBirthDateEditable' => true,
    'birthDate' => null,
    'font' => 'Inter',
    'timeZone' => $tz,
    'coins' => $rewards['coins'],
    'referralCode' => $rewards['referral_code'],
    'city' => ['id' => 'auto', 'name' => 'Auto-detected'],
    'occupation' => ['id' => 'pro', 'label' => 'Professional'],
    'interests' => [],
    'joinedAt' => gmdate('c'),
    'progressbar' => [
        ['field' => 'connected', 'isDone' => true],
        ['field' => 'referral', 'isDone' => true],
        ['field' => 'backup', 'isDone' => true]
    ],
    'isProfileCompleted' => true,
    'hasTodayMood' => false
]);
