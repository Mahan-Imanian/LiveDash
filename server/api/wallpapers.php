<?php
require __DIR__ . '/bootstrap.php';
$wallpapers = [
    ['id' => 'aurora-blue', 'name' => 'Aurora Blue', 'type' => 'IMAGE', 'src' => '/live-assets/wallpapers/aurora-blue.svg', 'previewSrc' => '/live-assets/wallpapers/aurora-blue.svg', 'isOwned' => true, 'categoryId' => 'signature-gradients'],
    ['id' => 'midnight-orbit', 'name' => 'Midnight Orbit', 'type' => 'IMAGE', 'src' => '/live-assets/wallpapers/midnight-orbit.svg', 'previewSrc' => '/live-assets/wallpapers/midnight-orbit.svg', 'isOwned' => true, 'categoryId' => 'signature-gradients'],
    ['id' => 'glass-sunrise', 'name' => 'Glass Sunrise', 'type' => 'IMAGE', 'src' => '/live-assets/wallpapers/glass-sunrise.svg', 'previewSrc' => '/live-assets/wallpapers/glass-sunrise.svg', 'isOwned' => true, 'categoryId' => 'signature-gradients'],
    ['id' => 'northern-grid', 'name' => 'Northern Grid', 'type' => 'IMAGE', 'src' => '/live-assets/wallpapers/northern-grid.svg', 'previewSrc' => '/live-assets/wallpapers/northern-grid.svg', 'isOwned' => true, 'categoryId' => 'signature-gradients']
];
json_response(['wallpapers' => $wallpapers, 'totalPages' => 1]);
