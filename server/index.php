<?php
require __DIR__ . '/bootstrap.php';
cors();

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

function catalog_payload(): array
{
    $icon = fn(string $domain) => 'https://www.google.com/s2/favicons?domain=' . rawurlencode($domain) . '&sz=64';
    return ['contents' => [
        ['id' => 'search-ai', 'category' => 'Search & AI', 'icon' => $icon('google.com'), 'badges' => [['label' => 'Daily', 'bgColor' => '#3158ff', 'textColor' => '#fff']], 'links' => [
            ['name' => 'Google', 'url' => 'https://www.google.com', 'type' => 'SITE', 'icon' => '/live-assets/google.svg', 'hasBorder' => false, 'isNew' => false],
            ['name' => 'ChatGPT', 'url' => 'https://chatgpt.com', 'type' => 'SITE', 'icon' => $icon('chatgpt.com'), 'hasBorder' => false, 'isNew' => false],
            ['name' => 'Perplexity', 'url' => 'https://www.perplexity.ai', 'type' => 'SITE', 'icon' => $icon('perplexity.ai'), 'hasBorder' => false, 'isNew' => false],
            ['name' => 'DeepL', 'url' => 'https://www.deepl.com/translator', 'type' => 'SITE', 'icon' => $icon('deepl.com'), 'hasBorder' => false, 'isNew' => false],
        ]],
        ['id' => 'productivity', 'category' => 'Productivity', 'icon' => $icon('notion.so'), 'badges' => [], 'links' => [
            ['name' => 'Notion', 'url' => 'https://www.notion.so', 'type' => 'SITE', 'icon' => $icon('notion.so'), 'hasBorder' => false, 'isNew' => false],
            ['name' => 'Gmail', 'url' => 'https://mail.google.com', 'type' => 'SITE', 'icon' => $icon('gmail.com'), 'hasBorder' => false, 'isNew' => false],
            ['name' => 'Calendar', 'url' => 'https://calendar.google.com', 'type' => 'SITE', 'icon' => $icon('calendar.google.com'), 'hasBorder' => false, 'isNew' => false],
            ['name' => 'Trello', 'url' => 'https://trello.com', 'type' => 'SITE', 'icon' => $icon('trello.com'), 'hasBorder' => false, 'isNew' => false],
        ]],
        ['id' => 'development', 'category' => 'Development', 'icon' => $icon('github.com'), 'badges' => [], 'links' => [
            ['name' => 'GitHub', 'url' => 'https://github.com', 'type' => 'SITE', 'icon' => $icon('github.com'), 'hasBorder' => false, 'isNew' => false],
            ['name' => 'Stack Overflow', 'url' => 'https://stackoverflow.com', 'type' => 'SITE', 'icon' => $icon('stackoverflow.com'), 'hasBorder' => false, 'isNew' => false],
            ['name' => 'MDN', 'url' => 'https://developer.mozilla.org', 'type' => 'SITE', 'icon' => $icon('developer.mozilla.org'), 'hasBorder' => false, 'isNew' => false],
            ['name' => 'Vercel', 'url' => 'https://vercel.com', 'type' => 'SITE', 'icon' => $icon('vercel.com'), 'hasBorder' => false, 'isNew' => false],
        ]],
    ]];
}

function market_payload(): array
{
    return ['totalPages' => 1, 'items' => [
        ['id' => 'title-focus', 'name' => 'Focus title', 'description' => 'A clean browser title for focused work sessions.', 'type' => 'BROWSER_TITLE', 'price' => 0, 'meta' => ['template' => 'LiveDash • Focus Mode'], 'previewUrl' => null, 'itemValue' => 'LiveDash • Focus Mode', 'isOwned' => true],
        ['id' => 'theme-glass', 'name' => 'Glass interface', 'description' => 'A translucent interface style with soft depth.', 'type' => 'THEME', 'price' => 0, 'meta' => new stdClass(), 'previewUrl' => null, 'itemValue' => 'glass', 'isOwned' => true],
        ['id' => 'theme-icy', 'name' => 'Icy blue', 'description' => 'A bright, calm theme tuned for blue wallpapers.', 'type' => 'THEME', 'price' => 0, 'meta' => new stdClass(), 'previewUrl' => null, 'itemValue' => 'icy', 'isOwned' => true],
        ['id' => 'font-system', 'name' => 'System UI', 'description' => 'A native, fast, platform-aligned dashboard font.', 'type' => 'FONT', 'price' => 0, 'meta' => new stdClass(), 'previewUrl' => null, 'itemValue' => 'system-ui', 'isOwned' => true],
    ]];
}

