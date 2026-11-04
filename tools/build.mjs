// Build step (Vercel runs `node tools/build.mjs`, output in dist/).
// The site is one page (index.html) with hash views. This copies the site into dist/ and
// writes one entry page per product, industry and specialty (e.g. /bill-pay, /for/dermatology)
// with its own title, description, canonical URL and structured data, so search engines and
// link previews see each page on its own. Each entry page is the same app: it opens the
// matching view on load. Also writes sitemap.xml. index.html itself is never edited here.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'dist');
const SITE = 'https://ariapractice.com';
const SKIP = new Set(['.git', 'dist', 'tools', 'api', 'node_modules', '.vercel', 'vercel.json', 'package.json', 'README.md']);

const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

const PRODUCTS = [
  ['products', '/products', 'Products: cards, bill pay, books and insurer payments',
   'One platform for your practice’s money: the Aria Card, expenses, bill pay, bookkeeping, underpayment checks, denials, patient payments and claims advance.'],
  ['spend', '/card', 'Aria Card: the business card for medical practices',
   'A card built for medical practices: 2% back on supplies, no annual fee, cards and limits for each staff member, and receipts matched for you.'],
  ['expenses', '/expense-management', 'Expense management for medical practices',
   'Replace expense reports and shoeboxes of receipts. Staff text a photo of the receipt and Aria codes it, matches it to the charge and files it.'],
  ['bill-pay', '/bill-pay', 'Automated bill pay for medical practices',
   'Every vendor bill in one queue. Forward a bill and Aria reads it, routes it for approval and pays it on time, so supplies keep arriving.'],
  ['see', '/underpayments', 'Underpayment checks: see what each insurer paid',
   'See what each insurer paid, whether it matched what you were owed, and whether it reached your bank. Aria flags short payments for you.'],
  ['accounting', '/bookkeeping', 'Bookkeeping and month-end close for medical practices',
   'Books that are already done when the month ends. Aria codes card spend, bills and insurer deposits and keeps your accounting current.'],
  ['cfo-hub', '/cfo-hub', 'CFO Hub: every location’s money in one view',
   'Your locations, bills and insurer payments in one view, with an AI CFO that tells you what needs you today. Built for independent practices.'],
  ['bridge', '/bridge', 'Bridge Payments: pay vendors now, settle later',
   'Pay vendors on your schedule, not the insurers’. Bridge Payments lets your practice pay supply bills now and settle when insurer money lands.'],
  ['treasury', '/treasury', 'Treasury for medical practices',
   'Put your practice’s idle cash to work while keeping enough ready for payroll and every bill. Built for independent medical practices.'],
  ['claims-advance', '/claims-advance', 'Claims Advance: get paid on claims tomorrow',
   'Get paid on insurance claims tomorrow, not in 60 days. Advance claims once they’re submitted, so payroll never waits on an insurer.'],
  ['denials', '/denials', 'Denial management for medical practices',
   'Catch and fix denied claims fast. Aria ranks denials by dollars at stake, drafts the appeal and tracks it until the insurer pays.'],
  ['patient-payments', '/patient-payments', 'Patient payments without the awkward calls',
   'Show patients their share before the visit, charge the card on file once the insurer pays, and send payment links by text or email. No collection calls.'],
  ['marketplace', '/marketplace', 'Medical supply marketplace preview',
   'Medical supplies at clear prices for independent clinics: one cart across vendors, with 5% back. A preview of what’s coming in Aria.'],
  ['specialties', '/specialties', 'Built for how your practice buys: every specialty',
   'Each specialty spends differently. See how Aria fits primary care, specialists, surgical, dental, eye care, infusion, post-acute and animal care.'],
];

const INDUSTRIES = [
  ['in-primary', '/industries/primary-care', 'Primary and behavioral care'],
  ['in-specialists', '/industries/specialists', 'Medical specialists'],
  ['in-infusion', '/industries/infusion', 'Infusion and buy-and-bill'],
  ['in-surgical', '/industries/surgical', 'Surgical and procedural practices'],
  ['in-facilities', '/industries/surgery-centers', 'Surgery centers and diagnostics'],
  ['in-dental', '/industries/dental', 'Dental practices'],
  ['in-eye', '/industries/eye-care', 'Eye care'],
  ['in-aesthetics', '/industries/aesthetics-rehab', 'Aesthetics and rehab'],
  ['in-postacute', '/industries/post-acute', 'Post-acute care and pharmacy'],
  ['in-animal', '/industries/veterinary', 'Veterinary and animal care'],
];

