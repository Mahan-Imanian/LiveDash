<?php
require __DIR__ . '/bootstrap.php';
json_response([
    'fonts' => [
        ['id' => 'font-system', 'type' => 'FONT', 'name' => 'System UI', 'value' => 'system-ui', 'previewUrl' => null],
        ['id' => 'font-inter', 'type' => 'FONT', 'name' => 'Inter', 'value' => 'Inter', 'previewUrl' => null]
    ],
    'browser_titles' => [
        ['id' => 'title-focus', 'type' => 'BROWSER_TITLE', 'name' => 'Focus title', 'value' => 'LiveDash • Focus Mode', 'previewUrl' => null],
        ['id' => 'title-studio', 'type' => 'BROWSER_TITLE', 'name' => 'Studio title', 'value' => 'LiveDash Studio', 'previewUrl' => null]
    ],
    'themes' => [
        ['id' => 'theme-glass-pro', 'type' => 'THEME', 'name' => 'Glass Pro', 'value' => 'glass', 'previewUrl' => null],
        ['id' => 'theme-icy-focus', 'type' => 'THEME', 'name' => 'Icy Focus', 'value' => 'icy', 'previewUrl' => null]
    ],
    'pagination' => ['totalPages' => 1, 'total' => 6]
]);
