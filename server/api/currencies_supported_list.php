<?php
require __DIR__ . '/bootstrap.php';
require __DIR__ . '/crypto_catalog.php';
$list = [];
foreach (livedash_crypto_catalog() as $code => $item) {
    $list[] = [
        'key' => $code,
        'type' => 'crypto',
        'country' => 'Global',
        'label' => ['fa' => $item['name'], 'en' => $item['name']],
        'changePercentage' => $item['fallbackChange']
    ];
}
json_response($list);
