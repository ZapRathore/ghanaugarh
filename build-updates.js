// Builds one static page per file in /updates  ->  /u/<id>.html  (served as https://your-site/u/<id>)
// Each page has its own title, description and photo (Open Graph), so WhatsApp / Facebook /
// Telegram show the right preview when an update link is shared.
// Run:  npm install && node build-updates.js      (GitHub Action does this automatically)

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mammoth = require('mammoth');
const sanitizeHtml = require('sanitize-html');

const SITE_URL = (process.env.SITE_URL || 'https://ghanaugarh.co.in').replace(/\/+$/, '');
const SITE_NAME = 'घणाऊ गढ़ वंशावली';
const ROOT = __dirname;
const SRC = path.join(ROOT, 'updates');
const OUT = path.join(ROOT, 'u');
const ASSETS = path.join(OUT, 'assets');
const NEWS_EXT = /\.(docx|jpe?g|png|gif|webp|bmp|svg|pdf|txt)$/i;
const IMG_EXT = /\.(jpe?g|png|gif|webp|bmp|svg)$/i;

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const encPath = p => p.split('/').map(encodeURIComponent).join('/');

function parseName(name) {
  const base = name.replace(NEWS_EXT, '');
  let ts = 0, title = base, m, date = '';
  if ((m = base.match(/(\d{4})[-_.](\d{1,2})[-_.](\d{1,2})/))) { ts = Date.UTC(+m[1], +m[2] - 1, +m[3]); title = base.replace(m[0], ''); }
  else if ((m = base.match(/(\d{1,2})[-_.](\d{1,2})[-_.](\d{4})/))) { ts = Date.UTC(+m[3], +m[2] - 1, +m[1]); title = base.replace(m[0], ''); }
  if (ts) date = new Date(ts).toISOString().slice(0, 10);
  title = title.replace(/_+/g, ' ').replace(/^[\s\-–.]+|[\s\-–.]+$/g, '').replace(/\s+/g, ' ') || base;
  const kind = /\.docx$/i.test(name) ? 'docx' : IMG_EXT.test(name) ? 'img' : /\.pdf$/i.test(name) ? 'pdf' : 'txt';
  // Link id: date + readable English words (if any) + short fingerprint of the file name. Always ASCII.
  const words = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  const h = crypto.createHash('sha1').update(name).digest('hex').slice(0, 6);
  const slug = [date, words, h].filter(Boolean).join('-');
  return { name, title, ts, kind, slug };
}

const fmtDate = ts => ts ? new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : '';
const clean = html => sanitizeHtml(html, {
  allowedTags: ['h1', 'h2', 'h3', 'h4', 'p', 'br', 'ul', 'ol', 'li', 'strong', 'b', 'em', 'i', 'u', 'a', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'img', 'blockquote', 'sup', 'sub'],
  allowedAttributes: { a: ['href'], img: ['src', 'alt'], td: ['colspan', 'rowspan'], th: ['colspan', 'rowspan'] },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: { img: ['http', 'https'] },
  transformTags: { a: sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer' }) },
});
const plain = html => html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&amp;|&lt;|&gt;|&quot;/g, ' ').replace(/\s+/g, ' ').trim();

async function buildBody(it) {
  const rawUrl = '../updates/' + encPath(it.name);
  if (it.kind === 'img') return { html: `<img src="${rawUrl}" alt="${esc(it.title)}">`, text: '', image: '/updates/' + encPath(it.name) };
  if (it.kind === 'pdf') return { html: `<iframe src="${rawUrl}" title="${esc(it.title)}" style="width:100%;height:75vh;border:1px solid var(--stroke);border-radius:8px;background:#fff"></iframe>`, text: '', image: '' };
  if (it.kind === 'txt') {
    const t = fs.readFileSync(path.join(SRC, it.name), 'utf8');
    return { html: `<div style="white-space:pre-wrap">${esc(t)}</div>`, text: t.replace(/\s+/g, ' ').trim(), image: '' };
  }
  // docx -> html; embedded pictures are saved as files in /u/assets
  let n = 0, firstImage = '';
  const out = await mammoth.convertToHtml({ path: path.join(SRC, it.name) }, {
    convertImage: mammoth.images.imgElement(async image => {
      const buf = await image.readAsBuffer();
      const ext = (image.contentType.split('/')[1] || 'png').replace('jpeg', 'jpg').replace('svg+xml', 'svg');
      if (!/^(png|jpg|gif|webp)$/.test(ext)) return { src: '' };
      const file = `${it.slug}-${++n}.${ext}`;
      fs.writeFileSync(path.join(ASSETS, file), buf);
      if (!firstImage) firstImage = '/u/assets/' + file;
      return { src: 'assets/' + file };
    }),
  });
  let html = clean(out.value);
  const lead = html.match(/^<h[1-4]>([\s\S]*?)<\/h[1-4]>/);
  if (lead && plain(lead[1]) === it.title) html = html.slice(lead[0].length);
  html = html.replace(/<table[\s\S]*?<\/table>/g, m => `<div class="tw">${m}</div>`);
  if (!html.trim()) html = '<p>This document is empty.</p>';
  return { html, text: plain(html), image: firstImage };
}