// ---------- helpers ----------
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const text = (html) => html.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&#39;|&rsquo;/g, '’').replace(/\s+/g, ' ').trim();
// "GI & endoscopy practices", "surgery centers": lower-case words, keep acronyms, add "practices" where it reads naturally
const who = (name) => {
  const n = name.split(' ').map((w) => (/^[A-Z]{2,}(-[A-Z]+)?$/.test(w) ? w : w.toLowerCase())).join(' ');
  return /(groups|centers|labs|care|pharmacy)$/.test(n) ? n : n + ' practices';
};
const clip = (s, n) => (s.length <= n ? s : s.slice(0, s.lastIndexOf(' ', n - 1)).replace(/[,;:]$/, '') + '…');

function viewHtml(view) {
  const re = new RegExp('<div class="view"[^>]*data-view="' + view + '"', 'g');
  const m = re.exec(src);
  if (!m) return '';
  const next = src.indexOf('<div class="view"', m.index + 10);
  return src.slice(m.index, next < 0 ? src.length : next);
}
function faqs(html) {
  const out = [];
  const re = /<details><summary>([\s\S]*?)<\/summary>\s*<div class="ans">([\s\S]*?)<\/div>\s*<\/details>/g;
  let m;
  while ((m = re.exec(html))) out.push([text(m[1]), text(m[2])]);
  return out;
}
function block(html, startRe, endMarker) {
  const m = startRe.exec(html);
  if (!m) return '';
  const end = html.indexOf(endMarker, m.index);
  return html.slice(m.index, end < 0 ? undefined : end);
}

const ORG = {
  '@type': 'Organization', '@id': SITE + '/#org', name: 'Aria', url: SITE + '/',
  logo: SITE + '/apple-touch-icon.png',
  description: 'Aria is the financial home for independent medical practices: cards, bill pay, accounting and insurer payments in one place, run by an AI CFO.',
  parentOrganization: { '@type': 'Organization', name: 'Wellby Health' },
};
const WEBSITE = { '@type': 'WebSite', '@id': SITE + '/#site', name: 'Aria', url: SITE + '/', publisher: { '@id': SITE + '/#org' } };

function ld(graph) {
  return '<script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c') + '</script>';
}
function crumbs(list) {
  return { '@type': 'BreadcrumbList', itemListElement: list.map(([name, url], i) => ({ '@type': 'ListItem', position: i + 1, name, item: SITE + url })) };
}
function faqPage(url, qa) {
  if (!qa.length) return null;
  return { '@type': 'FAQPage', '@id': SITE + url + '#faq', mainEntity: qa.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) };
}

function setMeta(html, attr, key, value) {
  const re = new RegExp('(<meta ' + attr + '="' + key + '" content=")[^"]*(")');
  if (!re.test(html)) throw new Error('missing meta ' + key);
  return html.replace(re, (_, a, b) => a + esc(value) + b);
}
function page({ url, title, desc, view, graph }) {
  let h = src;
  h = h.replace(/<title>[\s\S]*?<\/title>/, '<title>' + esc(title) + '</title>');
  h = setMeta(h, 'name', 'description', desc);
  h = setMeta(h, 'property', 'og:title', title);
  h = setMeta(h, 'property', 'og:description', desc);
  h = setMeta(h, 'property', 'og:url', SITE + url);
  h = setMeta(h, 'name', 'twitter:title', title);
  h = setMeta(h, 'name', 'twitter:description', desc);
  let head = '<link rel="canonical" href="' + SITE + url + '">\n' + ld(graph.filter(Boolean)) + '\n';
  // Entry pages open their view: the app routes on the hash, so hand it over before the app starts.
  if (view) head += '<script>if(!location.hash)history.replaceState(null,"","/"+location.search+"#' + view + '");</script>\n';
  return h.replace('</head>', head + '</head>');
}
function write(rel, html) {
  const f = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, html);
}

// ---------- copy static files ----------
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT);
for (const name of fs.readdirSync(ROOT)) {
  if (SKIP.has(name) || name.startsWith('.')) continue;
  fs.cpSync(path.join(ROOT, name), path.join(OUT, name), { recursive: true });
}

