// Blog: turns blog/posts/*.md into /blog and /blog/<slug> pages at build time.
// Each post has a `date:` in its front matter. A post is published only once that
// date has arrived (UTC), so a scheduled daily redeploy releases them on schedule.
// Unpublished posts are not written, linked, listed in the sitemap or the feed.
import fs from 'node:fs';
import path from 'node:path';

const SITE = 'https://ariapractice.com';
const CAT_ART = {
  'Getting paid': ['claims', '#e4f0fd'],
  'Cash flow': ['treasury', '#fcecf6'],
  'Spend & cards': ['card', '#fcecf6'],
  'Books & close': ['accounting', '#fdf5d2'],
  'Running the practice': ['cfo-hub', '#e6f4ea'],
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const noDash = (s) => s.replace(/\s*[—–]\s*/g, ', ').replace(/,\s*,/g, ',');

function parse(file) {
  const raw = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error('no front matter: ' + file);
  const meta = {};
  for (const line of m[1].split('\n')) {
    const i = line.indexOf(':');
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  for (const k of ['title', 'description', 'slug', 'category', 'date']) if (!meta[k]) throw new Error(k + ' missing in ' + file);
  return { ...meta, title: noDash(meta.title), description: noDash(meta.description), body: noDash(m[2].trim()) };
}

function inline(t) {
  t = esc(t);
  t = t.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (_, txt, url) => {
    const internal = url.startsWith(SITE);
    const href = internal ? url.slice(SITE.length) || '/' : url;
    return '<a href="' + href + '"' + (internal ? '' : ' rel="noopener" target="_blank"') + '>' + txt + '</a>';
  });
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  return t;
}
function md(src) {
  const out = []; const toc = [];
  const blocks = src.split(/\n{2,}/);
  for (let b of blocks) {
    b = b.trim(); if (!b) continue;
    let m;
    if ((m = b.match(/^(#{2,3}) (.+)$/)) && !b.includes('\n')) {
      const lvl = m[1].length, text = m[2].trim();
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
      if (lvl === 2) toc.push([id, text]);
      out.push('<h' + lvl + ' id="' + id + '">' + inline(text) + '</h' + lvl + '>');
    } else if (b.split('\n').every((l) => /^\s*- /.test(l))) {
      out.push('<ul>' + b.split('\n').map((l) => '<li>' + inline(l.replace(/^\s*- /, '')) + '</li>').join('') + '</ul>');
    } else if (b.split('\n').every((l) => /^\s*\d+\. /.test(l))) {
      out.push('<ol>' + b.split('\n').map((l) => '<li>' + inline(l.replace(/^\s*\d+\. /, '')) + '</li>').join('') + '</ol>');
    } else if ((m = b.match(/^(#{2,3}) (.+)\n([\s\S]+)$/))) {
      out.push(...md(m[1] + ' ' + m[2]).html.split('\n'), md(m[3]).html);
    } else {
      out.push('<p>' + inline(b.replace(/\n/g, ' ')) + '</p>');
    }
  }
  return { html: out.join('\n'), toc };
}

const fmtDate = (d) => new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const words = (s) => s.split(/\s+/).filter(Boolean).length;

function shell({ title, desc, url, head = '', body, og = '/og.png?v=7' }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}${url}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="article">
<meta property="og:url" content="${SITE}${url}">
<meta property="og:site_name" content="Aria">
<meta property="og:image" content="${SITE}${og}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#ffffff">
<link rel="icon" href="/favicon.ico?v=2" sizes="48x48">
<link rel="apple-touch-icon" href="/apple-touch-icon.png?v=2">
<link rel="alternate" type="application/rss+xml" title="Aria blog" href="/blog/rss.xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Figtree:wght@400..800&display=swap">
<style>
:root{--ink:#1c1916;--body:#3b3a36;--muted:#6b6a64;--line:#ecebe6;--bg:#faf9f7;--card:#fff;--blue:#e4f0fd;--blue-ink:#1f4f8a;--pink:#fcecf6;--butter:#fdf5d2;--mint:#e6f4ea;--btn:#F7DC6F}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--body);font:400 17px/1.65 Figtree,-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif}
a{color:var(--blue-ink)}a:focus-visible,button:focus-visible{outline:3px solid #635bff;outline-offset:2px}
.wrap{max-width:1120px;margin:0 auto;padding:0 20px}
.top{position:sticky;top:10px;z-index:5;margin:10px auto 0;max-width:1160px;padding:0 16px}
.bar{display:flex;align-items:center;justify-content:space-between;gap:12px;background:#fff;border:1px solid var(--line);border-radius:22px;padding:10px 12px 10px 18px;box-shadow:0 10px 30px -22px rgba(0,0,0,.35)}
.logo{display:inline-flex;align-items:center;gap:10px;color:var(--ink);text-decoration:none;font-weight:700;font-size:1.35rem;letter-spacing:-.02em}
.logo img{width:32px;height:32px}
.nav{display:flex;gap:4px;align-items:center}
.nav a{color:var(--body);text-decoration:none;font-weight:550;font-size:.95rem;padding:8px 12px;border-radius:999px}
.nav a:hover,.nav a[aria-current]{background:#f3f2ee;color:var(--ink)}
.cta{background:#f3f2ee;color:var(--ink)!important;font-weight:650!important}
@media (max-width:720px){.nav a:not(.cta){display:none}}
h1,h2,h3{color:var(--ink);letter-spacing:-.025em;line-height:1.15}
.bhead{padding:clamp(36px,6vw,72px) 0 clamp(20px,3vw,32px)}
.eyebrow{display:inline-block;font-size:.75rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin:0 0 12px}
.bhead h1{font-size:clamp(2.2rem,5vw,3.6rem);margin:0 0 14px;font-weight:620;max-width:18ch}
.bhead p.lede{font-size:1.15rem;max-width:44rem;margin:0}
.cats{display:flex;flex-wrap:wrap;gap:8px;margin:22px 0 0;padding:0;list-style:none}
.cats a{display:inline-block;padding:7px 14px;border-radius:999px;border:1px solid var(--line);background:#fff;color:var(--ink);text-decoration:none;font-size:.9rem;font-weight:550}
.cats a[aria-current]{background:var(--ink);color:#fff;border-color:var(--ink)}
.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;padding:8px 0 64px;margin:0;list-style:none}
@media (max-width:960px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media (max-width:620px){.grid{grid-template-columns:minmax(0,1fr)}}
.card{display:flex;flex-direction:column;height:100%;background:var(--card);border:1px solid var(--line);border-radius:24px;overflow:hidden;text-decoration:none;color:inherit;transition:transform .2s cubic-bezier(.23,1,.32,1),box-shadow .2s}
.card:hover{transform:translateY(-3px);box-shadow:0 22px 40px -30px rgba(0,0,0,.4)}
.card .art{display:grid;place-items:center;height:150px;background:var(--t)}
.card .art img{width:96px;height:96px;object-fit:contain;filter:drop-shadow(0 10px 12px rgba(40,30,60,.16))}
.card .tx{padding:18px 20px 22px;display:flex;flex-direction:column;gap:8px;flex:1}
.card .meta{font-size:.8rem;color:var(--muted);font-weight:600}
.card h2{font-size:1.2rem;margin:0;font-weight:650}
.card p{margin:0;font-size:.95rem;color:var(--body)}
.post{display:grid;grid-template-columns:minmax(0,1fr) 260px;gap:56px;align-items:start;padding-bottom:40px}
@media (max-width:960px){.post{grid-template-columns:minmax(0,1fr)}.side{display:none}}
.phead{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:24px;align-items:center;padding:clamp(32px,5vw,60px) 0 28px}
.phead h1{font-size:clamp(2rem,4.4vw,3.1rem);margin:0 0 14px;font-weight:620}
.phead .lede{font-size:1.15rem;margin:0 0 16px;max-width:42rem}
.phead .meta{font-size:.9rem;color:var(--muted)}
.phead .art{width:clamp(110px,14vw,170px);aspect-ratio:1;border-radius:28px;display:grid;place-items:center;background:var(--t)}
.phead .art img{width:72%;height:auto;filter:drop-shadow(0 12px 14px rgba(40,30,60,.18))}
@media (max-width:620px){.phead{grid-template-columns:minmax(0,1fr)}.phead .art{display:none}}
.crumbs{font-size:.85rem;color:var(--muted);margin:0 0 14px}.crumbs a{color:var(--muted)}
article{max-width:42rem}
article h2{font-size:1.55rem;margin:2.1em 0 .5em;font-weight:650;scroll-margin-top:100px}
article h3{font-size:1.2rem;margin:1.6em 0 .4em;font-weight:650}
article p,article li{color:var(--body)}article ul,article ol{padding-left:1.3em}article li{margin:.35em 0}
article strong{color:var(--ink)}
.side{position:sticky;top:100px;display:grid;gap:16px}
.toc{background:#fff;border:1px solid var(--line);border-radius:20px;padding:18px 20px}
.toc b{display:block;font-size:.8rem;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:8px}
.toc a{display:block;color:var(--body);text-decoration:none;font-size:.92rem;padding:5px 0;line-height:1.35}.toc a:hover{color:var(--ink)}
.join{background:var(--butter);border-radius:20px;padding:20px}
.join h3,.endcta h2{margin:0 0 6px;font-size:1.15rem}.join p{margin:0 0 14px;font-size:.92rem}
.btn{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0 18px;border-radius:12px;background:var(--ink);color:#fff;text-decoration:none;font-weight:650}
.endcta{margin:48px 0 0;padding:22px 26px;border-radius:24px;background:var(--blue);max-width:42rem;display:grid;grid-template-columns:140px minmax(0,1fr);gap:20px;align-items:center}
.endcta-art{width:140px;height:140px;border-radius:20px;object-fit:cover}
@media (max-width:560px){.endcta{grid-template-columns:minmax(0,1fr)}.endcta-art{width:110px;height:110px}}
.card .art.cover{display:block;height:auto;aspect-ratio:16/9;overflow:hidden}
.card .art.cover img{width:100%;height:100%;object-fit:cover;filter:none;transition:transform .5s cubic-bezier(.23,1,.32,1)}
.card:hover .art.cover img{transform:scale(1.04)}
.pcover{margin:0 0 36px;border-radius:28px;overflow:hidden;aspect-ratio:16/7;background:var(--t)}
.pcover img{width:100%;height:100%;object-fit:cover}
@media (max-width:620px){.pcover{aspect-ratio:16/9;border-radius:20px}}
.endcta h2{font-size:1.35rem;margin-top:0}.endcta p{margin:0 0 16px}
.more{padding:24px 0 72px}.more h2{font-size:1.4rem;margin:0 0 16px}
.more .grid{padding:0}
.note{font-size:.85rem;color:var(--muted);max-width:42rem;margin:28px 0 0}
footer{border-top:1px solid var(--line);padding:28px 0 40px;font-size:.88rem;color:var(--muted)}
footer .wrap{display:flex;flex-wrap:wrap;gap:12px 22px;align-items:center;justify-content:space-between}
footer a{color:var(--muted)}
@media (prefers-reduced-motion:reduce){.card{transition:none}}
</style>
${head}
</head>
<body>
<header class="top"><div class="bar"><a class="logo" href="/"><img src="/assets/brand/wellby-flower-96.webp" alt="" width="32" height="32">Aria</a><nav class="nav" aria-label="Main"><a href="/products">Products</a><a href="/specialties">Specialties</a><a href="/blog" aria-current="page">Blog</a><a class="cta" href="/#waitlist">Join the waitlist</a></nav></div></header>
<main id="main">
${body}
</main>
<footer><div class="wrap"><span>© ${new Date().getUTCFullYear()} Aria · Built by Wellby Health. Aria is a financial technology company, not a bank.</span><span><a href="/">Home</a> · <a href="/products">Products</a> · <a href="/blog">Blog</a> · <a href="/blog/rss.xml">RSS</a></span></div></footer>
</body>
</html>
`;
}

let ROOT = '.';
const cover = (slug) => fs.existsSync(path.join(ROOT, 'assets', 'i', `cover-${slug}-640.webp`)) ? `/assets/i/cover-${slug}` : null;
function card(p) {
  const [art, tint] = CAT_ART[p.category] || ['cfo-hub', '#e4f0fd'];
  const c = cover(p.slug);
  const artHtml = c ? `<span class="art cover" style="--t:${tint}"><img src="${c}-640.webp" srcset="${c}-640.webp 640w, ${c}-1280.webp 1280w" sizes="(max-width:700px) 100vw, 380px" alt="" width="640" height="357" loading="lazy" decoding="async"></span>` : `<span class="art" style="--t:${tint}"><img src="/assets/i/icon-${art}-cut.webp" alt="" width="96" height="96" loading="lazy" decoding="async"></span>`;
  return `<li><a class="card" href="/blog/${p.slug}">${artHtml}<span class="tx"><span class="meta">${esc(p.category)} · ${fmtDate(p.date)}</span><h2>${esc(p.title)}</h2><p>${esc(p.description)}</p></span></a></li>`;
}

export function buildBlog({ root, out, today, ld }) {
  ROOT = root;
  const dir = path.join(root, 'blog', 'posts');
  if (!fs.existsSync(dir)) return [];
  const all = fs.readdirSync(dir).filter((f) => f.endsWith('.md')).map((f) => parse(path.join(dir, f)));
  const live = all.filter((p) => p.date <= today).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const pages = [];
  if (!live.length) return pages;
  const write = (rel, html) => { const f = path.join(out, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, html); };

  for (const p of live) {
    const { html, toc } = md(p.body);
    const mins = Math.max(3, Math.round(words(p.body) / 220));
    const [art, tint] = CAT_ART[p.category] || ['cfo-hub', '#e4f0fd'];
    const url = '/blog/' + p.slug;
    const related = live.filter((q) => q !== p && q.category === p.category).slice(0, 3);
    const fill = live.filter((q) => q !== p && !related.includes(q)).slice(0, 3 - related.length);
    const graph = [
      { '@type': 'BlogPosting', '@id': SITE + url + '#post', headline: p.title, description: p.description, datePublished: p.date, dateModified: p.date, url: SITE + url, mainEntityOfPage: SITE + url, image: SITE + (cover(p.slug) ? cover(p.slug) + '-1280.webp' : '/og.png?v=7'), articleSection: p.category, wordCount: words(p.body), inLanguage: 'en-US', author: { '@type': 'Organization', name: 'Aria', url: SITE + '/' }, publisher: { '@type': 'Organization', name: 'Aria', logo: { '@type': 'ImageObject', url: SITE + '/apple-touch-icon.png' } } },
      { '@type': 'BreadcrumbList', itemListElement: [['Aria', '/'], ['Blog', '/blog'], [p.title, url]].map(([n, u], i) => ({ '@type': 'ListItem', position: i + 1, name: n, item: SITE + u })) },
    ];
    const body = `<div class="wrap"><div class="phead"><div><p class="crumbs"><a href="/">Aria</a> / <a href="/blog">Blog</a> / ${esc(p.category)}</p><h1>${esc(p.title)}</h1><p class="lede">${esc(p.description)}</p><p class="meta">By the Aria team · <time datetime="${p.date}">${fmtDate(p.date)}</time> · ${mins} min read</p></div>${cover(p.slug) ? '' : `<span class="art" style="--t:${tint}" aria-hidden="true"><img src="/assets/i/icon-${art}-cut.webp" alt="" width="170" height="170"></span>`}</div>${cover(p.slug) ? `<figure class="pcover" style="--t:${tint}"><img src="${cover(p.slug)}-1280.webp" srcset="${cover(p.slug)}-640.webp 640w, ${cover(p.slug)}-1280.webp 1280w" sizes="(max-width:1200px) 100vw, 1120px" alt="" width="1280" height="714" fetchpriority="high"></figure>` : ''}
<div class="post"><div><article>
${html}
</article>
<p class="note">This article is general information, not legal, tax or financial advice. Rules differ by payer, state and contract, so check the details with your accountant, attorney or payer.</p>
<section class="endcta"><img class="endcta-art" src="/assets/i/spot-join-480.webp" alt="" width="480" height="480" loading="lazy" decoding="async"><div><h2>Aria is the financial home for independent practices</h2><p>Cards, bill pay, books and insurer payments in one place, run by an AI CFO. Join the waitlist to be first in line.</p><a class="btn" href="/#waitlist">Join the waitlist</a></div></section>
</div><aside class="side">${toc.length > 2 ? '<nav class="toc" aria-label="On this page"><b>On this page</b>' + toc.map(([id, t]) => '<a href="#' + id + '">' + inline(t) + '</a>').join('') + '</nav>' : ''}<div class="join"><h3>Get Aria early</h3><p>Built for practice owners and office managers. No cost to join the waitlist.</p><a class="btn" href="/#waitlist">Join the waitlist</a></div></aside></div></div>
<section class="more"><div class="wrap"><h2>Keep reading</h2><ul class="grid">${related.concat(fill).map(card).join('')}</ul></div></section>`;
    write('blog/' + p.slug + '.html', shell({ title: p.title + ' | Aria', desc: p.description, url, head: ld(graph), body, og: cover(p.slug) ? cover(p.slug) + '-1280.webp' : '/og.png?v=7' }));
    pages.push({ url, priority: '0.6', lastmod: p.date });
  }

  const indexGraph = [{ '@type': 'Blog', '@id': SITE + '/blog#blog', name: 'Aria blog', url: SITE + '/blog', description: 'Practical guides on getting paid, cash flow, spending and books for independent medical practices.', blogPost: live.slice(0, 20).map((p) => ({ '@type': 'BlogPosting', headline: p.title, url: SITE + '/blog/' + p.slug, datePublished: p.date })) }];
  const indexBody = `<div class="wrap"><div class="bhead"><p class="eyebrow">The Aria blog</p><h1>Practice finance, explained plainly.</h1><p class="lede">Guides for owners and office managers of independent practices: getting paid by insurers, cash flow, spending, and books that close on time.</p></div>
<ul class="grid">${live.map(card).join('')}</ul></div>`;
  write('blog.html', shell({ title: 'Blog: practice finance, explained plainly | Aria', desc: 'Practical guides on getting paid, cash flow, spending and books for independent medical practices.', url: '/blog', head: ld(indexGraph), body: indexBody }));
  pages.push({ url: '/blog', priority: '0.7', lastmod: live[0].date });

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>Aria blog</title><link>${SITE}/blog</link><atom:link href="${SITE}/blog/rss.xml" rel="self" type="application/rss+xml"/><description>Practice finance, explained plainly.</description><language>en-us</language>
${live.slice(0, 30).map((p) => `<item><title>${esc(p.title)}</title><link>${SITE}/blog/${p.slug}</link><guid>${SITE}/blog/${p.slug}</guid><pubDate>${new Date(p.date + 'T13:00:00Z').toUTCString()}</pubDate><category>${esc(p.category)}</category><description>${esc(p.description)}</description></item>`).join('\n')}
</channel></rss>
`;
  write('blog/rss.xml', rss);
  return pages;
}