function page(it, body) {
  const url = `${SITE_URL}/u/${it.slug}`;
  const desc = (body.text || `${it.title} - ${SITE_NAME}`).slice(0, 160);
  const img = SITE_URL + (body.image || '/favicon.png');
  const dl = '../updates/' + encPath(it.name);
  const dlText = it.kind === 'docx' ? 'Download the Word file' : it.kind === 'img' ? 'Open the full image' : it.kind === 'pdf' ? 'Open the PDF' : 'Download the file';
  return `<!DOCTYPE html>
<html lang="hi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(it.title)} | ${SITE_NAME}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:title" content="${esc(it.title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(img)}">
<meta name="twitter:card" content="${body.image ? 'summary_large_image' : 'summary'}">
<link rel="icon" type="image/png" href="../favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Hind:wght@400;500;600&family=Tiro+Devanagari+Hindi&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box}
:root{--bg:#f2f4f8;--bg2:#ffffff;--ink:#14213d;--muted:#5a6478;--accent:#1f3a68;--accent-ink:#ffffff;--stroke:rgba(20,33,61,.14);--shadow:0 6px 24px rgba(20,33,61,.12)}
@media (prefers-color-scheme:dark){:root{--bg:#0c111a;--bg2:#161d2b;--ink:#e8ecf3;--muted:#9aa6ba;--accent:#d8b45f;--accent-ink:#0c111a;--stroke:rgba(255,255,255,.13);--shadow:0 8px 28px rgba(0,0,0,.45)}}
:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
body{margin:0;font-family:'Hind',system-ui,sans-serif;color:var(--ink);background:var(--bg);line-height:1.6}
header{position:sticky;top:env(safe-area-inset-top,0px);z-index:5;background:var(--bg2);border-bottom:1px solid var(--stroke);display:flex;align-items:center;gap:12px;padding:10px 16px}
header .home{display:flex;align-items:center;gap:10px;color:var(--ink);text-decoration:none;min-width:0}
header img{width:34px;height:34px;border-radius:8px}
header b{font:400 18px/1.2 'Tiro Devanagari Hindi',serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
header nav{margin-left:auto;display:flex;gap:8px}
.btn{font:inherit;font-size:13px;font-weight:500;color:var(--ink);background:transparent;border:1px solid var(--stroke);border-radius:99px;padding:7px 14px;cursor:pointer;white-space:nowrap;text-decoration:none;display:inline-flex;align-items:center;gap:6px}
.btn:hover{background:var(--accent);color:var(--accent-ink)}
.btn svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.btn[disabled]{opacity:.6;cursor:wait}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
main{max-width:780px;margin:0 auto;padding:22px 16px 60px}
.back{display:inline-block;margin:0 0 14px;color:var(--accent);text-decoration:none;font-size:14px}
.back:hover{text-decoration:underline}
article{background:var(--bg2);border:1px solid var(--stroke);border-radius:16px;padding:20px 22px;box-shadow:var(--shadow)}
article h1{margin:0 0 4px;font:400 26px/1.25 'Tiro Devanagari Hindi',serif;overflow-wrap:anywhere}
.date{color:var(--muted);font-size:13px;margin:0 0 14px}
.body{font-size:16px;line-height:1.75;overflow-wrap:anywhere}
.body h1,.body h2,.body h3,.body h4{font-family:'Tiro Devanagari Hindi',serif;font-weight:400;line-height:1.3;margin:16px 0 6px}
.body h1{font-size:22px}.body h2{font-size:20px}.body h3,.body h4{font-size:17px}
.body p{margin:0 0 10px}.body ul,.body ol{padding-left:22px;margin:0 0 10px}
.body img{max-width:100%;height:auto;border-radius:8px}
.body a{color:var(--accent)}
.body .tw{overflow-x:auto;margin:0 0 12px}
.body table{border-collapse:collapse;min-width:100%}
.body td,.body th{border:1px solid var(--stroke);padding:6px 10px;vertical-align:top}
.foot{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:18px;padding-top:14px;border-top:1px solid var(--stroke)}
.foot a.dl{color:var(--accent);font-size:13.5px}
#toast{position:fixed;left:50%;bottom:calc(24px + env(safe-area-inset-bottom,0px));transform:translate(-50%,12px);background:var(--accent);color:var(--accent-ink);padding:9px 18px;border-radius:99px;font-size:14px;opacity:0;pointer-events:none;transition:opacity .25s,transform .25s;max-width:calc(100vw - 24px)}
#toast.on{opacity:1;transform:translate(-50%,0)}
</style>
</head>
<body>
<header>
  <a class="home" href="../" aria-label="Home"><img src="../favicon.png" alt="" onerror="this.style.display='none'"><b>${SITE_NAME}</b></a>
  <nav><a class="btn" href="../">Home</a><a class="btn" href="../blog.html">Blog</a></nav>
</header>
<main>
  <a class="back" href="../update">← All updates</a>
  <article>
    <h1>${esc(it.title)}</h1>
    <p class="date">${esc(fmtDate(it.ts))}</p>
    <div class="body" id="body">${body.html}</div>
    <div class="foot">
      <button type="button" class="btn" id="share"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg><span>Share</span></button>
      <button type="button" class="btn" id="copy">Copy link</button>
      <a class="dl" href="${dl}" target="_blank" rel="noopener noreferrer">${dlText}</a>
    </div>
  </article>
</main>
<div id="toast" role="status"></div>
<script>
const TITLE = ${JSON.stringify(it.title)};
const LINK = ${JSON.stringify(url)};
const toast = t => { const el = document.getElementById('toast'); el.textContent = t; el.classList.add('on'); setTimeout(() => el.classList.remove('on'), 2400); };
document.getElementById('copy').onclick = async () => {
  try { await navigator.clipboard.writeText(LINK); toast('Link copied'); }
  catch (e) { const ta = document.createElement('textarea'); ta.value = LINK; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); toast('Link copied'); } catch (_) { toast(LINK); } ta.remove(); }
};
document.getElementById('share').onclick = async function () {
  const label = this.lastChild; const old = label.textContent; this.disabled = true; label.textContent = 'Preparing…';
  try {
    const text = TITLE + '\\n\\n' + LINK;
    let file = null;
    try {
      const im = document.querySelector('#body img');
      if (im && im.src) { const r = await fetch(im.src); if (r.ok) { const b = await r.blob(); if (/^image\\//.test(b.type)) file = new File([b], 'update.' + (b.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg'), { type: b.type }); } }
    } catch (e) {}
    if (navigator.share) {
      try {
        if (file && navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: TITLE, text }); return; }
        await navigator.share({ title: TITLE, text }); return;
      } catch (e) { if (e && e.name === 'AbortError') return; }
    }
    window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener');
  } finally { this.disabled = false; label.textContent = old; }
};
</script>
</body>
</html>
`;
}

