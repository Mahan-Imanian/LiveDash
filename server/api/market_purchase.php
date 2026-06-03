<?php
require __DIR__ . '/bootstrap.php';
json_response(['success' => true, 'message' => 'Purchased', 'remainingCoins' => 100]);
