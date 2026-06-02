
(() => {
  const translations = [
    ['برنامه ها','Apps'], ['برنامه‌ها','Apps'], ['برنامه های','Apps'], ['برنامه','App'], ['مورد نیاز برای این روزا','Daily Essentials'], ['خدمات عمومی','Public Services'], ['ابزارها','Tools'], ['ابزار','Tool'], ['خدمات گوگل','Google Services'], ['هوش مصنوعی','AI'], ['سوشیال','Social'], ['سرگرمی','Entertainment'], ['تقویم','Calendar'], ['گوگل‌کلندر','Google Calendar'], ['مود روزانه','Daily mood'], ['تسک‌ها','Tasks'], ['تسک','Task'], ['ارزها','Crypto'], ['ارز','Crypto'], ['پومودورو','Pomodoro'], ['کار','Work'], ['استراحت','Break'], ['جستجو در گوگل','Search Google'], ['کانال تلگرام ما','Telegram Web'], ['دریافت آخرین اطلاع رسانی ها از طریق کانال تلگرامی ما','Open Telegram in your browser'], ['هیچ تسکی برای نمایش وجود ندارد','No tasks to show'], ['یک تسک جدید اضافه کنید یا فیلترها را تغییر دهید','Add a new task or adjust filters'], ['عنوان تسک جدید...','New task title...'], ['ورود با گوگل','Continue with Google'], ['درحال پردازش...','Connecting...'], ['ورود','Sign in'], ['ثبت نام','Sign up'], ['حساب کاربری','Account'], ['تنظیمات','Settings'], ['خروج','Sign out'], ['جعبه ابزار','Tools'], ['دور بازی','Games'], ['فالچین','Quick win'], ['دولت من','Gov services'], ['پلیس ۱۰+','Public safety'], ['خدمات قضایی','Legal services'], ['سامانه ثنا','Legal portal'], ['کالابرگ','Benefits'], ['رهگیری پست','Parcel tracking'], ['تیپاکس','Parcel tracking'], ['دیجی‌کالا','Amazon'], ['فیلم/سریال','YouTube'], ['فیلم / سریال','YouTube'], ['موسیقی','Spotify'], ['موزیک','Spotify'], ['دانلود بازی ۱','Steam'], ['دانلود بازی ۲','Epic Games'], ['بلیط قطار/اتوبوس/پرواز','Travel booking'], ['برنامه‌های کاربردی بنداز','Productivity apps'], ['نوشن','Notion'], ['مداحی','Spotify'], ['آپلود فایل','Dropbox'], ['ساخت ۹۸','Canva'], ['روبیکا','Slack'], ['دیجی‌کالا','Amazon'], ['دلار','Bitcoin'], ['یورو','Ethereum'], ['گرم','Solana'], ['تومان','USD'], ['ریال','USD'], ['تهران','London'], ['ایران','Europe'], ['آب و هوا','Weather'], ['نام کاربری','Username'], ['رمز عبور','Password'], ['ایمیل','Email'], ['شماره موبایل','Phone number'], ['نام','Name'], ['تایید کد','Verify code'], ['بازگشت','Back'], ['بستن','Close'], ['بعدی','Next'], ['قبلی','Previous'], ['رد کردن','Skip'], ['پایان','Finish'], ['شروع','Start'], ['ذخیره','Save'], ['حذف','Delete'], ['ویرایش','Edit'], ['افزودن','Add'], ['نمایش','Show'], ['مخفی','Hide'], ['جستجو','Search'], ['درحال بارگذاری','Loading'], ['خطا','Error'], ['موفق','Success']
  ];
  const persianDigits='۰۱۲۳۴۵۶۷۸۹'; const arabicDigits='٠١٢٣٤٥٦٧٨٩';
  const normalizeDigits = s => String(s).replace(/[۰-۹]/g, d => persianDigits.indexOf(d)).replace(/[٠-٩]/g, d => arabicDigits.indexOf(d));
  const monthMap = new Map([['فروردین','April'],['اردیبهشت','May'],['خرداد','June'],['تیر','July'],['مرداد','August'],['شهریور','September'],['مهر','October'],['آبان','November'],['آذر','December'],['دی','January'],['بهمن','February'],['اسفند','March']]);
  function clean(value) {
    let out = normalizeDigits(value || '');
    for (const [a,b] of translations) out = out.split(a).join(b);
    for (const [a,b] of monthMap) out = out.split(a).join(b);
    out = out.replace(/DashLive\s+DashLive/g,'DashLive');
    return out;
  }
  function textWalker(root=document.body) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let node;
    while ((node = walker.nextNode())) {
      const next = clean(node.nodeValue || '');
      if (next !== node.nodeValue) node.nodeValue = next;
    }
  }
  function patchLayout() {
    document.documentElement.lang='en'; document.documentElement.dir='ltr'; document.body.dir='ltr';
    document.querySelectorAll('[dir="rtl"]').forEach(el => el.setAttribute('dir','ltr'));
    document.querySelectorAll('input,textarea').forEach(el => { if (el.placeholder) el.placeholder = clean(el.placeholder); });
    document.querySelectorAll('a[href*="widgetify.ir"],a[href*="dashlive.ir"]').forEach(a => { a.href='https://livedash.codersays.com'; });
    document.querySelectorAll('img[src*="cdn.widgetify.ir/sites/google.png"]').forEach(img => { img.src='assets/google.svg'; });
    document.querySelectorAll('[class*="text-right"]').forEach(el => el.classList.remove('text-right'));
    document.querySelectorAll('span,div,h1,h2,h3,p,button,a,label').forEach(el => {
      if (el.childElementCount === 0 && /فروردین|اردیبهشت|خرداد|تیر|مرداد|شهریور|مهر|آبان|آذر|دی|بهمن|اسفند/.test(el.textContent || '')) {
        el.textContent = new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric'}).format(new Date());
      }
    });
  }
  function run() { textWalker(); patchLayout(); }
  let frame = 0; const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(run); };
  new MutationObserver(schedule).observe(document.documentElement, {childList:true, subtree:true, characterData:true});
  window.addEventListener('DOMContentLoaded', schedule); setTimeout(schedule, 300); setTimeout(schedule, 1200); setInterval(schedule, 3000);
  chrome?.storage?.local?.get(['livedashToken','auth_token','email','profile'], data => {
    const token = data.auth_token || data.livedashToken;
    if (token) chrome.storage.local.set({auth_token: token, livedashToken: token, signedIn: true});
  });
})();
