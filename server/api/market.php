<?php
require __DIR__ . '/bootstrap.php';
require __DIR__ . '/market_data.php';
$type = $_GET['type'] ?? '';
$items = livedash_market_items();
if ($type !== '') $items = array_values(array_filter($items, fn($item) => $item['type'] === $type));
json_response(['totalPages' => 1, 'items' => $items]);
