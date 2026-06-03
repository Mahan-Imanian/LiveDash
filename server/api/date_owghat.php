<?php
require __DIR__ . '/bootstrap.php';
$lat = isset($_GET['lat']) ? (float)$_GET['lat'] : 51.5072;
$lon = isset($_GET['lon']) ? (float)$_GET['lon'] : (isset($_GET['lan']) ? (float)$_GET['lan'] : -0.1276);
$day = isset($_GET['day']) ? max(1, min(31, (int)$_GET['day'])) : (int)gmdate('j');
$month = isset($_GET['month']) ? max(1, min(12, (int)$_GET['month'])) : (int)gmdate('n');
$base = strtotime(gmdate('Y') . '-' . str_pad((string)$month, 2, '0', STR_PAD_LEFT) . '-' . str_pad((string)$day, 2, '0', STR_PAD_LEFT) . ' 12:00:00 UTC');
$season = sin((($month - 1) / 12) * 2 * pi());
$longitudeOffset = (int)round($lon / 15 * 60);
$shift = max(-70, min(70, (int)round(($lat - 45) * 1.6))) + (int)round($season * 18);
function tstr(int $minutes): string { $minutes = (($minutes % 1440) + 1440) % 1440; return sprintf('%02d:%02d', intdiv($minutes, 60), $minutes % 60); }
$noon = 12 * 60 - $longitudeOffset;
json_response([
    'azan_sobh' => tstr($noon - 430 - $shift),
    'tolu_aftab' => tstr($noon - 335 - (int)round($shift * .6)),
    'azan_zohr' => tstr($noon + 4),
    'ghorub_aftab' => tstr($noon + 335 + (int)round($shift * .6)),
    'azan_maghreb' => tstr($noon + 354 + (int)round($shift * .6)),
    'nimeshab' => tstr($noon + 720)
]);