function wallpapers_payload(): array
{
    return ['totalPages' => 1, 'wallpapers' => [
        ['id' => 'aurora-blue', 'name' => 'Aurora Blue', 'type' => 'IMAGE', 'src' => '/live-assets/wallpapers/aurora-blue.svg', 'previewSrc' => '/live-assets/wallpapers/aurora-blue.svg', 'isOwned' => true, 'categoryId' => 'signature-gradients'],
        ['id' => 'midnight-orbit', 'name' => 'Midnight Orbit', 'type' => 'IMAGE', 'src' => '/live-assets/wallpapers/midnight-orbit.svg', 'previewSrc' => '/live-assets/wallpapers/midnight-orbit.svg', 'isOwned' => true, 'categoryId' => 'signature-gradients'],
    ]];
}

if ($method === 'GET' && $path === '/extension') {
    send_json(['logo' => ['id' => 'livedash', 'logoUrl' => '/live-assets/logo.svg', 'content' => null]]);
}

if ($method === 'GET' && $path === '/contents') {
    send_json(catalog_payload());
}

if ($method === 'GET' && $path === '/market') {
    send_json(market_payload());
}

if ($method === 'GET' && str_starts_with($path, '/wallpapers/categories')) {
    send_json(['categories' => [['id' => 'signature-gradients', 'name' => 'Signature gradients', 'slug' => 'signature-gradients', 'createdAt' => date('c'), 'updatedAt' => date('c')]], 'totalPages' => 1]);
}

if ($method === 'GET' && str_starts_with($path, '/wallpapers')) {
    send_json(wallpapers_payload());
}

if ($method === 'GET' && $path === '/extension/@me') {
    $user = current_user();
    if (!$user) {
        send_json(['message' => 'Unauthorized'], 401);
    }
    send_json(extension_profile($user));
}

if ($method === 'POST' && $path === '/auth/oauth/google') {
    $input = input_json();
    $google = google_user_from_access_token((string) ($input['token'] ?? ''));
    $user = upsert_google_user($google);
    $token = make_token($user);
    header('refresh_token: ' . make_token($user, 7776000));
    send_json(['statusCode' => 200, 'message' => null, 'data' => $token, 'isNewUser' => (bool) ($user['is_new'] ?? false)]);
}


if ($method === 'POST' && $path === '/google/connect') {
    $user = require_user();
    $input = input_json();
    $redirect = (string) ($input['redirectUri'] ?? '');
    if ($redirect === '') {
        send_json(['message' => 'Missing redirectUri'], 400);
    }
    send_json(['url' => google_auth_url($redirect, 'connect', (int) $user['id'])]);
}

if ($method === 'POST' && $path === '/google/disconnect') {
    $user = require_user();
    delete_google_connection((int) $user['id']);
    send_json(['success' => true]);
}

if ($method === 'GET' && $path === '/google/events') {
    $user = require_user();
    $start = (string) ($_GET['start'] ?? date('c'));
    $end = (string) ($_GET['end'] ?? '');
    send_json(['events' => google_calendar_events((int) $user['id'], $start, $end)]);
}

if ($method === 'POST' && $path === '/auth/refresh') {
    $input = input_json();
    $payload = read_token_from_string((string) ($input['refresh_token'] ?? ''));
    if (!$payload || empty($payload['sub'])) {
        send_json(['message' => 'Unauthorized'], 401);
    }
    $user = find_user_by_id((int) $payload['sub']);
    if (!$user) {
        send_json(['message' => 'Unauthorized'], 401);
    }
    send_json(['data' => make_token($user)]);
}

if ($method === 'POST' && $path === '/market/purchase') {
    send_json(['success' => true, 'message' => 'Purchased', 'remainingCoins' => 100]);
}

if ($method === 'POST' && $path === '/users/@me/complete-wizard') {
    send_json(['success' => true]);
}

send_json(['message' => 'Not found'], 404);
