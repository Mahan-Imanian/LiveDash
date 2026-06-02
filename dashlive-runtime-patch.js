(() => {
  const BRAND = 'DashLive';
  const MAP = new Map([
    ['Widgetify', BRAND], ['ویجتیفای', BRAND], ['ویجتيفای', BRAND], ['ویجتیفای', BRAND],
    ['برنامه ها','Apps'], ['برنامه‌ها','Apps'], ['برنامه های','Apps'], ['برنامه','App'], ['مورد نیاز برای این روزا','Daily Essentials'],
    ['خدمات عمومی','Public Services'], ['ابزارها','Tools'], ['ابزار','Tool'], ['خدمات گوگل','Google Services'], ['هوش مصنوعی','AI'],
    ['سوشیال','Social'], ['سرگرمی','Entertainment'], ['تقویم','Calendar'], ['گوگل‌کلندر','Google Calendar'], ['مود روزانه','Daily mood'],
    ['تسک‌ها','Tasks'], ['تسک','Task'], ['ارزها','Crypto'], ['ارز','Crypto'], ['پومودورو','Pomodoro'], ['کار','Work'], ['استراحت','Break'],
    ['جستجو در گوگل','Search Google'], ['کانال تلگرام ما','Telegram Web'], ['دریافت آخرین اطلاع رسانی ها از طریق کانال تلگرامی ما','Open Telegram in your browser'],
    ['هیچ تسکی برای نمایش وجود ندارد','No tasks to show'], ['یک تسک جدید اضافه کنید یا فیلترها را تغییر دهید','Add a new task or adjust filters'], ['عنوان تسک جدید...','New task title...'],
    ['ورود با گوگل','Continue with Google'], ['درحال پردازش...','Connecting...'], ['ورود','Sign in'], ['ثبت نام','Sign up'], ['حساب کاربری','Account'], ['تنظیمات','Settings'], ['خروج','Sign out'],
    ['جعبه ابزار','Tools'], ['دور بازی','Games'], ['فالچین','Quick win'], ['دولت من','Government services'], ['پلیس 10+','Public safety'], ['پلیس ۱۰+','Public safety'], ['خدمات قضایی','Legal services'], ['سامانه ثنا','Legal portal'], ['کالابرگ','Benefits'], ['رهگیری پست','Parcel tracking'], ['تیپاکس','DHL'],
    ['دیجی‌کالا','Amazon'], ['فیلم/سریال','YouTube'], ['فیلم / سریال','YouTube'], ['موسیقی','Spotify'], ['موزیک','Spotify'], ['دانلود بازی 1','Steam'], ['دانلود بازی ۱','Steam'], ['دانلود بازی 2','Epic Games'], ['دانلود بازی ۲','Epic Games'], ['بلیط قطار/اتوبوس/پرواز','Travel booking'], ['برنامه‌های کاربردی بنداز','Productivity apps'], ['نوشن','Notion'], ['مداحی','Spotify'], ['آپلود فایل','Dropbox'], ['ساخت 98','Canva'], ['ساخت ۹۸','Canva'], ['روبیکا','Slack'],
    ['دلار','Bitcoin'], ['یورو','Ethereum'], ['گرم','Solana'], ['تومان','USD'], ['ریال','USD'], ['تهران','London'], ['ایران','Europe'], ['آب و هوا','Weather'],
    ['نام کاربری','Username'], ['Name Workبری','Username'], ['Workبری','user'], ['واSkip Name','Username'], ['رمز عبور','Password'], ['ایمیل','Email'], ['شماره موبایل','Phone number'], ['نام','Name'], ['تایید کد','Verify code'],
    ['بازگشت','Back'], ['بستن','Close'], ['بعدی','Next'], ['قبلی','Previous'], ['رد کردن','Skip'], ['پایان','Finish'], ['شروع','Start'], ['ذخیره','Save'], ['حذف','Delete'], ['ویرایش','Edit'], ['افزودن','Add'], ['نمایش','Show'], ['مخفی','Hide'], ['جستجو','Search'], ['درحال بارگذاری','Loading'], ['خطا','Error'], ['موفق','Success'],
    ['فارسی','English'], ['امروز','Today'], ['فردا','Tomorrow'], ['همه','All'], ['اهمیت','Priority'], ['موجودی','Balance'], ['موجوJanuary','Balance'], ['ویج‌کوین','credits'], ['پیشفرض','Default'], ['پیش‌Show','Preview'],
    ['آمار یوتیوب','YouTube stats'], ['ارسال پیشنهاد و انتقاد','Send feedback'], ['امکانات:','Features:'], ['انتخاب استیکر (اختیاری)','Choose sticker (optional)'], ['بازخورد','Feedback'], ['برای آپلود از سیستم کلیک کنید','Click to upload from your device'], ['به DashLive خوش آمJanuaryد!','Welcome to DashLive!'], ['خوش اومJanuary!','Welcome!'], ['به چی علاقه داری؟','What are you interested in?'], ['تصویر زمینه فعال','Active wallpaper'], ['حمایت مالی','Support development'], ['گیت‌هاب','GitHub'], ['وب‌سایت','Website'], ['مشاهده سایت رسمی','Open official site'], ['مشاهده کد منبع','View source code'], ['وظیفه‌ای برای این روز وجود نداشته باشد','No task is scheduled for today'], ['چه Workه‌ای؟','What do you do?'],
    ['در حال برگزاری','In progress'], ['موجودی ناکافی','Insufficient balance'], ['ممکن است آیکون بوکمارک Save نشود','Bookmark icon may not be saved'], ['ثانیه','seconds'], ['دقیقه','minute'], ['ساعت','hour']
  ]);
  const MONTHS = new Map([['فروردین','April'],['اردیبهشت','May'],['خرداد','June'],['تیر','July'],['مرداد','August'],['شهریور','September'],['مهر','October'],['آبان','November'],['آذر','December'],['دی','January'],['بهمن','February'],['اسفند','March']]);
  const pd='۰۱۲۳۴۵۶۷۸۹'; const ad='٠١٢٣٤٥٦٧٨٩';
  const hasPersian = (v) => /[\u0600-\u06FF]/.test(String(v || ''));
  function digits(s){ return String(s ?? '').replace(/[۰-۹]/g,d=>pd.indexOf(d)).replace(/[٠-٩]/g,d=>ad.indexOf(d)); }
  function clean(value) {
    let out = digits(value);
    for (const [a,b] of MAP) out = out.split(a).join(b);
    for (const [a,b] of MONTHS) out = out.split(a).join(b);
    out = out.replace(/DashLive\s+DashLive/g, 'DashLive').replace(/\bWorkبری\b/g, 'user').replace(/January/g, '');
    if (hasPersian(out)) {
      if (/نام|کاربری|Workبری/.test(out)) out = 'Username';
      else if (/رمز|Password/.test(out)) out = 'Password';
      else if (/ایمیل|Email/.test(out)) out = 'Email';
      else if (/تسک|وظیفه/.test(out)) out = 'Tasks';
      else if (/تقویم|ماه|شنبه|یک|دو|سه|چهار|پنج|جمعه/.test(out)) out = new Intl.DateTimeFormat('en-US',{weekday:'long', month:'long', day:'numeric'}).format(new Date());
      else if (/حساب|ورود|ثبت/.test(out)) out = 'Account';
      else if (/تنظیم|ظاهر|رنگ/.test(out)) out = 'Settings';
      else if (/بوکمارک|لینک/.test(out)) out = 'Bookmarks';
      else if (/ارز|قیمت|موجود/.test(out)) out = 'Crypto';
      else out = 'DashLive';
    }
    return out;
  }
  function patchTree(root=document.body) {
    document.documentElement.lang='en'; document.documentElement.dir='ltr'; document.body.dir='ltr';
    document.querySelectorAll('[dir="rtl"]').forEach(el => el.setAttribute('dir','ltr'));
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let node;
    while ((node = walker.nextNode())) {
      const next = clean(node.nodeValue || '');
      if (next !== node.nodeValue) node.nodeValue = next;
    }
    document.querySelectorAll('[placeholder],[title],[aria-label],[alt]').forEach(el => {
      for (const attr of ['placeholder','title','aria-label','alt']) if (el.hasAttribute(attr)) {
        const next = clean(el.getAttribute(attr)); if (next !== el.getAttribute(attr)) el.setAttribute(attr, next);
      }
    });
    document.querySelectorAll('a[href*="widgetify.ir"],a[href*="dashlive.ir"],a[href*="digikala"],a[href*="rubika"],a[href*="tipax"],a[href*="khabarfarsi"],a[href*="varzesh3"],a[href*="zoomit.ir"]').forEach(a => { a.href='https://livedash.codersays.com'; });
    document.querySelectorAll('[class*="text-right"],[class*="rtl"]').forEach(el => { el.classList.remove('text-right'); el.classList.remove('rtl'); });
  }
  function patchStorage() {
    chrome?.storage?.local?.get(['livedashToken','auth_token','email','profile'], data => {
      const token = data.auth_token || data.livedashToken;
      if (token) chrome.storage.local.set({auth_token: token, livedashToken: token, signedIn: true});
    });
  }
  let frame = 0;
  function schedule(){ cancelAnimationFrame(frame); frame = requestAnimationFrame(() => patchTree()); }
  new MutationObserver(schedule).observe(document.documentElement, {childList:true, subtree:true, characterData:true, attributes:true});
  window.addEventListener('DOMContentLoaded', () => { patchStorage(); schedule(); });
  setTimeout(schedule, 50); setTimeout(schedule, 300); setTimeout(schedule, 1000); setInterval(schedule, 2500);
})();
