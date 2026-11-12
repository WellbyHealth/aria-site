// Make a share image (1200x630 JPEG) for every indexable page, from its label and H1.
// Run after a build: node tools/og.mjs. Output goes to og/<page path>.jpg; the build links each page to its image.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DIST = path.join(ROOT, 'dist'), OUT = path.join(ROOT, 'og');
const MARK = fs.readFileSync(path.join(DIST, 'assets/site/mark.svg'), 'utf8').replace(/stroke="#171721"/, 'stroke="currentColor"');
const HERO = 'data:image/webp;base64,' + fs.readFileSync(path.join(ROOT, 'site/img/hero.webp')).toString('base64');
const unesc = (t) => t.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;/g, '’').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
const files = [];
(function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) { if (f !== 'assets') walk(p); } else if (f.endsWith('.html')) files.push(p); } })(DIST);
const jobs = [];
for (const f of files) {
  const rel = path.relative(DIST, f).replace(/\.html$/, '');
  if (['index', '404', 'demo', 'privacy', 'join'].includes(rel)) continue;
  const h = fs.readFileSync(f, 'utf8');
  if (h.includes('noindex')) continue;
  const h1 = h.match(/<h1[^>]*>([\s\S]*?)<\/h1>/); if (!h1) continue;
  const head = h.slice(h.indexOf('<main'), h.indexOf('</h1>'));
  const labels = [...head.matchAll(/<span class="label">([\s\S]*?)<\/span>/g)];
  jobs.push({ rel, h1: unesc(h1[1]), label: labels.length ? unesc(labels.at(-1)[1]) : '' });
}
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
const html = (j) => `<html><head><link href="https://fonts.googleapis.com/css2?family=Inter:wght@300..600&display=swap" rel="stylesheet"><style>
body{margin:0}.og{width:1200px;height:630px;position:relative;overflow:hidden;font-family:Inter;color:#171721;background:url(${HERO}) center 70%/cover}
.og::before{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(251,251,252,.94) 0%,rgba(251,251,252,.82) 55%,rgba(251,251,252,.25) 100%)}
.in{position:absolute;inset:0;padding:56px 64px;display:flex;flex-direction:column}
.b{display:flex;align-items:center;gap:14px;font-size:22px;letter-spacing:.32em;font-weight:500}.b svg{width:40px;height:40px}
.l{margin-top:auto;font-size:20px;letter-spacing:.14em;text-transform:uppercase;color:#5d5c73;font-weight:500}
h1{font-weight:400;font-size:${j.h1.length > 60 ? 54 : 64}px;letter-spacing:-.035em;line-height:1.05;margin:18px 0 0;max-width:900px}
.u{margin-top:34px;font-size:20px;color:#5d5c73}</style></head><body><div class="og"><div class="in"><div class="b">${MARK}ARIA</div>
${j.label ? `<div class="l">${j.label}</div>` : '<div class="l"></div>'}<h1>${j.h1}</h1><div class="u">ariapractice.com</div></div></div></body></html>`;
let n = 0;
for (const j of jobs) {
  await p.setContent(html(j), { waitUntil: 'networkidle' });
  const out = path.join(OUT, j.rel + '.jpg'); fs.mkdirSync(path.dirname(out), { recursive: true });
  await p.screenshot({ path: out, type: 'jpeg', quality: 82, clip: { x: 0, y: 0, width: 1200, height: 630 } }); n++;
}
await b.close();
console.log('share images', n);
