<?php
require __DIR__ . '/bootstrap.php';
json_response(['categories' => [
    ['id' => 'signature-gradients', 'name' => 'Signature gradients', 'slug' => 'signature-gradients', 'createdAt' => gmdate('c'), 'updatedAt' => gmdate('c'), 'wallpapers' => [
        '/live-assets/wallpapers/aurora-blue.svg',
        '/live-assets/wallpapers/midnight-orbit.svg',
        '/live-assets/wallpapers/glass-sunrise.svg'
    ]]
], 'totalPages' => 1]);
