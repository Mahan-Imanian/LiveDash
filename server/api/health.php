<?php
require __DIR__ . '/bootstrap.php';
try {
    $mysqli = db($config);
    $mysqli->query('SELECT 1');
    json_response(['ok' => true, 'service' => 'LiveDash API', 'version' => '17.0.0']);
} catch (Throwable $e) {
    json_response(['ok' => false, 'error' => 'Database connection failed'], 500);
}