(async () => {
  if (!fs.existsSync(SRC)) { console.error('No "updates" folder found - nothing to build.'); process.exit(0); }
  fs.mkdirSync(ASSETS, { recursive: true });
  // start clean so deleted updates disappear
  for (const f of fs.readdirSync(OUT)) if (/\.(html|json)$/.test(f)) fs.rmSync(path.join(OUT, f));
  for (const f of fs.readdirSync(ASSETS)) fs.rmSync(path.join(ASSETS, f));

  const files = fs.readdirSync(SRC).filter(n => NEWS_EXT.test(n) && !n.startsWith('~$') && fs.statSync(path.join(SRC, n)).isFile());
  const items = files.map(parseName).sort((a, b) => (b.ts - a.ts) || b.name.localeCompare(a.name));
  const seen = new Set();
  for (const it of items) {
    if (seen.has(it.slug)) it.slug += '-' + seen.size; seen.add(it.slug);
    try {
      const body = await buildBody(it);
      fs.writeFileSync(path.join(OUT, it.slug + '.html'), page(it, body));
      console.log('built', it.slug, '<-', it.name);
    } catch (e) { console.error('FAILED', it.name, e.message); it.failed = true; }
  }
  const manifest = items.filter(i => !i.failed).map(i => ({ slug: i.slug, name: i.name, title: i.title, ts: i.ts, kind: i.kind }));
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1));
  console.log(manifest.length + ' update page(s) written to /u');
})();
