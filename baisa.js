/* Baisa - FAQ chatbot widget for ghanaugarh.co.in
 * One file, no dependencies. Works in two layers:
 *   1. Built-in FAQ answers (instant, free, no server needed)
 *   2. Optional AI answers through your Cloudflare Worker (set endpoint below)
 *
 * Add before </body>:
 *   <script>window.BAISA_CONFIG={endpoint:"https://YOUR-WORKER.workers.dev"};</script>
 *   <script src="/baisa.js" charset="utf-8" defer></script>
 */
(function () {
  'use strict';
  if (window.__baisaLoaded) return;
  window.__baisaLoaded = true;

  var script = document.currentScript;
  var base = script && script.src ? script.src.replace(/[^\/]*$/, '') : '/';
  var CFG = Object.assign({
    endpoint: '',                 // Cloudflare Worker URL (leave '' to use built-in FAQs only)
    avatar: base + 'baisa.jpg',   // avatar image
    side: 'right',                // 'right' or 'left'
    bottom: 150,                  // px from bottom (kept above the tree's zoom buttons)
    lang: 'hi'                    // starting language: 'hi' or 'en'
  }, window.BAISA_CONFIG || {});

  var store = {
    get: function (k) { try { return window.sessionStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { window.sessionStorage.setItem(k, v); } catch (e) {} }
  };
  var lang = (store.get('baisa-lang') || CFG.lang) === 'en' ? 'en' : 'hi';

  /* ---------- Text ---------- */
  var T = {
    hi: {
      title: 'बाईसा',
      sub: 'वंशावली सहायक',
      greet: 'खम्मा घणी सा! मैं बाईसा हूँ। इस वंशावली साइट को इस्तेमाल करने से जुड़े सवाल पूछिए।',
      pick: 'नीचे से सवाल चुनिए या अपना सवाल लिखिए।',
      placeholder: 'अपना सवाल लिखिए…',
      send: 'भेजें',
      faqBtn: 'सवाल',
      open: 'बाईसा से पूछिए',
      close: 'बंद करें',
      toggle: 'EN',
      toggleLabel: 'Switch to English',
      typing: 'बाईसा लिख रही हैं…',
      note: 'यह AI सहायक है। वंश की जानकारी के लिए रिकॉर्ड-कीपर से पूछिए: मेनू → Request।',
      noAnswer: 'इसका जवाब मेरे पास नहीं है। कृपया मेनू → Request से रिकॉर्ड-कीपर को लिखिए, या नीचे दिए सवालों में से चुनिए।',
      error: 'अभी जवाब नहीं मिल पाया। थोड़ी देर बाद फिर कोशिश कीजिए, या मेनू → Request से रिकॉर्ड-कीपर को लिखिए।',
      more: 'और सवाल:'
    },
    en: {
      title: 'Baisa',
      sub: 'Family tree guide',
      greet: 'Khamma Ghani Sa! I am Baisa. Ask me anything about using this family-tree site.',
      pick: 'Pick a question below or type your own.',
      placeholder: 'Type your question…',
      send: 'Send',
      faqBtn: 'FAQs',
      open: 'Ask Baisa',
      close: 'Close',
      toggle: 'हिं',
      toggleLabel: 'हिंदी में बदलें',
      typing: 'Baisa is typing…',
      note: 'AI guide. For lineage facts, ask the record keeper: Menu → Request.',
      noAnswer: 'I do not have an answer for that. Please write to the record keeper from Menu → Request, or pick one of the questions below.',
      error: 'Could not get an answer right now. Please try again shortly, or write to the record keeper from Menu → Request.',
      more: 'More questions:'
    }
  };

  /* ---------- Built-in FAQs (edit freely) ---------- */
  var FAQ = [
    {
      id: 'search',
      q: { hi: 'नाम कैसे खोजें?', en: 'How do I search a name?' },
      a: {
        hi: 'कीबोर्ड पर / दबाइए या ऊपर लेंस (🔍) आइकन पर टैप कीजिए। हिंदी या अंग्रेज़ी, दोनों में लिख सकते हैं, जैसे “bhawar singh” या “raam”। नतीजों में हिंदी नाम दिखेंगे।',
        en: 'Press / on your keyboard or tap the lens icon at the top. You can type in Hindi or English, for example “bhawar singh” or “raam”. Results show the Hindi names.'
      },
      k: ['search', 'find', 'lens', 'खोज', 'ढूंढ', 'ढूँढ', 'सर्च']
    },
    {
      id: 'add',
      q: { hi: 'नाम जोड़ना या सुधारना है', en: 'How do I add or correct a name?' },
      a: {
        hi: 'मेनू (तीन लाइन) → Request खोलिए, या किसी व्यक्ति के कार्ड में “✎ Suggest change” दबाइए। फ़ॉर्म में चुनिए कि नाम जोड़ना है, सही करना है, शाखा जोड़नी है या गलत प्रविष्टि हटवानी है। आपका नाम ज़रूरी है; फ़ोन और ईमेल वैकल्पिक हैं। अनुरोध परिवार के रिकॉर्ड-कीपर को ईमेल से पहुँचता है।',
        en: 'Open Menu (three lines) → Request, or press “✎ Suggest change” in a person’s card. In the form, choose whether to add a member, correct a spelling, add a missing branch, or remove a wrong entry. Your name is required; phone and email are optional. The request goes to the family record keeper by email.'
      },
      k: ['add', 'correct', 'change', 'edit', 'suggest', 'request', 'form', 'spelling', 'जोड़', 'जोड', 'सुधार', 'बदल', 'फॉर्म', 'फार्म', 'अनुरोध', 'गलत नाम']
    },
    {
      id: 'attach',
      q: { hi: 'फ़ोटो या फ़ाइल कैसे भेजें?', en: 'Can I attach photos or files?' },
      a: {
        hi: 'हाँ। Request फ़ॉर्म में फ़ोटो, वीडियो, PDF या Word फ़ाइल जोड़ सकते हैं, कुल 5 MB तक। बड़े वीडियो के लिए Google Drive या YouTube का लिंक Details में लिख दीजिए।',
        en: 'Yes. In the Request form you can attach a photo, video, PDF or Word file, up to 5 MB in total. For bigger videos, paste a Google Drive or YouTube link in Details.'
      },
      k: ['attach', 'photo', 'video', 'upload', 'file', 'document', 'फोटो', 'फ़ोटो', 'वीडियो', 'फाइल', 'फ़ाइल', 'दस्तावेज']
    },
    {
      id: 'remove',
      q: { hi: 'गलत नाम कैसे हटवाएँ?', en: 'How do I remove a wrong entry?' },
      a: {
        hi: 'मेनू → Request में “Remove a wrong entry” चुनिए, ट्री से संबंधित व्यक्ति का नाम चुनिए और Details में कारण लिख दीजिए।',
        en: 'Open Menu → Request, choose “Remove a wrong entry”, pick the related person from the tree and explain in Details.'
      },
      k: ['remove', 'delete', 'wrong entry', 'हटा', 'हटव', 'मिटा']
    },
    {
      id: 'branch',
      q: { hi: 'शाखा कैसे खोलें और विवरण कैसे देखें?', en: 'How do I open branches and see details?' },
      a: {
        hi: 'किसी नाम पर क्लिक या टैप करने से उसकी शाखा खुलती या बंद होती है। विवरण कार्ड देखने के लिए नाम के पास ⓘ बटन दबाइए। “Click” बटन से एक पीढ़ी या पूरी शाखा चुन सकते हैं।',
        en: 'Click or tap a name to open or close its branch. To see the details card, press the ⓘ badge beside the name. The Click button lets you choose one generation or the full branch.'
      },
      k: ['expand', 'collapse', 'details card', 'open branch', 'विवरण', 'कार्ड', 'खोल']
    },
    {
      id: 'relation',
      q: { hi: 'दो लोगों का रिश्ता कैसे देखें?', en: 'How do I see how two people are related?' },
      a: {
        hi: 'पहले एक व्यक्ति के कार्ड में “Mark as person A” दबाइए, फिर दूसरे व्यक्ति का कार्ड खोलिए। दोनों का आपसी संबंध दिख जाएगा।',
        en: 'Press “Mark as person A” in one person’s card, then open another person. The relationship between the two is shown.'
      },
      k: ['relation', 'related', 'person a', 'रिश्ता', 'रिश्ते', 'संबंध', 'सम्बन्ध']
    },
    {
      id: 'download',
      q: { hi: 'वंशवृक्ष डाउनलोड कैसे करें?', en: 'How do I download the tree?' },
      a: {
        hi: 'मेनू → Download से दिख रहा वंशवृक्ष इमेज, SVG या PDF के रूप में सेव कर सकते हैं।',
        en: 'Open Menu → Download to save the visible tree as an image, SVG or PDF.'
      },
      k: ['download', 'svg', 'image', 'print', 'डाउनलोड', 'प्रिंट', 'सेव']
    },
    {
      id: 'share',
      q: { hi: 'किसी व्यक्ति का लिंक कैसे शेयर करें?', en: 'How do I share a link to a person?' },
      a: {
        hi: 'व्यक्ति के विवरण कार्ड में “Copy link” से सीधा लिंक कॉपी होता है और “Copy lineage” से उसकी वंश-परंपरा कॉपी हो जाती है।',
        en: 'In the person’s details card, “Copy link” copies a direct link and “Copy lineage” copies their lineage.'
      },
      k: ['share', 'copy link', 'link', 'lineage copy', 'शेयर', 'लिंक', 'कॉपी']
    },
    {
      id: 'zoom',
      q: { hi: 'ज़ूम और शॉर्टकट', en: 'Zoom and shortcuts' },
      a: {
        hi: 'नीचे दाईं ओर + और − से ज़ूम कीजिए और fit बटन से पूरा वृक्ष स्क्रीन में लाइए। कीबोर्ड पर F (fit), + और − भी चलते हैं। नीचे बाईं ओर स्लाइडर आइकन से ट्री टूल्स खुलते हैं।',
        en: 'Use + and − at the bottom right to zoom and the fit button to show the whole tree. On a keyboard, F (fit), + and − also work. The slider icon at the bottom left opens the tree tools.'
      },
      k: ['zoom', 'fit', 'shortcut', 'keyboard', 'tools', 'ज़ूम', 'जूम', 'शॉर्टकट', 'कीबोर्ड']
    },
    {
      id: 'theme',
      q: { hi: 'दिन या रात मोड कैसे बदलें?', en: 'How do I switch day or night mode?' },
      a: {
        hi: 'घंटी (🔔) के पास सूरज/चाँद बटन दबाइए। इससे दिन और रात मोड बदल जाता है।',
        en: 'Press the sun/moon button beside the bell to switch between day and night mode.'
      },
      k: ['dark', 'night', 'day mode', 'theme', 'light mode', 'डार्क', 'रात', 'मोड', 'अँधेरा']
    },
    {
      id: 'updates',
      q: { hi: 'अपडेट और ब्लॉग कहाँ देखें?', en: 'Where are updates and the blog?' },
      a: {
        hi: 'घंटी में नई ब्लॉग पोस्ट और अपडेट दिखते हैं (लाल बिंदु का मतलब है कुछ नया है)। पूरी सूची के लिए मेनू → Updates या Blog खोलिए।',
        en: 'The bell shows new blog posts and updates (a red dot means something is new). For the full list open Menu → Updates or Blog.'
      },
      k: ['notification', 'bell', 'blog', 'update', 'news', 'अपडेट', 'घंटी', 'ब्लॉग', 'सूचना']
    },
    {
      id: 'stats',
      q: { hi: 'आँकड़े कहाँ देखें?', en: 'Where are the statistics?' },
      a: {
        hi: 'मेनू → Statistics में हर पीढ़ी के सदस्यों की संख्या और सबसे बड़ी शाखाएँ दिखती हैं। किसी शाखा पर क्लिक करके उसे ट्री में खोल सकते हैं।',
        en: 'Menu → Statistics shows the number of members in each generation and the largest branches. Click a branch to open it in the tree.'
      },
      k: ['statistic', 'stats', 'generation', 'count', 'आँकड़े', 'आंकड़े', 'सांख्यिकी', 'पीढ़ी', 'संख्या']
    },
    {
      id: 'about',
      q: { hi: 'संपर्क कैसे करें?', en: 'How do I contact the record keeper?' },
      a: {
        hi: 'किसी सवाल या सुधार के लिए मेनू → Request से रिकॉर्ड-कीपर को लिखिए। About पेज की जानकारी जल्द जोड़ी जाएगी।',
        en: 'For any question or correction, write to the record keeper from Menu → Request. The About page will be filled in soon.'
      },
      k: ['contact', 'about', 'record keeper', 'who maintain', 'संपर्क', 'सम्पर्क', 'रिकॉर्ड']
    }
  ];
  var CHIP_IDS = ['search', 'add', 'download', 'branch', 'relation', 'zoom'];

  /* ---------- Helpers ---------- */
  function norm(s) {
    return String(s).toLowerCase().normalize('NFD').replace(/[\u093C\u0300-\u036f]/g, '').normalize('NFC');
  }
  function faqById(id) { for (var i = 0; i < FAQ.length; i++) if (FAQ[i].id === id) return FAQ[i]; return null; }
  function detectLang(text) {
    if (/[\u0900-\u097F]/.test(text)) return 'hi';
    if (/[a-z]/i.test(text)) return 'en';
    return lang;
  }
  function matchFaq(text) {
    var t = norm(text), best = null, bs = 0, second = 0;
    FAQ.forEach(function (f) {
      var s = 0;
      f.k.forEach(function (k) { if (t.indexOf(norm(k)) > -1) s++; });
      if (s > bs) { second = bs; bs = s; best = f; } else if (s > second) { second = s; }
    });
    return (bs > 0 && bs > second) ? best : null;
  }
  function isDark() {
    var els = [document.documentElement, document.body], i, el, v;
    for (i = 0; i < els.length; i++) {
      el = els[i]; if (!el) continue;
      v = String(el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className).toLowerCase();
      v += ' ' + ['data-theme', 'data-mode', 'data-bs-theme', 'data-color-scheme'].map(function (a) { return el.getAttribute(a) || ''; }).join(' ').toLowerCase();
      if (/(^|[\s_-])(dark|night)([\s_-]|$)/.test(v)) return true;
      if (/(^|[\s_-])(light|day)([\s_-]|$)/.test(v)) return false;
    }
    return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  }

  /* ---------- Styles ---------- */
  var CSS = '' +
    ':host{all:initial}' +
    '*{box-sizing:border-box}' +
    '.wrap{--teal:#0B7A91;--teal-deep:#075062;--gold:#C8A24A;--panel:#F1F7F8;--surface:#FFFFFF;--ink:#13262B;--muted:#4F666C;--line:#D3E2E5;--bot:#FFFFFF;--user:#0B7A91;--user-ink:#FFFFFF;--chip:#E3F1F4;--chip-ink:#075062;' +
    'font-family:system-ui,-apple-system,"Segoe UI","Noto Sans Devanagari","Mukta",Roboto,sans-serif;color:var(--ink);line-height:1.5}' +
    '.wrap[data-theme="dark"]{--panel:#0B1214;--surface:#10191C;--ink:#E6F0F2;--muted:#9BB0B6;--line:#25383E;--bot:#17252A;--user:#0E6A7E;--user-ink:#FFFFFF;--chip:#17323A;--chip-ink:#BFE6EE}' +
    'button{font:inherit;color:inherit;cursor:pointer}' +
    'button:focus-visible,input:focus-visible{outline:3px solid var(--gold);outline-offset:2px}' +

    '.launch{position:fixed;z-index:2147483000;width:68px;height:68px;padding:0;border:3px solid var(--gold);border-radius:50%;background:var(--surface);overflow:hidden;box-shadow:0 6px 18px rgba(7,80,98,.35)}' +
    '.launch img{width:100%;height:100%;object-fit:cover;display:block}' +
    '.tip{position:fixed;z-index:2147483000;background:var(--teal-deep);color:#fff;padding:8px 12px;border-radius:12px;font-size:14px;max-width:200px;box-shadow:0 4px 14px rgba(0,0,0,.25);animation:tipin .35s ease both}' +
    '@keyframes tipin{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}' +

    '.panel{position:fixed;z-index:2147483001;display:none;flex-direction:column;overflow:hidden;background:var(--panel);border:1px solid var(--line);border-radius:18px;box-shadow:0 14px 40px rgba(0,0,0,.3);' +
    'width:min(390px,calc(100vw - 24px));height:min(620px,calc(100dvh - 24px - env(safe-area-inset-top,0px) - env(safe-area-inset-bottom,0px)));' +
    'bottom:calc(12px + env(safe-area-inset-bottom,0px))}' +
    '.panel.open{display:flex}' +
    '.head{display:flex;align-items:center;gap:10px;padding:10px 10px 10px 12px;background:var(--teal-deep);color:#fff}' +
    '.head img{width:46px;height:46px;border-radius:50%;border:2px solid var(--gold);object-fit:cover;flex:none}' +
    '.who{flex:1;min-width:0}' +
    '.who b{display:block;font-size:18px;line-height:1.2}' +
    '.who span{font-size:13px;opacity:.85}' +
    '.hbtn{min-width:44px;height:44px;border:1px solid rgba(255,255,255,.45);border-radius:12px;background:transparent;color:#fff;font-size:14px}' +
    '.hbtn:hover{background:rgba(255,255,255,.14)}' +

    '.log{flex:1;overflow-y:auto;padding:14px 12px;display:flex;flex-direction:column;gap:10px;scroll-behavior:smooth}' +
    '.row{display:flex;gap:8px;align-items:flex-end;max-width:100%}' +
    '.row.user{justify-content:flex-end}' +
    '.row img{width:30px;height:30px;border-radius:50%;object-fit:cover;flex:none;border:1px solid var(--gold)}' +
    '.msg{padding:9px 13px;border-radius:16px;font-size:15.5px;max-width:84%;white-space:pre-wrap;overflow-wrap:anywhere}' +
    '.bot .msg{background:var(--bot);border:1px solid var(--line);border-bottom-left-radius:5px}' +
    '.user .msg{background:var(--user);color:var(--user-ink);border-bottom-right-radius:5px}' +
    '.chips{display:flex;flex-wrap:wrap;gap:8px;padding-left:38px}' +
    '.chip{min-height:40px;padding:6px 13px;border:1px solid var(--teal);border-radius:20px;background:var(--chip);color:var(--chip-ink);font-size:14.5px;text-align:left}' +
    '.chip:hover{background:var(--teal);color:#fff}' +
    '.more{padding-left:38px;font-size:13px;color:var(--muted)}' +
    '.dots{display:inline-flex;gap:4px;align-items:center;height:20px}' +
    '.dots i{width:7px;height:7px;border-radius:50%;background:var(--teal);opacity:.35;animation:blink 1s infinite}' +
    '.dots i:nth-child(2){animation-delay:.18s}.dots i:nth-child(3){animation-delay:.36s}' +
    '@keyframes blink{50%{opacity:1}}' +

    '.foot{border-top:1px solid var(--line);background:var(--surface);padding:8px 10px 6px}' +
    '.bar{display:flex;gap:8px;align-items:center}' +
    '.faqb{min-width:44px;height:44px;padding:0 10px;border:1px solid var(--line);border-radius:12px;background:var(--panel);font-size:14px}' +
    '.inp{flex:1;min-width:0;height:44px;padding:0 12px;border:1px solid var(--line);border-radius:12px;background:var(--panel);color:var(--ink);font:inherit;font-size:16px}' +
    '.sendb{width:44px;height:44px;border:0;border-radius:12px;background:var(--teal);color:#fff;display:grid;place-items:center}' +
    '.sendb:disabled{opacity:.5;cursor:default}' +
    '.note{margin:6px 2px 0;font-size:12px;color:var(--muted)}' +

    '.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}' +
    '@media (prefers-reduced-motion:reduce){.tip{animation:none}.dots i{animation:none;opacity:.7}.log{scroll-behavior:auto}}';

  /* ---------- DOM ---------- */
  var host = document.createElement('div');
  host.id = 'baisa-root';
  var root = host.attachShadow({ mode: 'open' });
  root.innerHTML =
    '<style>' + CSS + '</style>' +
    '<div class="wrap">' +
      '<button class="launch" type="button"><img alt=""></button>' +
      '<section class="panel" role="dialog" aria-label="Baisa">' +
        '<div class="head"><img alt="">' +
          '<div class="who"><b></b><span></span></div>' +
          '<button class="hbtn tgl" type="button"></button>' +
          '<button class="hbtn cls" type="button" aria-label="">✕</button>' +
        '</div>' +
        '<div class="log" role="log" aria-live="polite"></div>' +
        '<div class="foot">' +
          '<form class="bar" autocomplete="off">' +
            '<button class="faqb" type="button"></button>' +
            '<input class="inp" type="text" maxlength="300" enterkeyhint="send">' +
            '<button class="sendb" type="submit"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4 20-7z"/></svg><span class="sr"></span></button>' +
          '</form>' +
          '<p class="note"></p>' +
        '</div>' +
      '</section>' +
    '</div>';

  var $ = function (s) { return root.querySelector(s); };
  var wrap = $('.wrap'), launch = $('.launch'), panel = $('.panel'), log = $('.log'),
      form = $('.bar'), inp = $('.inp'), sendb = $('.sendb'), faqb = $('.faqb'),
      tgl = $('.tgl'), cls = $('.cls'), note = $('.note');
  $('.launch img').src = CFG.avatar;
  $('.head img').src = CFG.avatar;

  var side = CFG.side === 'left' ? 'left' : 'right';
  var edge = 'calc(14px + env(safe-area-inset-' + side + ',0px))';
  launch.style[side] = edge;
  launch.style.bottom = 'calc(' + Number(CFG.bottom) + 'px + env(safe-area-inset-bottom,0px))';
  panel.style[side] = 'calc(12px + env(safe-area-inset-' + side + ',0px))';

  var history = [], busy = false, started = false;

  function applyLang() {
    var t = T[lang];
    $('.who b').textContent = t.title;
    $('.who span').textContent = t.sub;
    launch.setAttribute('aria-label', t.open);
    cls.setAttribute('aria-label', t.close);
    tgl.textContent = t.toggle;
    tgl.setAttribute('aria-label', t.toggleLabel);
    inp.placeholder = t.placeholder;
    faqb.textContent = '☰ ' + t.faqBtn;
    sendb.querySelector('.sr').textContent = t.send;
    note.textContent = t.note;
  }
  function applyTheme() { wrap.setAttribute('data-theme', isDark() ? 'dark' : 'light'); }

  function scrollDown() { log.scrollTop = log.scrollHeight; }
  function addMsg(role, text) {
    var row = document.createElement('div');
    row.className = 'row ' + role;
    if (role === 'bot') {
      var im = document.createElement('img'); im.alt = ''; im.src = CFG.avatar; row.appendChild(im);
    }
    var m = document.createElement('div');
    m.className = 'msg';
    m.textContent = text;            // text only, never HTML
    row.appendChild(m);
    log.appendChild(row);
    scrollDown();
    return row;
  }
  function addChips(ids, label) {
    if (label) { var l = document.createElement('div'); l.className = 'more'; l.textContent = label; log.appendChild(l); }
    var box = document.createElement('div');
    box.className = 'chips';
    ids.forEach(function (id) {
      var f = faqById(id); if (!f) return;
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.textContent = f.q[lang];
      b.addEventListener('click', function () { ask(f.q[lang], f); });
      box.appendChild(b);
    });
    log.appendChild(box);
    scrollDown();
  }
  function showTyping() {
    var row = document.createElement('div');
    row.className = 'row bot';
    row.innerHTML = '<img alt=""><div class="msg"><span class="dots"><i></i><i></i><i></i></span></div>';
    row.querySelector('img').src = CFG.avatar;
    row.querySelector('.msg').setAttribute('aria-label', T[lang].typing);
    log.appendChild(row); scrollDown();
    return row;
  }
  function start() {
    if (started) return; started = true;
    addMsg('bot', T[lang].greet);
    addMsg('bot', T[lang].pick);
    addChips(CHIP_IDS);
  }
  function resetThread() {
    log.textContent = ''; history = []; started = false; start();
  }

  function localReply(faq, l) {
    var row = showTyping();
    setTimeout(function () {
      row.remove();
      var txt = faq.a[l];
      addMsg('bot', txt);
      history.push({ role: 'bot', text: txt });
    }, 280);
  }

  function ask(text, chipFaq) {
    text = String(text || '').trim();
    if (!text || busy) return;
    addMsg('user', text);
    history.push({ role: 'user', text: text });
    var l = chipFaq ? lang : detectLang(text);
    var faq = chipFaq || matchFaq(text);

    if (faq && (chipFaq || !CFG.endpoint || text.length <= 60)) { localReply(faq, l); return; }
    if (!CFG.endpoint) {
      var r = showTyping();
      setTimeout(function () { r.remove(); addMsg('bot', T[l].noAnswer); addChips(CHIP_IDS, T[l].more); }, 280);
      return;
    }
    callAI(l);
  }

  function callAI(l) {
    busy = true; sendb.disabled = true;
    var row = showTyping();
    var ctl = new AbortController();
    var timer = setTimeout(function () { ctl.abort(); }, 20000);
    fetch(CFG.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lang: lang, messages: history.slice(-6) }),
      signal: ctl.signal
    }).then(function (r) {
      if (!r.ok) throw new Error('http ' + r.status);
      return r.json();
    }).then(function (d) {
      var txt = String((d && d.reply) || '').replace(/\*\*/g, '').trim();
      if (!txt) throw new Error('empty');
      row.remove(); addMsg('bot', txt); history.push({ role: 'bot', text: txt });
    }).catch(function () {
      row.remove(); addMsg('bot', T[l].error);
    }).then(function () {
      clearTimeout(timer); busy = false; sendb.disabled = false; inp.focus();
    });
  }

  /* ---------- Events ---------- */
  function openPanel() {
    start();
    panel.classList.add('open');
    launch.style.display = 'none';
    tip.style.display = 'none';
    store.set('baisa-tip', '1');
    setTimeout(function () { inp.focus(); scrollDown(); }, 30);
  }
  function closePanel() {
    panel.classList.remove('open');
    launch.style.display = '';
    launch.focus();
  }
  launch.addEventListener('click', openPanel);
  cls.addEventListener('click', closePanel);
  panel.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePanel(); });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var v = inp.value; inp.value = '';
    ask(v);
  });
  faqb.addEventListener('click', function () { addChips(CHIP_IDS, T[lang].more); });
  tgl.addEventListener('click', function () {
    lang = lang === 'hi' ? 'en' : 'hi';
    store.set('baisa-lang', lang);
    applyLang(); resetThread();
  });

  /* One-time hint bubble (once per visit) */
  var tip = document.createElement('div');
  tip.className = 'tip';
  tip.style.display = 'none';
  wrap.appendChild(tip);
  function showTip() {
    if (store.get('baisa-tip') || panel.classList.contains('open')) return;
    tip.textContent = T[lang].open;
    tip.style[side] = 'calc(14px + 76px + env(safe-area-inset-' + side + ',0px))';
    tip.style.bottom = 'calc(' + (Number(CFG.bottom) + 18) + 'px + env(safe-area-inset-bottom,0px))';
    tip.style.display = 'block';
    store.set('baisa-tip', '1');
    setTimeout(function () { tip.style.display = 'none'; }, 7000);
  }

  /* ---------- Mount ---------- */
  function mount() {
    document.body.appendChild(host);
    applyLang(); applyTheme();
    try {
      var mo = new MutationObserver(applyTheme);
      var opts = { attributes: true, attributeFilter: ['class', 'data-theme', 'data-mode', 'data-bs-theme', 'data-color-scheme'] };
      mo.observe(document.documentElement, opts);
      mo.observe(document.body, opts);
      if (window.matchMedia) window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
    } catch (e) {}
    setTimeout(showTip, 4000);
  }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
})();
