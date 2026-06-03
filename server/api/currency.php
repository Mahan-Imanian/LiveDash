<?php
require __DIR__ . '/bootstrap.php';
require __DIR__ . '/crypto_catalog.php';
$code = strtoupper((string)($_GET['code'] ?? 'BTC'));
json_response(livedash_crypto_payload($code));