const pages = [];
const add = (p) => { pages.push(p); write(p.url === '/' ? 'index.html' : p.url.slice(1) + '.html', page(p)); };

// ---------- home ----------
const homeQa = faqs(block(src, /<section class="sec" id="faq">/g, '</section>'));
const homeTitle = (src.match(/<title>([\s\S]*?)<\/title>/) || [])[1];
const homeDesc = (src.match(/<meta name="description" content="([^"]*)"/) || [])[1];
pages.push({ url: '/', priority: '1.0' });
write('index.html', src.replace('</head>', '<link rel="canonical" href="' + SITE + '/">\n' + ld([ORG, WEBSITE, faqPage('/', homeQa)].filter(Boolean)) + '\n</head>'));

// ---------- products ----------
for (const [view, url, title, desc] of PRODUCTS) {
  const vh = viewHtml(view);
  if (!vh) throw new Error('no view ' + view);
  add({
    url, view, title: title + ' | Aria', desc, priority: '0.8',
    graph: [ORG, WEBSITE,
      { '@type': 'WebPage', '@id': SITE + url, url: SITE + url, name: title, description: desc, isPartOf: { '@id': SITE + '/#site' }, about: { '@id': SITE + '/#org' } },
      crumbs(view === 'products' || view === 'specialties' ? [['Aria', '/'], [title.split(':')[0], url]] : [['Aria', '/'], ['Products', '/products'], [title.split(':')[0], url]]),
      faqPage(url, faqs(vh))],
  });
}

// ---------- industries and specialties ----------
const specRe = /<button type="button" role="tab" class="stab" id="st-([a-z0-9-]+)"[^>]*>([\s\S]*?)<\/button>/g;
let specCount = 0;
for (const [view, url, label] of INDUSTRIES) {
  const vh = viewHtml(view);
  if (!vh) throw new Error('no view ' + view);
  const h1 = text((vh.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || ['', ''])[1]);
  const desc = clip(h1 + ' Cards, bill pay, books and insurer payment checks for ' + label.toLowerCase() + ', run by an AI CFO.', 158);
  add({
    url, view, title: 'Aria for ' + label + ': card, bill pay and AI CFO', desc, priority: '0.7',
    graph: [ORG, WEBSITE,
      { '@type': 'WebPage', '@id': SITE + url, url: SITE + url, name: 'Aria for ' + label, description: desc, isPartOf: { '@id': SITE + '/#site' } },
      crumbs([['Aria', '/'], ['Specialties', '/specialties'], [label, url]]),
      view === 'in-dental' ? faqPage(url, faqs(vh)) : null],
  });
  let m;
  specRe.lastIndex = 0;
  while ((m = specRe.exec(vh))) {
    const key = m[1], name = text(m[2]);
    const panel = block(vh, new RegExp('id="sp-' + key + '"', 'g'), 'role="tabpanel"');
    const heads = (panel.match(/<h2[^>]*>([\s\S]*?)<\/h2>/) || ['', ''])[1];
    const lead = text((panel.match(/<p(?: class="(?!eyebrow)[^"]*")?>([\s\S]*?)<\/p>/) || ['', ''])[1]);
    const hook = text(heads);
    const surl = '/for/' + key;
    const sdesc = clip((hook ? hook + ' ' : '') + (lead ? lead + ' ' : '') + 'Aria is the financial home for ' + who(name) + '.', 158);
    add({
      url: surl, view: 'for-' + key, title: 'Aria for ' + name + ': the practice card and AI CFO', desc: sdesc, priority: '0.6',
      graph: [ORG, WEBSITE,
        { '@type': 'WebPage', '@id': SITE + surl, url: SITE + surl, name: 'Aria for ' + name, description: sdesc, isPartOf: { '@id': SITE + '/#site' } },
        crumbs([['Aria', '/'], ['Specialties', '/specialties'], [label, url], [name, surl]]),
        faqPage(surl, faqs(panel))],
    });
    specCount++;
  }
}

// ---------- sitemap ----------
const today = new Date().toISOString().slice(0, 10);
write('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  pages.map((p) => '  <url><loc>' + SITE + p.url + '</loc><lastmod>' + today + '</lastmod><priority>' + p.priority + '</priority></url>').join('\n') +
  '\n</urlset>\n');

console.log('built ' + pages.length + ' pages (' + specCount + ' specialties), home FAQ ' + homeQa.length);
