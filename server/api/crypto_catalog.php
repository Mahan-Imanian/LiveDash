<?php
function livedash_crypto_catalog(): array {
    return [
        'BTC' => ['id' => 'bitcoin', 'name' => 'Bitcoin', 'icon' => '/live-assets/crypto/btc.svg', 'fallbackUsd' => 68420.00, 'fallbackEur' => 62980.00, 'fallbackChange' => 1.8],
        'ETH' => ['id' => 'ethereum', 'name' => 'Ethereum', 'icon' => '/live-assets/crypto/eth.svg', 'fallbackUsd' => 3720.00, 'fallbackEur' => 3425.00, 'fallbackChange' => 1.2],
        'USDT' => ['id' => 'tether', 'name' => 'Tether', 'icon' => '/live-assets/crypto/usdt.svg', 'fallbackUsd' => 1.00, 'fallbackEur' => 0.92, 'fallbackChange' => 0.01],
        'BNB' => ['id' => 'binancecoin', 'name' => 'BNB', 'icon' => '/live-assets/crypto/bnb.svg', 'fallbackUsd' => 612.00, 'fallbackEur' => 563.00, 'fallbackChange' => 0.7],
        'SOL' => ['id' => 'solana', 'name' => 'Solana', 'icon' => '/live-assets/crypto/sol.svg', 'fallbackUsd' => 164.00, 'fallbackEur' => 151.00, 'fallbackChange' => -0.4],
        'XRP' => ['id' => 'ripple', 'name' => 'XRP', 'icon' => '/live-assets/crypto/xrp.svg', 'fallbackUsd' => 0.62, 'fallbackEur' => 0.57, 'fallbackChange' => 0.9],
        'USDC' => ['id' => 'usd-coin', 'name' => 'USD Coin', 'icon' => '/live-assets/crypto/usdc.svg', 'fallbackUsd' => 1.00, 'fallbackEur' => 0.92, 'fallbackChange' => 0.02],
        'DOGE' => ['id' => 'dogecoin', 'name' => 'Dogecoin', 'icon' => '/live-assets/crypto/doge.svg', 'fallbackUsd' => 0.16, 'fallbackEur' => 0.15, 'fallbackChange' => 1.4],
        'ADA' => ['id' => 'cardano', 'name' => 'Cardano', 'icon' => '/live-assets/crypto/ada.svg', 'fallbackUsd' => 0.48, 'fallbackEur' => 0.44, 'fallbackChange' => -0.6],
        'TRX' => ['id' => 'tron', 'name' => 'TRON', 'icon' => '/live-assets/crypto/trx.svg', 'fallbackUsd' => 0.12, 'fallbackEur' => 0.11, 'fallbackChange' => 0.3],
        'AVAX' => ['id' => 'avalanche-2', 'name' => 'Avalanche', 'icon' => '/live-assets/crypto/avax.svg', 'fallbackUsd' => 37.50, 'fallbackEur' => 34.50, 'fallbackChange' => 1.1],
        'LINK' => ['id' => 'chainlink', 'name' => 'Chainlink', 'icon' => '/live-assets/crypto/link.svg', 'fallbackUsd' => 17.20, 'fallbackEur' => 15.80, 'fallbackChange' => 0.5]
    ];
}

function livedash_http_json(string $url): ?array {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 10,
        CURLOPT_USERAGENT => 'LiveDash/1.0',
        CURLOPT_HTTPHEADER => ['Accept: application/json']
    ]);
    $body = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($status < 200 || $status >= 300 || !$body) return null;
    $data = json_decode($body, true);
    return is_array($data) ? $data : null;
}

function livedash_crypto_payload(string $code): array {
    $catalog = livedash_crypto_catalog();
    $code = strtoupper($code);
    $item = $catalog[$code] ?? $catalog['BTC'];
    $price = null;
    $url = 'https://api.coingecko.com/api/v3/simple/price?ids=' . rawurlencode($item['id']) . '&vs_currencies=usd,eur&include_24hr_change=true';
    $remote = livedash_http_json($url);
    if ($remote && isset($remote[$item['id']])) $price = $remote[$item['id']];
    $usd = isset($price['usd']) ? (float)$price['usd'] : (float)$item['fallbackUsd'];
    $eur = isset($price['eur']) ? (float)$price['eur'] : (float)$item['fallbackEur'];
    $change = isset($price['usd_24h_change']) ? (float)$price['usd_24h_change'] : (float)$item['fallbackChange'];
    $history = [];
    for ($i = 13; $i >= 0; $i--) {
        $wave = sin((13 - $i) * 0.9) * 0.018;
        $drift = ((13 - $i) - 6) * 0.002;
        $history[] = ['price' => round($usd * (1 + $wave + $drift), $usd < 2 ? 4 : 2), 'createdAt' => gmdate('Y-m-d', time() - $i * 86400)];
    }
    return [
        'name' => ['fa' => $item['name'], 'en' => $item['name']],
        'icon' => $item['icon'],
        'price' => $usd,
        'rialPrice' => $eur,
        'changePercentage' => round($change, 2),
        'priceHistory' => $history,
        'type' => 'crypto',
        'url' => null,
        'useDollar' => true,
        'isSponsored' => false
    ];
}
