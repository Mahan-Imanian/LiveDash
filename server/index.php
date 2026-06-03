<?php
$config = require __DIR__ . '/api/config.php';
?><!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>LiveDash Cloud API</title>
  <style>
    :root { color-scheme: light; --ink:#152035; --muted:#66758b; --line:#dbe7f5; --brand:#5d6fff; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: var(--ink); background: radial-gradient(circle at 20% 10%, #fff 0 110px, transparent 300px), radial-gradient(circle at 82% 20%, rgba(127,200,255,.46), transparent 330px), linear-gradient(135deg, #c5e5ff, #f4fbff); display:grid; place-items:center; padding: 24px; }
    main { width: min(760px, 100%); border-radius: 34px; padding: 32px; background: rgba(255,255,255,.82); border: 1px solid rgba(255,255,255,.9); box-shadow: 0 32px 90px rgba(76,112,151,.20); backdrop-filter: blur(22px) saturate(1.15); }
    .mark { width: 58px; height: 58px; border-radius: 20px; display:block; box-shadow: 0 16px 32px rgba(93,111,255,.24); }
    h1 { margin: 18px 0 8px; font-size: clamp(32px, 5vw, 54px); letter-spacing: -.06em; line-height: .95; }
    p { margin: 0; color: var(--muted); font-size: 17px; line-height: 1.6; font-weight: 650; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 24px; }
    a, .pill { min-height: 52px; border-radius: 18px; background:#fff; border:1px solid var(--line); color:var(--ink); text-decoration:none; display:flex; align-items:center; justify-content:center; padding: 0 16px; font-weight:850; box-shadow: 0 12px 24px rgba(76,112,151,.10); }
    .pill { color: #15803d; }
    @media (max-width: 680px) { .grid { grid-template-columns:1fr; } main { padding: 22px; } }
  </style>
</head>
<body>
  <main>
    <img class="mark" src="/live-assets/logo.svg" alt="LiveDash">
    <h1>LiveDash Cloud API</h1>
    <p>Backend installed. Connect it to the Chrome extension to sync profile, dashboard state, bookmarks, tasks, notes, and local preferences.</p>
    <div class="grid">
      <a href="/api/health.php">Health check</a>
      <a href="/auth/google/start.php">Google auth</a>
      <span class="pill">Ready</span>
    </div>
  </main>
</body>
</html>
