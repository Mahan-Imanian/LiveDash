<?php
require dirname(__DIR__, 2) . '/bootstrap.php';
cors();
$redirect = $_GET['redirect_uri'] ?? '';
if (!$redirect) {
    send_json(['message' => 'Missing redirect_uri'], 400);
}
header('Location: ' . google_auth_url($redirect, 'login'));
exit;
