(() => {
  const persian = /[\u0600-\u06FF]/;
  const digitMap = {'\u06f0':'0','\u06f1':'1','\u06f2':'2','\u06f3':'3','\u06f4':'4','\u06f5':'5','\u06f6':'6','\u06f7':'7','\u06f8':'8','\u06f9':'9','\u0660':'0','\u0661':'1','\u0662':'2','\u0663':'3','\u0664':'4','\u0665':'5','\u0666':'6','\u0667':'7','\u0668':'8','\u0669':'9'};
  const phraseMap = new Map(Object.entries({
    '\u0648\u06cc\u062c\u062a\u06cc\u0641\u0627\u06cc':'DashLive','\u0648\u06cc\u062c\u06cc\u062a\u0641\u0627\u06cc':'DashLive','\u0628\u0631\u0646\u0627\u0645\u0647 \u0647\u0627':'Apps','\u0628\u0631\u0646\u0627\u0645\u0647‌\u0647\u0627':'Apps','\u0645\u0648\u0631\u062f \u0646\u06cc\u0627\u0632 \u0628\u0631\u0627\u06cc \u0627\u06cc\u0646 \u0631\u0648\u0632\u0627':'Daily Essentials','\u062e\u062f\u0645\u0627\u062a \u0639\u0645\u0648\u0645\u06cc':'Public Services','\u062e\u062f\u0645\u0627\u062a \u06af\u0648\u06af\u0644':'Google Services','\u0647\u0648\u0634 \u0645\u0635\u0646\u0648\u0639\u06cc':'AI','\u0633\u0648\u0634\u06cc\u0627\u0644':'Social','\u0633\u0631\u06af\u0631\u0645\u06cc':'Entertainment','\u0627\u0628\u0632\u0627\u0631\u0647\u0627':'Tools','\u062a\u0642\u0648\u06cc\u0645':'Calendar','\u06af\u0648\u06af\u0644‌\u06a9\u0644\u0646\u062f\u0631':'Google Calendar','\u0645\u0648\u062f \u0631\u0648\u0632\u0627\u0646\u0647':'Daily mode','\u0648\u0638\u0627\u06cc\u0641':'Tasks','\u062a\u0633\u06a9‌\u0647\u0627':'Tasks','\u06cc\u0627\u062f\u062f\u0627\u0634\u062a':'Notes','\u06cc\u0627\u062f\u062f\u0627\u0634\u062a‌\u0647\u0627':'Notes','\u062c\u0633\u062a\u062c\u0648 \u062f\u0631 \u06af\u0648\u06af\u0644':'Search Google','\u062c\u0633\u062a\u062c\u0648':'Search','\u0628\u0648\u06a9\u0645\u0627\u0631\u06a9 \u0645\u0631\u0648\u0631\u06af\u0631':'Browser bookmark','\u0627\u0631\u0632\u0647\u0627':'Rates','\u067e\u0648\u0645\u0648\u062f\u0648\u0631\u0648':'Pomodoro','\u06a9\u0627\u0631':'Work','\u0627\u0633\u062a\u0631\u0627\u062d\u062a':'Break','\u0622\u0628 \u0648 \u0647\u0648\u0627':'Weather','\u0634\u0628\u06a9\u0647':'Network','\u0627\u062e\u0628\u0627\u0631':'News','\u0648\u0631\u0648\u062f':'Sign in','\u0648\u0631\u0648\u062f \u0628\u0627 \u06af\u0648\u06af\u0644':'Continue with Google','\u0648\u0631\u0648\u062f \u0628\u0627 \u0631\u0645\u0632 \u0639\u0628\u0648\u0631':'Use password','\u0627\u06cc\u0645\u06cc\u0644':'Email','\u0631\u0645\u0632 \u0639\u0628\u0648\u0631':'Password','\u0634\u0645\u0627\u0631\u0647 \u0645\u0648\u0628\u0627\u06cc\u0644':'Phone number','\u062a\u0646\u0638\u06cc\u0645\u0627\u062a':'Settings','\u0638\u0627\u0647\u0631':'Appearance','\u0639\u0645\u0648\u0645\u06cc':'General','\u062d\u0631\u06cc\u0645 \u062e\u0635\u0648\u0635\u06cc':'Privacy','\u0645\u06cc\u0627\u0646\u0628\u0631\u0647\u0627':'Shortcuts','\u062f\u0631\u0628\u0627\u0631\u0647 \u0645\u0627':'About','\u062d\u0633\u0627\u0628 \u06a9\u0627\u0631\u0628\u0631\u06cc':'Account','\u0630\u062e\u06cc\u0631\u0647':'Save','\u062d\u0630\u0641':'Delete','\u0648\u06cc\u0631\u0627\u06cc\u0634':'Edit','\u0644\u063a\u0648':'Cancel','\u062a\u0627\u06cc\u06cc\u062f':'Confirm','\u0627\u062f\u0627\u0645\u0647':'Continue','\u0627\u0641\u0632\u0648\u062f\u0646':'Add','\u0634\u0631\u0648\u0639 \u06a9\u0646\u06cc\u062f':'Get Started','\u0628\u0633\u062a\u0646':'Close','\u0628\u0639\u062f\u06cc':'Next','\u0642\u0628\u0644\u06cc':'Back','\u0631\u062f \u06a9\u0631\u062f\u0646':'Skip','\u067e\u0627\u06cc\u0627\u0646':'Finish','\u0641\u0647\u0645\u06cc\u062f\u0645':'Got it','\u0627\u0645\u0631\u0648\u0632':'Today','\u0641\u0631\u062f\u0627':'Tomorrow','\u062f\u06cc\u0631\u0648\u0632':'Yesterday','\u0634\u0646\u0628\u0647':'Saturday','\u06cc\u06a9‌\u0634\u0646\u0628\u0647':'Sunday','\u062f\u0648\u0634\u0646\u0628\u0647':'Monday','\u0633\u0647‌\u0634\u0646\u0628\u0647':'Tuesday','\u0686\u0647\u0627\u0631\u0634\u0646\u0628\u0647':'Wednesday','\u067e\u0646\u062c‌\u0634\u0646\u0628\u0647':'Thursday','\u062c\u0645\u0639\u0647':'Friday','\u0698\u0627\u0646\u0648\u06cc\u0647':'January','\u0641\u0648\u0631\u06cc\u0647':'February','\u0645\u0627\u0631\u0633':'March','\u0622\u0648\u0631\u06cc\u0644':'April','\u0645\u0647':'May','\u0698\u0648\u0626\u0646':'June','\u0698\u0648\u0626\u06cc\u0647':'July','\u0627\u0648\u062a':'August','\u0633\u067e\u062a\u0627\u0645\u0628\u0631':'September','\u0627\u06a9\u062a\u0628\u0631':'October','\u0646\u0648\u0627\u0645\u0628\u0631':'November','\u062f\u0633\u0627\u0645\u0628\u0631':'December','\u062f\u0648\u0644\u062a \u0645\u0646':'USA.gov','\u062e\u062f\u0645\u0627\u062a \u0642\u0636\u0627\u06cc\u06cc':'Court Services','\u067e\u06cc\u06af\u06cc\u0631\u06cc \u067e\u0633\u062a':'USPS Tracking','\u067e\u0644\u06cc\u0633 10+':'Local Services','\u062f\u06cc\u062c\u06cc‌\u06a9\u0627\u0644\u0627':'Amazon','\u0645\u0648\u0633\u06cc\u0642\u06cc':'Music','\u0641\u06cc\u0644\u0645/\u0633\u0631\u06cc\u0627\u0644':'Video','\u0622\u067e\u0644\u0648\u062f \u0641\u0627\u06cc\u0644':'Upload file'}));
  const fallback = [
    [/\u062a\u0646\u0638\u06cc\u0645/i,'Settings'],[/\u062d\u0633\u0627\u0628|\u067e\u0631\u0648\u0641\u0627\u06cc\u0644/i,'Account'],[/\u062f\u0648\u0633\u062a/i,'Friends'],[/\u0648\u06cc\u062c\u062a/i,'Widgets'],[/\u0628\u0648\u06a9\u0645\u0627\u0631\u06a9/i,'Bookmarks'],[/\u062c\u0633\u062a\u062c\u0648/i,'Search'],[/\u062a\u0633\u06a9|\u0648\u0638\u06cc\u0641\u0647/i,'Tasks'],[/\u06cc\u0627\u062f\u062f\u0627\u0634\u062a/i,'Notes'],[/\u062a\u0642\u0648\u06cc\u0645/i,'Calendar'],[/\u0627\u0631\u0632/i,'Rates'],[/\u0622\u0628 \u0648 \u0647\u0648\u0627/i,'Weather'],[/\u0628\u0633\u062a\u0646/i,'Close'],[/\u0630\u062e\u06cc\u0631\u0647/i,'Save'],[/\u062d\u0630\u0641/i,'Delete'],[/\u0627\u0636\u0627\u0641\u0647|\u0627\u0641\u0632\u0648\u062f\u0646/i,'Add'],[/\u0648\u06cc\u0631\u0627\u06cc\u0634/i,'Edit'],[/\u0648\u0631\u0648\u062f/i,'Sign in'],[/\u0631\u0645\u0632/i,'Password'],[/\u0627\u06cc\u0645\u06cc\u0644/i,'Email'],[/\u062e\u0637\u0627/i,'Error'],[/\u0645\u0648\u0641\u0642/i,'Success'],[/\u0622\u067e\u0644\u0648\u062f/i,'Upload'],[/\u062f\u0627\u0646\u0644\u0648\u062f/i,'Download'],[/\u0646\u0645\u0627\u06cc\u0634/i,'Show'],[/\u0641\u0639\u0627\u0644/i,'Active'],[/\u063a\u06cc\u0631\u0641\u0639\u0627\u0644/i,'Disabled'],[/\u0628\u0639\u062f\u06cc/i,'Next'],[/\u0642\u0628\u0644\u06cc/i,'Back'],[/\u0631\u062f/i,'Skip']
  ];
  function normalize(value) {
    if (!value) return value;
    let text = value.replace(/[\u06f0-\u06f9\u0660-\u0669]/g, d => digitMap[d] || d).replace(/\u0648\u06cc\u062c\u062a\u06cc\u0641\u0627\u06cc|\u0648\u06cc\u062c\u06cc\u062a\u0641\u0627\u06cc|Widgetify|widgetify/g, 'DashLive');
    for (const [from, to] of phraseMap) text = text.split(from).join(to);
    if (!persian.test(text)) return text;
    for (const [rx, to] of fallback) if (rx.test(text)) return to;
    text = text.replace(/[\u0600-\u06FF]+/g, '').replace(/\s{2,}/g, ' ').trim();
    return text || 'DashLive';
  }
  function visit(node) {
    if (!node || node.nodeType !== Node.ELEMENT_NODE) return;
    node.dir = 'ltr';
    if (node.tagName === 'IMG') {
      const src = node.getAttribute('src') || '';
      if (src.includes('livedash.codersays.com') || src.includes('cdn.widgetify.ir') || src.includes('widgetify.ir')) node.src = chrome.runtime.getURL('assets/dashlive-logo.svg');
      if (src.includes('google.png')) node.src = chrome.runtime.getURL('assets/google.svg');
      if (src.includes('bookmark.png')) node.src = chrome.runtime.getURL('assets/bookmark.svg');
    }
    if (node.tagName === 'A') {
      const href = node.getAttribute('href') || '';
      const replacements = [
        ['digiato.com/feed','www.theverge.com/rss/index.xml'],['khabarfarsi.com/rss/top','feeds.bbci.co.uk/news/world/rss.xml'],['www.zoomit.ir/feed','feeds.bbci.co.uk/news/technology/rss.xml'],['www.varzesh3.com/rss/all','www.espn.com/espn/rss/news'],['widgetify.ir','livedash.codersays.com'],['dashlive.ir','livedash.codersays.com']
      ];
      let next = href;
      for (const [a,b] of replacements) next = next.replace(a,b);
      if (next !== href) node.setAttribute('href', next);
    }
    for (const attr of ['aria-label','title','placeholder','alt','value']) {
      if (node.hasAttribute(attr)) {
        const old = node.getAttribute(attr);
        const next = normalize(old);
        if (next !== old) node.setAttribute(attr, next);
      }
    }
  }
  function walk(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    let node;
    while ((node = walker.nextNode())) {
      if (node.nodeType === Node.TEXT_NODE) {
        const old = node.nodeValue;
        const next = normalize(old);
        if (old !== next) node.nodeValue = next;
      } else visit(node);
    }
  }
  function seedDefaults() {
    try {
      document.documentElement.lang = 'en';
      document.documentElement.dir = 'ltr';
      document.title = 'DashLive New Tab';
      if (chrome?.storage?.local) chrome.storage.local.set({
        showWelcomeModal: false,
        browserTitle: { template: 'DashLive New Tab' },
        generalSettings: { selected_timezone: { label: 'Europe / London', value: 'Europe/London', offset: '+00:00' }, blurMode: false, analyticsEnabled: false }
      });
    } catch {}
  }
  function run() { seedDefaults(); walk(document.documentElement); }
  const mo = new MutationObserver(mutations => {
    for (const m of mutations) {
      for (const n of m.addedNodes) {
        if (n.nodeType === Node.TEXT_NODE) {
          const next = normalize(n.nodeValue); if (next !== n.nodeValue) n.nodeValue = next;
        } else if (n.nodeType === Node.ELEMENT_NODE) walk(n);
      }
      if (m.type === 'characterData') {
        const next = normalize(m.target.nodeValue); if (next !== m.target.nodeValue) m.target.nodeValue = next;
      }
    }
  });
  document.addEventListener('DOMContentLoaded', () => { run(); mo.observe(document.body, { childList: true, subtree: true, characterData: true }); });
  setTimeout(run, 500); setTimeout(run, 1500); setInterval(run, 4000);
})();
