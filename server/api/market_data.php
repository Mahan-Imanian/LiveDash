<?php
function livedash_market_items(): array {
    return [
        ['id'=>'theme-glass','name'=>'Glass Command','description'=>'Premium glass panels, crisp borders, and high-readability dashboard depth.','type'=>'THEME','price'=>0,'meta'=>['accent'=>'Cyan'],'previewUrl'=>null,'itemValue'=>'glass','isOwned'=>true],
        ['id'=>'theme-icy','name'=>'Nordic Blue','description'=>'Cool blue surfaces tuned for bright workspaces and daylight wallpapers.','type'=>'THEME','price'=>0,'meta'=>['accent'=>'Blue'],'previewUrl'=>null,'itemValue'=>'icy','isOwned'=>true],
        ['id'=>'theme-dark','name'=>'Midnight Core','description'=>'A serious low-light setup with stronger contrast and calmer glow.','type'=>'THEME','price'=>0,'meta'=>['accent'=>'Indigo'],'previewUrl'=>null,'itemValue'=>'dark','isOwned'=>true],
        ['id'=>'theme-light','name'=>'Daylight Pro','description'=>'A clean light interface with strong legibility and minimal visual noise.','type'=>'THEME','price'=>0,'meta'=>['accent'=>'Sky'],'previewUrl'=>null,'itemValue'=>'light','isOwned'=>true],
        ['id'=>'theme-amethyst','name'=>'Amethyst Desk','description'=>'Violet highlight system for creative and studio-focused dashboard layouts.','type'=>'THEME','price'=>0,'meta'=>['accent'=>'Violet'],'previewUrl'=>null,'itemValue'=>'glass','isOwned'=>true],
        ['id'=>'theme-graphite','name'=>'Graphite OS','description'=>'Neutral graphite chrome with subtle glass layers and controlled contrast.','type'=>'THEME','price'=>0,'meta'=>['accent'=>'Slate'],'previewUrl'=>null,'itemValue'=>'dark','isOwned'=>true],
        ['id'=>'title-focus','name'=>'Focus Mode','description'=>'A minimal browser title for deep work sessions.','type'=>'BROWSER_TITLE','price'=>0,'meta'=>['template'=>'LiveDash • Focus Mode'],'previewUrl'=>null,'itemValue'=>'LiveDash • Focus Mode','isOwned'=>true],
        ['id'=>'title-studio','name'=>'Studio Desk','description'=>'A polished title preset for creative workflows.','type'=>'BROWSER_TITLE','price'=>0,'meta'=>['template'=>'LiveDash Studio'],'previewUrl'=>null,'itemValue'=>'LiveDash Studio','isOwned'=>true],
        ['id'=>'title-command','name'=>'Command Center','description'=>'A sharp title for dashboards used as mission control.','type'=>'BROWSER_TITLE','price'=>0,'meta'=>['template'=>'LiveDash Command'],'previewUrl'=>null,'itemValue'=>'LiveDash Command','isOwned'=>true],
        ['id'=>'title-market','name'=>'Market Pulse','description'=>'A title preset for crypto, markets, and live signal workflows.','type'=>'BROWSER_TITLE','price'=>0,'meta'=>['template'=>'LiveDash • Market Pulse'],'previewUrl'=>null,'itemValue'=>'LiveDash • Market Pulse','isOwned'=>true],
        ['id'=>'title-europe','name'=>'Europe Desk','description'=>'A title preset tailored for EU users and global workflows.','type'=>'BROWSER_TITLE','price'=>0,'meta'=>['template'=>'LiveDash • Europe Desk'],'previewUrl'=>null,'itemValue'=>'LiveDash • Europe Desk','isOwned'=>true],
        ['id'=>'title-minimal','name'=>'Clean Tab','description'=>'Short, uncluttered browser title for minimal setups.','type'=>'BROWSER_TITLE','price'=>0,'meta'=>['template'=>'LiveDash'],'previewUrl'=>null,'itemValue'=>'LiveDash','isOwned'=>true],
        ['id'=>'font-system','name'=>'System UI','description'=>'A native, fast, platform-aligned dashboard font.','type'=>'FONT','price'=>0,'meta'=>['style'=>'Native'],'previewUrl'=>null,'itemValue'=>'system-ui','isOwned'=>true],
        ['id'=>'font-inter','name'=>'Inter','description'=>'A neutral interface font with excellent readability.','type'=>'FONT','price'=>0,'meta'=>['style'=>'Interface'],'previewUrl'=>null,'itemValue'=>'Inter','isOwned'=>true],
        ['id'=>'font-editorial','name'=>'Editorial Serif','description'=>'A refined serif option for a more editorial surface.','type'=>'FONT','price'=>0,'meta'=>['style'=>'Serif'],'previewUrl'=>null,'itemValue'=>'Georgia, serif','isOwned'=>true],
        ['id'=>'font-mono','name'=>'Mono Desk','description'=>'A precise mono-style look for technical workflows.','type'=>'FONT','price'=>0,'meta'=>['style'=>'Mono'],'previewUrl'=>null,'itemValue'=>'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace','isOwned'=>true],
        ['id'=>'font-rounded','name'=>'Rounded UI','description'=>'A softer dashboard feel using rounded system fonts where available.','type'=>'FONT','price'=>0,'meta'=>['style'=>'Rounded'],'previewUrl'=>null,'itemValue'=>'ui-rounded, system-ui, sans-serif','isOwned'=>true],
        ['id'=>'font-compact','name'=>'Compact Pro','description'=>'A tighter font stack for data-dense dashboard layouts.','type'=>'FONT','price'=>0,'meta'=>['style'=>'Compact'],'previewUrl'=>null,'itemValue'=>'Arial, Helvetica, sans-serif','isOwned'=>true]
    ];
}

function livedash_inventory_items(): array {
    return array_map(fn($item) => [
        'id' => $item['id'],
        'name' => $item['name'],
        'type' => $item['type'],
        'itemValue' => $item['itemValue']
    ], livedash_market_items());
}
