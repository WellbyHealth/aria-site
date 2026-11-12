// Aria website generator. Writes every page of ariapractice.com into dist/ as static HTML.
// Pages: home, platform and five products, specialties (index, groups, 39 specialties), marketplace
// (home, categories, products), blog, security, join, 404. Content lives in this file and site/data/.
import { GUIDES } from './data/group-guides.mjs';
import { DEPTH } from './data/product-depth.mjs';
import { MFAQ } from './data/market-faqs.mjs';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { parse as parsePost, md } from '../tools/blog.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'dist');
const SITE = 'https://ariapractice.com';
const APP = 'https://cfo-hub-jade.vercel.app/login';
const TODAY = new Date().toISOString().slice(0, 10);
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'site/data/specialties.json'), 'utf8'));
const write = (rel, html) => { const f = path.join(OUT, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, html); };

// ---------------------------------------------------------------- assets
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const OGH = (rel) => { const f = path.join(ROOT, 'og', rel + '.jpg'); return fs.existsSync(f) ? `/og/${rel}.jpg?v=${hash(f)}` : null; };
const cpDir = (from, to) => fs.existsSync(from) && fs.cpSync(from, to, { recursive: true });
cpDir(path.join(ROOT, 'assets'), path.join(OUT, 'assets'));
cpDir(path.join(ROOT, 'site/img'), path.join(OUT, 'assets/site'));
cpDir(path.join(ROOT, 'og'), path.join(OUT, 'og'));
for (const f of ['favicon.ico', 'apple-touch-icon.png', 'og.png', 'robots.txt', 'privacy.html', 'demo.html']) if (fs.existsSync(path.join(ROOT, f))) fs.copyFileSync(path.join(ROOT, f), path.join(OUT, f));
const hash = (f) => crypto.createHash('md5').update(fs.readFileSync(f)).digest('hex').slice(0, 8);
fs.copyFileSync(path.join(ROOT, 'site/style.css'), path.join(OUT, 'assets/site/style.css'));
fs.copyFileSync(path.join(ROOT, 'site/app.js'), path.join(OUT, 'assets/site/app.js'));
const CSS = '/assets/site/style.css?v=' + hash(path.join(ROOT, 'site/style.css'));
const JS = '/assets/site/app.js?v=' + hash(path.join(ROOT, 'site/app.js'));
const IMG = (n) => '/assets/site/' + n + '.webp';

// ---------------------------------------------------------------- drawings
const I = {
  hub: '<circle cx="16" cy="16" r="4.5"/><ellipse cx="16" cy="9" rx="4" ry="7"/><ellipse cx="16" cy="9" rx="4" ry="7" transform="rotate(72 16 16)"/><ellipse cx="16" cy="9" rx="4" ry="7" transform="rotate(144 16 16)"/><ellipse cx="16" cy="9" rx="4" ry="7" transform="rotate(216 16 16)"/><ellipse cx="16" cy="9" rx="4" ry="7" transform="rotate(288 16 16)"/>',
  card: '<rect x="3.5" y="8" width="25" height="16" rx="3"/><path d="M3.5 13h25M8 19.5h5"/>',
  vial: '<path d="M12 4h8M13 4v4l-3 4v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V12l-3-4V4M10 16h12"/>',
  bill: '<path d="M8 3.5h12l4 4V28.5H8z"/><path d="M20 3.5v4h4M12 13h8M12 17h8M12 21h5"/>',
  flex: '<circle cx="8" cy="20" r="3"/><circle cx="16" cy="15" r="4"/><circle cx="25" cy="10" r="5"/>',
  shield: '<path d="M16 3.5l10 4v7c0 6.5-4.3 11-10 13.5C10.3 25.5 6 21 6 14.5v-7z"/><path d="M11.5 15.5l3 3 6-6.5"/>',
  lock: '<rect x="7" y="14" width="18" height="13" rx="2.5"/><path d="M11 14V10a5 5 0 0 1 10 0v4"/>',
  check: '<circle cx="16" cy="16" r="12"/><path d="M10.5 16.5l3.5 3.5 7.5-8"/>',
  chart: '<path d="M4 27.5h24M7 22l6-6 5 4 8-10"/>',
  bank: '<path d="M4 12.5L16 5l12 7.5M6 12.5h20M8 13v10M13 13v10M19 13v10M24 13v10M4 27h24"/>',
  plug: '<path d="M12 4v6M20 4v6M8 10h16v4a8 8 0 0 1-16 0zM16 22v6"/>',
  receipt: '<path d="M8 3.5h16v25l-3-2-2.5 2-2.5-2-2.5 2-2.5-2-3 2z"/><path d="M12 10h8M12 14h8M12 18h5"/>',
  users: '<circle cx="12" cy="11" r="4"/><path d="M4 26a8 8 0 0 1 16 0"/><circle cx="22" cy="12" r="3"/><path d="M21 19a6 6 0 0 1 7 6"/>',
  calendar: '<rect x="4" y="6.5" width="24" height="21" rx="3"/><path d="M4 12.5h24M10 4v5M22 4v5"/>',
  sparkle: '<path d="M16 4c1 6 3 8 9 9-6 1-8 3-9 9-1-6-3-8-9-9 6-1 8-3 9-9z"/>',
  bell: '<path d="M9 22V14a7 7 0 0 1 14 0v8l2 3H7z"/><path d="M13.5 27a2.5 2.5 0 0 0 5 0"/>',
  stethoscope: '<path d="M8 4v8a6 6 0 0 0 12 0V4M14 18v3a6 6 0 0 0 12 0v-2"/><circle cx="26" cy="16" r="2.5"/>',
  microscope: '<path d="M12 4l6 3-4 8-6-3zM14 15l-2 4M6 27h20M10 27a8 8 0 0 1 12-7"/>',
  drop: '<path d="M16 4c5 7 8 11 8 15a8 8 0 0 1-16 0c0-4 3-8 8-15z"/>',
  scalpel: '<path d="M5 27l14-14 3 3L10 27z"/><path d="M19 13l6-7 2 2-5 8"/>',
  building: '<rect x="6" y="6" width="20" height="22" rx="1.5"/><path d="M16 10v6M13 13h6M13 28v-5h6v5"/>',
  tooth: '<path d="M10 5c3 0 4 1.5 6 1.5S19 5 22 5c3.5 0 5 3 4.5 7-.5 4-2 6-3 10-.6 2.4-2.5 2.6-3.2.2L19 18h-6l-1.3 4.2c-.7 2.4-2.6 2.2-3.2-.2-1-4-2.5-6-3-10C5 8 6.5 5 10 5z"/>',
  eye: '<path d="M3 16s5-8.5 13-8.5S29 16 29 16s-5 8.5-13 8.5S3 16 3 16z"/><circle cx="16" cy="16" r="4"/>',
  house: '<path d="M5 15L16 6l11 9M8 13v14h16V13"/><path d="M16 17v6M13 20h6"/>',
  box: '<path d="M4 10l12-5 12 5v13l-12 5-12-5z"/><path d="M4 10l12 5 12-5M16 15v13"/>',
};
const ic = (n, cls = 'ic') => `<svg class="${cls}" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n] || ''}</svg>`;
const MARK = `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" aria-hidden="true" stroke-width="3" stroke-linecap="round"><circle cx="50" cy="50" r="46" stroke-width="3"/><path d="M51.674,31.872 A11,11 0 0 1 39.269,18.582"/><path d="M43.114,12.422 A11,11 0 0 1 58.084,28.460"/><path d="M60.514,35.138 A11,11 0 0 1 56.416,17.425"/><path d="M62.826,14.013 A11,11 0 0 1 67.771,35.388"/><path d="M66.537,42.386 A11,11 0 0 1 71.844,24.998"/><path d="M79.101,25.248 A11,11 0 0 1 72.696,46.231"/><path d="M68.128,51.674 A11,11 0 0 1 81.418,39.269"/><path d="M87.578,43.114 A11,11 0 0 1 71.540,58.084"/><path d="M64.862,60.514 A11,11 0 0 1 82.575,56.416"/><path d="M85.987,62.826 A11,11 0 0 1 64.612,67.771"/><path d="M74.752,79.101 A11,11 0 0 1 53.769,72.696"/><path d="M57.614,66.537 A11,11 0 0 1 75.002,71.844"/><path d="M56.886,87.578 A11,11 0 0 1 41.916,71.540"/><path d="M48.326,68.128 A11,11 0 0 1 60.731,81.418"/><path d="M37.174,85.987 A11,11 0 0 1 32.229,64.612"/><path d="M39.486,64.862 A11,11 0 0 1 43.584,82.575"/><path d="M20.899,74.752 A11,11 0 0 1 27.304,53.769"/><path d="M33.463,57.614 A11,11 0 0 1 28.156,75.002"/><path d="M12.422,56.886 A11,11 0 0 1 28.460,41.916"/><path d="M31.872,48.326 A11,11 0 0 1 18.582,60.731"/><path d="M35.138,39.486 A11,11 0 0 1 17.425,43.584"/><path d="M14.013,37.174 A11,11 0 0 1 35.388,32.229"/><path d="M42.386,33.463 A11,11 0 0 1 24.998,28.156"/><path d="M25.248,20.899 A11,11 0 0 1 46.231,27.304"/></svg>`;
// The Aria figure: the Financial Hub at the center, five products as petals.
function figure() {
  const cx = 300, cy = 300, labs = [['02', 'Aria Card'], ['03', 'Buy-and-bill', 'lending'], ['04', 'Bill pay'], ['05', 'Flex Pay'], ['06', 'Marketplace']];
  const pos = (a, r) => [cx + r * Math.sin((a * Math.PI) / 180), cy - r * Math.cos((a * Math.PI) / 180)];
  let s = `<svg viewBox="0 0 600 600" role="img" aria-label="The Aria figure: the Financial Hub at the center, with the Aria Card, buy-and-bill lending, bill pay, Flex Pay and the marketplace around it" fill="none" stroke="currentColor" stroke-width="1"><circle cx="${cx}" cy="${cy}" r="262" opacity=".55"/>`;
  for (const a of [0, 72, 144, 216, 288]) s += `<ellipse class="petal" cx="${cx}" cy="${cy - 104}" rx="84" ry="138" transform="rotate(${a} ${cx} ${cy})" opacity=".7"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="64" opacity=".8"/><g stroke="none" fill="#171721" font-family="Inter,system-ui,sans-serif" text-anchor="middle"><text x="${cx}" y="${cy - 8}" font-size="11" fill="#787886">01</text><text x="${cx}" y="${cy + 12}" font-size="17">Financial Hub</text>`;
  labs.forEach(([n, a, b], i) => { const [x, y] = pos(i * 72, 176); s += `<text x="${x}" y="${y - 12}" font-size="11" fill="#787886">${n}</text><text x="${x}" y="${y + 8}" font-size="16">${a}</text>${b ? `<text x="${x}" y="${y + 28}" font-size="16">${b}</text>` : ''}`; });
  return s + '</g></svg>';
}
const appFrame = (img, alt, url = 'app.ariapractice.com') => `<div class="appframe"><div class="af-bar"><i></i><i></i><i></i><span>${url}</span></div><img src="${img}" alt="${esc(alt)}" width="1600" height="1000" loading="lazy" decoding="async"></div>`;

// ---------------------------------------------------------------- content
const PRODUCTS = [
  { key: 'hub', url: '/hub', name: 'Financial Hub', icon: 'hub', img: 'p-hub', shot: '/assets/i/app-home.webp',
    short: 'Every account, card and payer in one view, with insights on what to do next.',
    title: 'Financial dashboard for medical practices', h1: 'See every dollar your practice earns and spends.',
    lead: 'The Financial Hub connects your bank accounts, cards, payroll and insurer payments, then tells you what needs you: cash 13 weeks ahead, payers paying short, costs creeping up.',
    steps: [['Connect once', 'Link your bank, accounting software and clearinghouse. Read-only, so nothing moves.'], ['Aria reads everything', 'Deposits are matched to remittances, spending is coded, payroll is placed on the calendar.'], ['You get the decisions', 'A short list of what needs you each week, with the fix drafted.']],
    features: [['chart', '13-week cash forecast', 'See payroll and the lowest week coming, a month before it arrives.'], ['check', 'Every insurer payment checked', 'Each deposit matched to its 835 and compared with your contract rate.'], ['building', 'Every location side by side', 'Collections, costs and margin by location, provider and payer.'], ['bell', 'Alerts that ask first', 'Short pays, slow payers and low cash flagged early. Nothing moves without you.'], ['receipt', 'Books that stay current', 'Transactions coded and synced to QuickBooks or Xero as they post.'], ['users', 'Built for owners and office managers', 'Roles and approvals, so the right person sees the right numbers.']],
    faqs: [['What does the Hub connect to?', 'Your bank accounts and cards through a read-only connection, your accounting software, your clearinghouse’s 835 remittance files, and your payroll provider.'], ['Does Aria move money?', 'No. The Hub reads your accounts. Payments only happen through the Aria Card, bill pay or Flex Pay, and only after someone approves them.'], ['Do you need patient data?', 'Only what is in the remittance files you already receive, and only after we sign a business associate agreement with you.']] },
  { key: 'card', url: '/card', name: 'Aria Card', icon: 'card', img: 'p-card', shot: '/assets/i/app-banking.webp',
    short: '2% back on the med-surg supplies you already buy, with cards for every staff member.',
    title: 'Business credit card for medical practices', h1: '2% back on the supplies you already buy.',
    lead: 'The Aria Card earns 2% back on med-surg supplies, gives every staff member their own card with limits, and matches every receipt for you, so the books close themselves.',
    steps: [['Issue cards in minutes', 'Physical and virtual cards for providers, MAs and office managers, each with its own limits.'], ['Buy what you already buy', 'Distributor orders, lab supplies and vendor bills go on the card instead of checks.'], ['Earn and close', '2% back on med-surg supplies, receipts matched by text, every purchase coded.']],
    features: [['card', '2% back on med-surg supplies', 'On the gloves, syringes, drugs and devices your practice reorders every month.'], ['users', 'A card for every staff member', 'Physical and virtual cards with limits by person, vendor and category.'], ['receipt', 'Receipts by text', 'Staff text a photo. Aria reads it, matches it to the charge and files it.'], ['shield', 'Controls that hold', 'Off-policy purchases are declined at the register. Budgets reset each month.'], ['bill', 'Automated bookkeeping', 'Every purchase coded to healthcare categories and synced to your books.'], ['building', 'Every location on one program', 'Each office gets the same cards, budgets and rules.']],
    faqs: [['What counts as med-surg supplies?', 'Medical and surgical supplies bought for your practice, such as gloves, syringes, wound care, injectables and devices from medical distributors. The full list will be in the card terms at launch.'], ['Is there an annual fee?', 'Pricing and fees will be set out in writing in the card terms before you apply.'], ['Who issues the card?', 'Cards will be issued by a licensed partner bank, which we will name before launch. Aria is a financial technology company, not a bank.']] },
  { key: 'lending', url: '/lending', name: 'Buy-and-bill lending', icon: 'vial', img: 'p-lending', shot: '/assets/i/app-cfo.webp',
    short: 'Pay for injectables and infused drugs now. Repay when the claim pays.',
    title: 'Buy-and-bill financing for medical practices', h1: 'Pay for the drug now. Repay when the claim pays.',
    lead: 'Buy-and-bill practices pay distributors weeks before insurers pay them. Aria lending covers that gap, so a growing injection or infusion volume never squeezes payroll.',
    steps: [['Order as usual', 'Buy anti-VEGF, oncology and infusion drugs from your distributor on the Aria Card.'], ['Aria covers the gap', 'Draw on your line for the order. The Hub ties each draw to its claims.'], ['Repay from the claim', 'When the insurer pays, the draw is repaid from the deposit, on terms you agreed to up front.']],
    features: [['vial', 'Built for buy-and-bill', 'Sized to your drug spend and your payers’ real days to pay.'], ['chart', 'Tied to your claims', 'See each draw next to the claims it is waiting on.'], ['calendar', 'Repayment that follows cash', 'Repay as insurer deposits arrive, not on a fixed date that ignores them.'], ['card', 'Still earn on the card', 'Drug orders go on the Aria Card, so you keep the card rewards that apply.'], ['shield', 'Terms in writing first', 'Rates, limits and fees in writing before you draw a dollar.'], ['hub', 'Part of your financial home', 'Lending, cash and payers in the same Hub.']],
    faqs: [['Who provides the financing?', 'Financing will be provided by a licensed lending partner, named before launch. Terms will be in writing before you apply.'], ['What can I use it for?', 'Drug and supply orders for buy-and-bill care, such as injections and infusions, where you pay before the insurer pays you.'], ['How is it repaid?', 'From insurer deposits as claims pay, on terms agreed up front.']] },
  { key: 'bill-pay', url: '/bill-pay', name: 'Bill pay', icon: 'bill', img: 'p-billpay', shot: '/assets/i/app-payments.webp',
    short: 'Every vendor bill read, approved and paid on time, then synced to your books.',
    title: 'Bill pay and accounts payable for medical practices', h1: 'Every bill read, approved and paid on time.',
    lead: 'Forward a bill or snap a photo. Aria reads it, checks it for duplicates, routes it for approval and pays it on the due date, then records it in QuickBooks or Xero.',
    steps: [['Forward the bill', 'Email it to your Aria inbox or upload a photo. Distributor, lab and lease bills all land in one queue.'], ['Approve in a tap', 'Aria fills in the vendor, amount, due date and category. You approve or ask a question.'], ['Paid and recorded', 'Paid by ACH, check or card on the due date, then synced to your books.']],
    features: [['bill', 'One queue for every bill', 'Distributors, labs, leases and software in one place.'], ['check', 'Duplicate checks', 'Bills that match one already paid are held for you to look at.'], ['users', 'Approval rules', 'Route by amount, vendor or location to the right approver.'], ['calendar', 'Paid on the due date', 'Never early, never late, and timed to your cash.'], ['receipt', 'Synced to your books', 'Each payment coded and matched in QuickBooks or Xero.'], ['flex', 'Pay over time when it helps', 'Move a large bill to Flex Pay in one click.']],
    faqs: [['How do bills get into Aria?', 'Forward them to your Aria bill inbox, upload a PDF or text a photo.'], ['How are vendors paid?', 'By ACH, check or card, depending on what the vendor accepts.'], ['Does it work with our accounting software?', 'Yes. Payments sync to QuickBooks and Xero, with NetSuite and Sage Intacct for larger groups.']] },
  { key: 'flex-pay', url: '/flex-pay', name: 'Flex Pay', icon: 'flex', img: 'p-flexpay', shot: null,
    short: 'Pay suppliers in installments, on a schedule that fits your cash.',
    title: 'Flexible supplier payments for medical practices', h1: 'Pay your suppliers on your schedule.',
    lead: 'Flex Pay lets you pay a large supplier or equipment bill in installments, while the supplier is paid in full today. You keep cash for payroll and growth.',
    steps: [['Pick a bill', 'Choose any approved bill in bill pay.'], ['Choose a schedule', 'Spread it over the installments offered, with the cost shown before you confirm.'], ['Supplier paid in full', 'The supplier is paid now. You repay on the schedule you picked.']],
    features: [['flex', 'Installments on any approved bill', 'Supplies, equipment and large distributor orders.'], ['check', 'The cost up front', 'See the full cost before you confirm. No surprises later.'], ['chart', 'Planned into your forecast', 'Installments show in the Hub’s 13-week cash forecast.'], ['users', 'Suppliers paid in full', 'Your suppliers get paid today, so relationships stay strong.']],
    faqs: [['Who provides Flex Pay?', 'Flex Pay will be offered with a licensed lending partner, named before launch, with terms in writing before you use it.'], ['Which bills qualify?', 'Approved supplier and equipment bills in Aria bill pay, within the limit you are approved for.'], ['Does it affect our credit?', 'The terms, including any credit checks, will be set out in writing before you apply.']] },
];
const P = Object.fromEntries(PRODUCTS.map((p) => [p.key, p]));
const HOME_FAQ = [['What is Aria?', 'Aria is the financial home for independent medical practices: a Financial Hub that connects all your accounts and insurer payments, the Aria Card with 2% back on med-surg supplies, buy-and-bill lending, bill pay, Flex Pay and a supply marketplace.'], ['Is Aria a bank?', 'No. Aria is a financial technology company. Accounts, cards and lending will be provided by licensed partner institutions, which we will name before launch.'], ['Do we have to switch banks?', 'No. Connect the bank you have today and start with the card. Move more over only when it helps.'], ['What will it cost?', 'Pricing isn’t final. You will see pricing and terms in writing before you apply for anything, and joining the waitlist is free.'], ['Does it work with our accounting software?', 'Yes. Aria syncs with QuickBooks and Xero, and NetSuite and Sage Intacct for larger groups.'], ['Does it work across multiple locations?', 'Yes. Cards, budgets and reports work by location, and every view can be filtered by site.']];

const GURL = { 'primary-care': 'primary-and-behavioral-care', infusion: 'infusion-and-buy-and-bill' };
const gurl = (slug) => '/specialties/' + (GURL[slug] || slug);
const GROUP_ICON = { 'primary-care': 'stethoscope', specialists: 'microscope', infusion: 'drop', surgical: 'scalpel', 'surgery-centers': 'building', dental: 'tooth', 'eye-care': 'eye', 'aesthetics-rehab': 'sparkle', 'post-acute': 'house' };
const GROUP_NAME = { 'primary-care': 'Primary and behavioral care', specialists: 'Medical specialists', infusion: 'Infusion and buy-and-bill', surgical: 'Surgical and procedural', 'surgery-centers': 'Surgery centers and diagnostics', dental: 'Dental', 'eye-care': 'Eye care', 'aesthetics-rehab': 'Aesthetics and rehab', 'post-acute': 'Post-acute and pharmacy' };
const GROUP_CATS = { dental: ['dental', 'gloves', 'ppe', 'cleaning'], 'surgery-centers': ['ppe', 'wound-care', 'sharps', 'cleaning'], surgical: ['wound-care', 'syringes-needles', 'ppe', 'sharps'], infusion: ['syringes-needles', 'sharps', 'gloves', 'ppe'], 'post-acute': ['wound-care', 'gloves', 'specimen-collection', 'equipment'], 'primary-care': ['exam-room', 'specimen-collection', 'syringes-needles', 'gloves'], specialists: ['exam-room', 'equipment', 'gloves', 'specimen-collection'], 'eye-care': ['equipment', 'gloves', 'cleaning', 'syringes-needles'], 'aesthetics-rehab': ['syringes-needles', 'gloves', 'cleaning', 'exam-room'] };
const BUYBILL = new Set(['infusion', 'rheumatology', 'nephrology', 'ophthalmology', 'allergy', 'urology', 'gastroenterology', 'specialty-pharmacy']);

const CATS = [
  ['gloves', 'Gloves', 'Exam and surgical gloves in every size and material.', 'Gloves are the item most practices reorder most often. Nitrile is the default for exam use because it resists punctures and avoids latex allergies. Latex still has a place where fit and feel matter, and sterile surgical gloves are sized by half sizes. Buy by the case once you know your usage: most clinics go through a box per exam room every week or two.',
    [['nitrile-exam-gloves', 'Nitrile exam gloves, powder-free', 'Everyday exam gloves with textured fingertips.', { Material: 'Nitrile', Sizes: 'XS to XL', Pack: '100 per box, 10 boxes per case', Sterility: 'Non-sterile' }], ['latex-exam-gloves', 'Latex exam gloves, powder-free', 'Close fit and high tactile feel for routine exams.', { Material: 'Natural rubber latex', Sizes: 'XS to XL', Pack: '100 per box, 10 boxes per case', Sterility: 'Non-sterile' }], ['sterile-surgical-gloves', 'Sterile surgical gloves', 'Individually paired for procedures.', { Material: 'Latex or synthetic', Sizes: '5.5 to 9 in half sizes', Pack: '50 pairs per box', Sterility: 'Sterile' }], ['vinyl-exam-gloves', 'Vinyl exam gloves', 'A low-cost glove for short, low-risk tasks.', { Material: 'Vinyl', Sizes: 'S to XL', Pack: '100 per box, 10 boxes per case', Sterility: 'Non-sterile' }]]],
  ['wound-care', 'Wound care', 'Gauze, dressings, tape and bandages.', 'Wound care covers the basics every exam room keeps stocked and the advanced dressings used after procedures. Match the dressing to the wound: gauze and non-adherent pads for most minor wounds, foam and hydrocolloid for drainage and longer wear. Sterile packs belong anywhere the wound is open.',
    [['gauze-sponges', 'Gauze sponges, 4 x 4 in', 'Woven cotton gauze for cleaning and dressing.', { Size: '4 x 4 in', Ply: '12-ply', Pack: '200 per sleeve', Sterility: 'Non-sterile and sterile options' }], ['non-adherent-pads', 'Non-adherent pads', 'Pads that do not stick to the wound bed.', { Size: '3 x 4 in', Pack: '100 per box', Sterility: 'Sterile' }], ['foam-dressing', 'Foam dressings with border', 'Absorbent dressings for moderate drainage.', { Sizes: '4 x 4 in, 6 x 6 in', Pack: '10 per box', Sterility: 'Sterile' }], ['medical-tape', 'Medical tape', 'Paper, cloth and silicone tapes for secure dressings.', { Width: '1 in and 2 in', Pack: '12 rolls per box' }]]],
  ['syringes-needles', 'Syringes and needles', 'Syringes, hypodermic needles and safety devices.', 'Most injections in the clinic use a 1 mL or 3 mL syringe with a 25 to 27 gauge needle. Safety needles with a shield help meet sharps-safety rules. Insulin and tuberculin syringes come with the needle attached, and Luer-lock tips keep needles from slipping off during aspiration.',
    [['luer-lock-syringe-3ml', 'Luer-lock syringes, 3 mL', 'General-purpose syringes without needle.', { Volume: '3 mL', Tip: 'Luer-lock', Pack: '100 per box', Sterility: 'Sterile' }], ['tuberculin-syringe', 'Tuberculin syringes, 1 mL', 'For precise small-volume doses.', { Volume: '1 mL', Needle: '27G x 1/2 in, attached', Pack: '100 per box', Sterility: 'Sterile' }], ['safety-needles', 'Safety hypodermic needles', 'Needles with a hinged safety shield.', { Gauges: '18G to 30G', Lengths: '1/2 in to 1 1/2 in', Pack: '100 per box' }], ['insulin-syringes', 'Insulin syringes', 'Fixed-needle syringes for insulin dosing.', { Volume: '0.3, 0.5 and 1 mL', Needle: '30G and 31G', Pack: '100 per box' }]]],
  ['exam-room', 'Exam room', 'Table paper, tongue depressors, applicators and drapes.', 'The exam room runs on small things that run out at the worst moment: table paper, drapes and gowns, tongue depressors, cotton-tipped applicators and specula. Standard table paper rolls are 18 or 21 inches wide; check your tables before you order.',
    [['exam-table-paper', 'Exam table paper', 'Smooth or crepe paper for exam tables.', { Width: '18 in and 21 in', Length: '225 ft per roll', Pack: '12 rolls per case' }], ['tongue-depressors', 'Wooden tongue depressors', 'Smooth birch depressors.', { Size: '6 in', Pack: '500 per box', Sterility: 'Non-sterile' }], ['cotton-applicators', 'Cotton-tipped applicators', 'Wood-shaft applicators with cotton tips.', { Length: '6 in', Pack: '1,000 per box', Sterility: 'Non-sterile and sterile options' }], ['patient-gowns', 'Disposable patient gowns', 'Tissue-poly-tissue gowns for exams.', { Size: 'Universal', Pack: '50 per case' }]]],
  ['ppe', 'PPE', 'Masks, gowns, face shields and eye protection.', 'Personal protective equipment protects staff and patients. Procedure masks cover routine care. Fit-tested N95 respirators are for airborne precautions, and isolation gowns are rated by AAMI level for fluid resistance. Keep a few weeks of stock on hand, since PPE shortages hit small practices first.',
    [['procedure-masks', 'Procedure masks, ear loop', 'Three-ply masks for routine care.', { Rating: 'ASTM Level 1 to 3 options', Pack: '50 per box' }], ['n95-respirators', 'N95 respirators', 'NIOSH-approved respirators for airborne precautions.', { Fit: 'Requires fit testing', Pack: '20 per box' }], ['isolation-gowns', 'Isolation gowns', 'Fluid-resistant gowns with knit cuffs.', { Rating: 'AAMI Level 2 and 3', Size: 'Universal and XL', Pack: '50 per case' }], ['face-shields', 'Face shields', 'Full-face shields with foam headband.', { Pack: '24 per box' }]]],
  ['sharps', 'Sharps disposal', 'Sharps containers and mailback systems.', 'Every room that uses needles needs a sharps container within reach. Size the container to the volume: small wall-mounted ones for exam rooms, larger floor units for procedure rooms. Mailback programs work well for practices without a regular medical waste pickup.',
    [['sharps-container-1qt', 'Sharps container, 1 quart', 'Compact container for exam rooms.', { Size: '1 qt', Lid: 'Rotating, closes for disposal', Pack: '100 per case' }], ['sharps-container-2gal', 'Sharps container, 2 gallon', 'For procedure rooms and injection clinics.', { Size: '2 gal', Pack: '20 per case' }], ['wall-bracket', 'Wall-mount bracket', 'Locking bracket for 1 qt to 5 qt containers.', { Pack: 'Each' }], ['sharps-mailback', 'Sharps mailback system', 'Prepaid mailback container for disposal.', { Size: '1 gal and 2 gal', Includes: 'Return shipping and tracking' }]]],
  ['specimen-collection', 'Specimen collection', 'Blood tubes, cups, swabs and transport bags.', 'Specimen supplies have to match what your reference lab accepts. Blood collection tubes are color-coded by additive, so stock the colors your common panels need. Urine cups, swabs and biohazard bags complete the set. Check expiration dates on tubes, since additives lose effectiveness.',
    [['blood-collection-tubes', 'Blood collection tubes', 'Evacuated tubes, color-coded by additive.', { Volumes: '2 to 10 mL', Caps: 'Lavender, red, gold, light blue, green', Pack: '100 per box' }], ['urine-specimen-cups', 'Urine specimen cups', 'Leak-resistant cups with screw lids.', { Volume: '4 oz', Pack: '100 per case', Sterility: 'Sterile and non-sterile' }], ['collection-swabs', 'Collection swabs', 'Flocked and foam swabs with transport tubes.', { Pack: '50 per box', Sterility: 'Sterile' }], ['biohazard-bags', 'Specimen transport bags', 'Biohazard bags with document pouch.', { Size: '6 x 9 in', Pack: '1,000 per case' }]]],
  ['cleaning', 'Cleaning and disinfecting', 'Surface wipes, disinfectants and hand hygiene.', 'Pick disinfectants by contact time and what they kill. Wipes with a short wet time make room turnover faster. Use an EPA-registered disinfectant with claims for the pathogens you care about, and keep hand sanitizer at every entrance and exam room.',
    [['disinfecting-wipes', 'Germicidal disinfecting wipes', 'Ready-to-use wipes for hard surfaces.', { Size: '160 wipes per canister', 'Contact time': 'See label', Pack: '12 canisters per case' }], ['surface-disinfectant-spray', 'Surface disinfectant spray', 'Spray disinfectant for exam rooms.', { Size: '32 oz', Pack: '12 per case' }], ['hand-sanitizer', 'Hand sanitizer, 70% alcohol', 'Gel sanitizer with pump.', { Size: '16 oz and 1 L refill', Pack: '12 per case' }], ['instrument-detergent', 'Enzymatic instrument detergent', 'Pre-cleaner for instruments before sterilization.', { Size: '1 gal', Pack: '4 per case' }]]],
  ['equipment', 'Clinic equipment', 'Monitors, thermometers, oximeters and scales.', 'Small diagnostic equipment lasts years, but it needs the right accessories and calibration. Choose blood pressure monitors with the cuff sizes your patients need, thermometers with disposable probe covers, and oximeters that read reliably at the edges of normal.',
    [['bp-monitor', 'Digital blood pressure monitor', 'Automatic upper-arm monitor with adult cuffs.', { Cuffs: 'Small, adult and large adult', Power: 'AC and battery' }], ['pulse-oximeter', 'Fingertip pulse oximeter', 'SpO2 and pulse rate at a glance.', { Display: 'OLED', Power: '2 AAA batteries' }], ['digital-thermometer', 'Digital thermometer', 'Oral, axillary and rectal use with probe covers.', { Readout: 'About 10 seconds', Includes: 'Probe covers' }], ['digital-scale', 'Digital physician scale', 'Floor scale with BMI function.', { Capacity: 'Up to 550 lb', Power: 'AC and battery' }]]],
  ['dental', 'Dental', 'Instruments, cotton rolls, prophy and infection control.', 'Dental practices reorder disposables constantly: cotton rolls, prophy angles and paste, saliva ejectors, bibs and barrier film. Pair them with infection-control basics like sterilization pouches and surface barriers, and buy by the case for the items each operatory uses every day.',
    [['cotton-rolls', 'Cotton rolls', 'Absorbent rolls for isolation.', { Size: '#2 medium, 1.5 in', Pack: '2,000 per box', Sterility: 'Non-sterile' }], ['prophy-angles', 'Disposable prophy angles', 'Latex-free cups for polishing.', { Cup: 'Soft and firm', Pack: '100 per box' }], ['saliva-ejectors', 'Saliva ejectors', 'Flexible ejectors with tips.', { Pack: '100 per bag' }], ['sterilization-pouches', 'Self-seal sterilization pouches', 'Pouches with color-change indicators.', { Sizes: '2.25 x 4 in to 7.5 x 13 in', Pack: '200 per box' }]]],
].map(([slug, name, short, guide, prods]) => ({ slug, name, short, guide, prods: prods.map(([s, n, d, specs]) => ({ slug: s, name: n, desc: d, specs })) }));

// ---------------------------------------------------------------- page shell
const MEGA_COLS = [
  ['Financial Hub', 'Connect every account and payer and see what needs you.', [['Financial Hub', '/hub'], ['Insights and forecasts', '/hub'], ['The platform', '/platform']]],
  ['Cards & Spend', 'Issue cards in seconds and earn 2% back on supplies.', [['Aria Card', '/card'], ['Expense management', '/card'], ['Supply marketplace', '/marketplace']]],
  ['Lending', 'Capital that follows how a practice gets paid.', [['Buy-and-bill lending', '/lending'], ['Flex Pay', '/flex-pay']]],
  ['Payments & Accounting', 'Pay vendors on time and keep the books current.', [['Bill pay', '/bill-pay'], ['Flex Pay', '/flex-pay'], ['Accounting sync', '/bill-pay']]],
];
const NAV_PRODUCTS = `<div class="mega-in"><div class="mega-lead"><b class="mega-h">Practice banking</b><p>Manage your practice’s money at every stage of growth.</p>
<a class="mega-row" href="/specialties"><b>Specialties</b><span>Built for 39 kinds of practice</span></a><a class="mega-row" href="/marketplace"><b>Marketplace</b><span>Med-surg supplies with 2% back</span></a>
<a class="mega-demo" href="${APP}">Try the demo ↗</a></div>
${MEGA_COLS.map(([h, d, l]) => `<div class="mega-col"><b>${h}</b><p>${d}</p><span class="mega-k">Products</span>${l.map(([n, u]) => `<a href="${u}">${n}</a>`).join('')}</div>`).join('')}</div>
<a class="mega-foot" href="/join"><b>Join the waitlist <i>→</i></b><span>Be first to open an account when Aria launches.</span></a>`;
const SPARK = '<svg class="spark" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"><path d="M10 3l1.6 5.4L17 10l-5.4 1.6L10 17l-1.6-5.4L3 10l5.4-1.6z"/><path d="M18 3v4M16 5h4"/></svg>';
const ICO = {
  eye: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  snow: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7M9 4l3 2 3-2M9 20l3-2 3 2"/></svg>',
  sliders: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>',
  pen: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M4 20l4-1L19 8l-3-3L5 16l-1 4z"/></svg>',
};
function header() {
  return `<header class="hdr"><div class="wrap hdr-row">
<a class="brand" href="/" aria-label="Aria home">${MARK}<b>ARIA</b></a>
<nav class="nav" aria-label="Main"><div class="dd mega"><button type="button" aria-expanded="false">Products</button><div class="dd-panel">${NAV_PRODUCTS}</div></div>
<a href="/specialties">Specialties</a><a href="/marketplace">Marketplace</a><a href="/blog">Resources</a></nav>
<div class="hdr-end"><a class="login" href="${APP}">Log in</a><a class="btn btn-accent btn-sm" href="/join">Join the waitlist</a></div>
<button class="menu-btn" type="button" aria-label="Menu" aria-expanded="false"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 8h16M4 16h16"/></svg></button>
</div><nav class="mnav" aria-label="Mobile">${PRODUCTS.map((p) => `<a class="sub" href="${p.url}">${p.name}</a>`).join('')}<a href="/platform">Platform</a><a href="/specialties">Specialties</a><a href="/marketplace">Marketplace</a><a href="/blog">Resources</a><a href="${APP}">Log in</a><a class="btn btn-dark" href="/join">Join the waitlist</a></nav></header>`;
}
function footer() {
  const groups = Object.entries(GROUP_NAME);
  return `<footer class="ftr"><div class="wrap"><div class="ftr-grid">
<div><a class="brand" href="/">${MARK}<b>ARIA</b></a><p style="max-width:300px">Your practice’s financial home. Keep more of every dollar you make.</p></div>
<div><h4>Products</h4><ul><li><a href="/platform">Platform</a></li>${PRODUCTS.map((p) => `<li><a href="${p.url}">${p.name}</a></li>`).join('')}</ul></div>
<div><h4>Specialties</h4><ul>${groups.map(([s, n]) => `<li><a href="${gurl(s)}">${n}</a></li>`).join('')}</ul></div>
<div><h4>Marketplace</h4><ul>${CATS.slice(0, 8).map((c) => `<li><a href="/marketplace/${c.slug}">${c.name}</a></li>`).join('')}<li><a href="/marketplace">All supplies</a></li></ul></div>
<div><h4>Company</h4><ul><li><a href="/blog">Blog</a></li><li><a href="/tools">Calculators</a></li><li><a href="/security">Security</a></li><li><a href="${APP}">Try the demo</a></li><li><a href="/join">Join the waitlist</a></li><li><a href="/privacy">Privacy</a></li></ul></div>
</div><div class="legal"><p>Aria is a financial technology company, not a bank. Banking, card and lending services will be provided by licensed partner institutions, which will be named before launch. All products are subject to application and approval, and terms will be provided in writing before you apply.</p><p>Product images and app screens use sample data. They do not show real accounts, patients or customers.</p><p>© 2026 Aria, built by Wellby Health.</p></div></div></footer>`;
}
function ld(graph) { return '<script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@graph': graph.filter(Boolean) }).replace(/</g, '\\u003c') + '</script>'; }
const ORG = { '@type': 'Organization', '@id': SITE + '/#org', name: 'Aria', url: SITE + '/', logo: SITE + '/apple-touch-icon.png', description: 'Aria is the financial home for independent medical practices: a financial hub, the Aria Card, buy-and-bill lending, bill pay and a supply marketplace.' };
const crumbsLd = (list) => ({ '@type': 'BreadcrumbList', itemListElement: list.map(([n, u], i) => ({ '@type': 'ListItem', position: i + 1, name: n, item: SITE + u })) });
const faqLd = (url, qa) => (qa.length ? { '@type': 'FAQPage', '@id': SITE + url + '#faq', mainEntity: qa.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) } : null);
const crumbs = (list) => `<nav class="crumbs" aria-label="Breadcrumb">${list.map(([n, u], i) => (i < list.length - 1 ? `<a href="${u}">${esc(n)}</a> / ` : esc(n))).join('')}</nav>`;
const faqHtml = (qa) => `<div class="faq">${qa.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>`;
const signup = (form, cls = '') => `<form class="signup ${cls}" data-signup="${form}" data-next="/join"><label class="sr" for="em-${form}">Work email</label><input id="em-${form}" class="field" type="email" name="email" placeholder="Work email" autocomplete="email" required><button class="btn btn-dark" type="submit">Join the waitlist</button></form>`;
const ctaBand = (h = 'Your practice’s financial home.', p = 'Join the waitlist and we’ll reach out as we open access. No cost, no commitment.') => `<section class="sec tight"><div class="wrap"><div class="cta-band reveal"><h2>${h}</h2><p class="lead">${p}</p>${signup('cta-' + Math.random().toString(36).slice(2, 6))}<p class="signup-note">Pricing and terms in writing before you apply for anything.</p></div></div></section>`;

// Cut a description to 160 characters at a sentence end when possible, else at a word.
function clip(t, max = 160) {
  if (t.length <= max) return t;
  const cut = t.slice(0, max), end = cut.lastIndexOf('. ');
  if (end >= 70) return cut.slice(0, end + 1);
  return cut.slice(0, max - 3).replace(/[\s,;:]+\S*$/, '') + '…';
}
const pages = [];
function page({ url, title, desc, body, graph = [], priority = '0.6', heroImg, noindex }) {
  if (desc.length < 70) desc = desc.replace(/\.?$/, '.') + ' For independent medical practices, paid on the Aria Card.';
  if (desc.length > 160) desc = clip(desc);
  const ogImg = (url !== '/' && OGH(url.slice(1))) || '/og.png?v=21', ogAlt = ogImg.startsWith('/og/') ? title.replace(/&amp;/g, '&') : 'Aria: radically different banking for healthcare';
  const full = title.includes('Aria') || title.replace(/&amp;/g, '&').length > 53 ? title : title + ' | Aria';
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(full)}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${SITE}${url}">
<meta property="og:type" content="website"><meta property="og:title" content="${esc(full)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${SITE}${url}"><meta property="og:site_name" content="Aria"><meta property="og:locale" content="en_US"><meta property="og:image" content="${SITE}${ogImg}"><meta property="og:image:secure_url" content="${SITE}${ogImg}"><meta property="og:image:type" content="${ogImg.includes('.jpg') ? 'image/jpeg' : 'image/png'}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${esc(ogAlt)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(full)}"><meta name="twitter:description" content="${esc(desc)}"><meta name="twitter:image" content="${SITE}${ogImg}">
${noindex ? '<meta name="robots" content="noindex">' : ''}<link rel="icon" href="/favicon.ico?v=5" sizes="48x48"><link rel="icon" type="image/svg+xml" href="/assets/site/mark.svg"><link rel="apple-touch-icon" href="/apple-touch-icon.png?v=5"><meta name="theme-color" content="#fbfbfc">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300..600&family=Newsreader:ital,opsz,wght@1,6..72,400&display=swap">
${heroImg ? `<link rel="preload" as="image" href="${heroImg}">` : ''}<link rel="stylesheet" href="${CSS}">
${ld([ORG, ...graph])}
</head><body>
${header()}<main id="main">${body}</main>${footer()}<script src="${JS}" defer></script></body></html>`;
  write(url === '/' ? 'index.html' : url.slice(1) + '.html', html);
  if (!noindex) pages.push({ url, priority, html: body });
}
const webPage = (url, name, desc) => ({ '@type': 'WebPage', '@id': SITE + url, url: SITE + url, name, description: desc, isPartOf: { '@type': 'WebSite', name: 'Aria', url: SITE + '/' } });

// ---------------------------------------------------------------- home
function homePage() {
  const acc = [
    ['hub', 'Financial Hub', 'Connect your bank, cards, payroll and insurer payments in one place. See cash 13 weeks ahead and get insights on what needs you.'],
    ['card', 'Aria Card and expenses', '2% back on the med-surg supplies you already buy. A card for every staff member, receipts matched by text, and books coded for you.'],
    ['lending', 'Buy-and-bill lending and Flex Pay', 'Pay for injectables now and repay when the claim pays. Spread large supplier bills over time.'],
    ['bill-pay', 'Bill pay and accounting', 'Every vendor bill read, approved and paid on time, then synced to QuickBooks or Xero.'],
  ];
  const groups = DATA.groups;
  const body = `
<section class="hero2"><div class="wrap">
<span class="pill-note"><i>835</i>Banking that speaks healthcare</span>
<h1>Radically different banking for healthcare.</h1>
<p class="lead">Your bank sees deposits. Aria sees the claims behind them, lends the way you get paid and earns 2% back on the supplies you already buy. Join the waitlist for banking unlike anything that’s come before.</p>
<div class="hero-ctas"><form class="pill-form" data-signup="hero" data-next="/join"><label class="sr" for="em-hero">Work email</label><input id="em-hero" type="email" name="email" placeholder="Enter your email" autocomplete="email" required><button class="btn btn-accent" type="submit">Join the waitlist</button></form><a class="btn btn-ghost" href="${APP}">Try the demo</a></div>
</div>
<div class="wrap"><div class="stage" style="--hero:url(${IMG('hero')})">
<div class="stage-app"><img src="${P.hub.shot}" alt="Aria Financial Hub with sample practice data" width="1600" height="1000"></div>
<div class="stage-side"><div class="vcard"><span class="vc-top"><i></i>Active</span>${MARK}<span class="vc-name">Supplies</span><span class="vc-num">•••• 0001</span><span class="vc-back">2% back</span></div>
<div class="mini"><span>Medline Industries</span><b>−$2,184.20</b><em>+$43.68 cash back</em></div></div>
</div><p class="stage-note">Aria is a financial technology company, not a bank. Banking services will be provided by licensed partner institutions.</p></div></section>

<section class="sec"><div class="wrap">
<div class="sec-head center"><span class="label">Why Aria</span><h2>We know how your practice gets paid.</h2><p class="lead">A typical bank sees a lump deposit and a card swipe. Aria sees the payer, the claim, the drug and the location behind every dollar.</p></div>
<div class="vp-grid">
<a class="vp reveal" href="/hub"><div class="vp-art"><div class="dep"><div class="dep-h"><span>UnitedHealthcare deposit</span><b>$12,480.00</b></div><div class="dep-r"><span>Claim 4471 · 99214</span><em>Paid in full</em></div><div class="dep-r"><span>Claim 4472 · 20610</span><em>Paid in full</em></div><div class="dep-r warn"><span>Claim 4475 · J0702</span><em>$310 short</em></div></div></div>
<span class="vp-k">01</span><h3>We see your claims.</h3><p>Every insurer deposit is matched to the remittance behind it, so short pays and denials surface the day the money lands, not at month end.</p><span class="vp-line">Your bank sees deposits. We see claims.</span></a>
<a class="vp reveal" href="/lending"><div class="vp-art"><div class="loan"><div><span>Eylea order funded</span><b>−$18,600</b></div><div class="arrow-d"></div><div><span>Medicare claim paid</span><b class="pos">+$21,240</b></div><div class="arrow-d"></div><div class="on"><span>Repaid from claim</span><b>Keep $2,640</b></div></div></div>
<span class="vp-k">02</span><h3>Credit built on how you get paid.</h3><p>Banks lend on last year’s tax return. Aria’s buy-and-bill lending is sized to your drug volume and repaid when the claim pays, not on a fixed monthly schedule.</p><span class="vp-line">Lending that waits for Medicare, so you don’t have to.</span></a>
<a class="vp reveal" href="/card"><div class="vp-art"><div class="rw"><div><span>Medline · exam gloves</span><em>+$83.68</em></div><div><span>McKesson · syringes</span><em>+$52.70</em></div><div><span>Henry Schein · wound care</span><em>+$41.20</em></div><div class="tot"><span>Back this month</span><b>$177.58</b></div></div></div>
<span class="vp-k">03</span><h3>Rewards where you actually spend.</h3><p>Generic cards reward flights and ads. The Aria Card earns 2% back on the med-surg supplies that make up most of a practice’s spending.</p><span class="vp-line">2% back on gloves, not airline miles.</span></a>
</div></div></section>

<section class="sec" style="padding-top:0"><div class="wrap">
<div class="sec-head"><span class="label">The difference</span><h2>Aria vs. a typical business bank.</h2></div>
<div class="tw"><table class="tbl cmp-t"><thead><tr><th></th><th>Typical business bank</th><th class="hl">Aria</th></tr></thead><tbody>
<tr><th>Insurer deposits</th><td>One lump sum from the payer</td><td class="hl">Matched to each claim, with short pays flagged</td></tr>
<tr><th>Cash forecast</th><td>Last month projected forward</td><td class="hl">13 weeks ahead, based on when each payer usually pays</td></tr>
<tr><th>Lending</th><td>Underwritten on tax returns, fixed monthly payments</td><td class="hl">Sized to drug volume, repaid from claim payments</td></tr>
<tr><th>Card rewards</th><td>Travel, software and ads</td><td class="hl">2% on medical and surgical supplies</td></tr>
<tr><th>Books</th><td>Sorted by vendor</td><td class="hl">By provider, location and payer</td></tr>
<tr><th>Patient data</th><td>Often won’t sign a BAA</td><td class="hl">Signs a BAA before handling remittance files</td></tr>
<tr><th>Built for</th><td>Every kind of business</td><td class="hl">39 healthcare specialties, from retina to dentistry</td></tr>
</tbody></table></div>
<p class="muted" style="font-size:14px;margin-top:14px">Lending, card and account terms are set at launch with licensed partner institutions and given in writing before you apply.</p>
</div></section>

<section class="sec"><div class="wrap">
<div class="hs-rule"></div><h2 class="hs-h">Practice banking’s been a headache. Now it’s a head start.</h2>
<div class="hs-grid">
<a class="hs reveal" href="/card"><div class="hs-art"><div class="hs-stack s2"></div><div class="hs-stack"></div><div class="vcard big"><span class="vc-top"><i></i>Active</span>${MARK}<span class="vc-name">Front desk</span><span class="vc-num">•••• 4207</span><span class="vc-back">Limit $2,500 / mo</span></div></div><h3>Give every staff member a card</h3><p>Spin up a card for the front desk, the surgery center or one supplier, each with its own limit. Receipts get matched by text.</p></a>
<a class="hs reveal" href="/bill-pay"><div class="hs-art"><div class="doc"><b>Invoice</b><div class="doc-meta"><i></i><i></i><i></i></div><div class="doc-tbl"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div></div><span class="chip c1">${SPARK}Henry Schein</span><span class="chip c2">${SPARK}GL 5010</span><span class="chip c3">${SPARK}$4,874.75</span></div><h3>Watch bills pay themselves</h3><p>Forward a supplier invoice. Aria reads it, codes it, and pays it on the due date once you approve.</p></a>
<a class="hs reveal" href="/lending"><div class="hs-art"><div class="tl"><div><span>Mar 3</span><b>Eylea ordered</b><em>−$18,600 funded by Aria</em></div><div><span>Apr 11</span><b>Medicare claim paid</b><em>+$21,240</em></div><div class="on"><span>Apr 11</span><b>Loan repaid automatically</b><em>Margin kept $2,640</em></div></div></div><h3>Buy drugs before the claim pays</h3><p>Buy-and-bill lending covers injectables up front and settles itself when the payer pays.</p></a>
<a class="hs reveal" href="/hub"><div class="hs-art"><div class="alert"><span class="al-k">Insight</span><b>Aetna paid 18% under contract on 42 claims</b><p>$6,310 owed since September. Appeal letters are drafted.</p><span class="al-btn">Review claims</span></div></div><h3>Know what needs you</h3><p>The Hub watches your deposits, payers and spend, and flags the money you’re owed before it slips away.</p></a>
</div></div></section>

<section class="sec" style="padding-top:0"><div class="wrap">
<h2 class="center-h">An entire financial platform, powered by your Aria account.</h2>
<div class="pf-grid">
<a class="pf reveal" href="/card"><div class="pf-art pf-cards"><div class="ghost">Supplies</div><div class="ghost">Front desk</div><div class="ghost">Surgery center</div><div class="ghost">Dr. Patel</div><div class="vcard"><span class="vc-top"><i></i>Active</span>${MARK}<span class="vc-name">Supplies</span><span class="vc-num">•••• 0001</span></div><div class="ghost">Marketing</div><div class="ghost">Lab</div><div class="ghost">Software</div><div class="ghost">Travel</div></div><h3>Aria Card</h3><p>Earn 2% back on the med-surg supplies you already buy, with a card for every staff member.</p><span class="pf-go">→</span></a>
<a class="pf reveal" href="/lending"><div class="pf-art"><div class="pf-panel"><span class="pf-k">Buy-and-bill line</span><b class="pf-big">$250,000</b><div class="bar"><i style="width:62%"></i></div><div class="lg"><span><i></i>Drawn for drugs</span><span><i class="l"></i>Available</span></div></div></div><h3>Buy-and-bill lending</h3><p>Pay for injectables and infusions now. Repay automatically when the claim pays.</p><span class="pf-go">→</span></a>
<a class="pf reveal" href="/flex-pay"><div class="pf-art"><div class="pf-panel"><span class="pf-k">McKesson invoice</span><div class="ring-row"><svg viewBox="0 0 40 40" width="52" height="52"><circle cx="20" cy="20" r="16" fill="none" stroke="#dcdaf5" stroke-width="5"/><circle cx="20" cy="20" r="16" fill="none" stroke="#5651d8" stroke-width="5" stroke-dasharray="33.5 100.5" transform="rotate(-90 20 20)" stroke-linecap="round"/></svg><div><b>$38,400</b> paid in 3 parts<br><span class="muted">1 of 3 paid · next Dec 15</span></div></div></div></div><h3>Flex Pay</h3><p>Spread a large supplier bill over 30, 60 or 90 days while your cash keeps working.</p><span class="pf-go">→</span></a>
</div></div></section>

<section class="sec"><div class="wrap split">
<div class="figure-card reveal">${figure()}<div class="figure-cap">Figure A<b>Aria</b></div></div>
<div><span class="label">One home</span><h2 style="margin-top:18px">One financial home, many everyday uses.</h2>
<p class="lead" style="margin-top:22px">Banking was never built for a medical practice. Insurers pay weeks late, supplies cost more every year, and the numbers live in six systems. Aria puts them in one place.</p>
<p style="margin-top:16px">The Financial Hub sits at the center. Around it, the Aria Card, buy-and-bill lending, bill pay, Flex Pay and the supply marketplace each do one job well, and every dollar they touch shows up in the Hub.</p>
<p style="margin-top:28px"><a class="link arrow" href="/platform">See the platform</a></p></div></div></section>

<section class="sec" style="padding-top:0"><div class="wrap">
<div class="sec-head"><span class="label">The platform</span><h2>Everything your practice does with money. All in one place.</h2></div>
<div class="acc"><div class="acc-list">${acc.map(([k, t, d], i) => `<div class="acc-item${i ? '' : ' open'}"><button type="button" aria-expanded="${!i}">${t}</button><div class="acc-body"><p>${d}</p><img class="m-art" src="${IMG(P[k].img)}" alt="" loading="lazy" width="1200" height="900"><a class="link arrow" href="${P[k].url}">Learn more</a></div></div>`).join('')}</div>
<div class="acc-art art">${acc.map(([k], i) => `<img class="${i ? '' : 'on'}" src="${IMG(P[k].img)}" alt="" width="1200" height="900"${i ? ' loading="lazy"' : ''}>`).join('')}</div></div></div></section>

<section class="sec"><div class="wrap split">
<div class="cmp reveal"><div class="cmp-col"><b>$12,000</b><div class="cmp-bar" style="height:100%"></div><span>Aria Card</span></div><div class="cmp-col"><b>$0</b><div class="cmp-bar thin" style="height:3%"></div><span>Check or ACH</span></div></div>
<div><h2 class="sm-h">Keep more of what you already spend on supplies.</h2><p style="margin-top:24px"><a class="btn btn-soft" href="/card">Learn more</a></p>
<ul class="arrows"><li>A practice buying $50,000 of med-surg supplies a month earns about $12,000 back a year on the Aria Card.</li><li>Paying the same invoices by check or ACH earns nothing.</li></ul></div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap split">
<div><h2 class="sm-h">Control spend effortlessly with rules that fit a practice.</h2>
<ul class="arrows"><li>Give front desk, nursing and billing staff only the cards and accounts they need</li><li>Require approval for large orders and choose who can pay without it</li><li>Lock a card to one supplier, like Henry Schein or Medline, with its own monthly limit</li></ul></div>
<div class="cc-stage reveal"><div class="cc"><div class="cc-h"><span>Front desk card</span><i>×</i></div>
<div class="wcard"><div class="wc-top"><span class="vc-top"><i></i>Active</span>${MARK}</div><div class="wc-chip"></div><div class="wc-foot"><div><b>Front desk card</b><span>•••• •••• •••• 0001</span></div></div></div>
<div class="cc-acts"><span>${ICO.eye}Details</span><span>${ICO.snow}Freeze</span><span>${ICO.sliders}Limits</span><span>${ICO.pen}Nickname</span></div>
<div class="cc-limit"><span>Monthly limit</span><b>$2,500.00</b></div>
<div class="cc-rows"><div><i></i>Posted<em>−$1,815.00</em></div><div><i class="l"></i>Pending<em>−$212.40</em></div><div><i class="g"></i>Available to spend<em class="g">$472.60</em></div></div>
<div class="cc-det"><b>Details</b><div><span>Merchant lock</span><span>Henry Schein</span></div></div></div></div></div></section>


<section class="sec" style="padding-top:0"><div class="wrap split rev">
<div><h2 class="sm-h">Money that moves itself, on your rules.</h2>
<ul class="arrows"><li>Separate accounts for operating, payroll, supplies and taxes</li><li>Sweep every insurer deposit into operating the day it lands</li><li>Top up payroll before every run so it never comes up short</li></ul>
<p style="margin-top:28px"><a class="link arrow" href="/hub">See the Financial Hub</a></p></div>
<div class="acct reveal"><div class="acct-h"><b>Accounts</b><span class="pill">+ Create account</span></div><span class="pf-k">Available</span><b class="acct-big">$612,480<sup>.32</sup></b>
<div class="acct-t"><div class="acct-r head"><span>Account</span><span>Balance</span><span>Rule</span></div>
<div class="acct-r"><span>${MARK}Operating</span><span>$318,204<sup>.11</sup></span><span><i class="r1"></i>Sweep insurer deposits here<em>Daily</em></span></div>
<div class="acct-r"><span>${MARK}Payroll</span><span>$142,000<sup>.00</sup></span><span><i class="r2"></i>Restore to $140,000<em>Before each run</em></span></div>
<div class="acct-r"><span>${MARK}Supplies</span><span>$61,776<sup>.21</sup></span><span><i class="r3"></i>Pay Aria Card in full<em>Every 15th</em></span></div>
<div class="acct-r"><span>${MARK}Tax reserve</span><span>$90,500<sup>.00</sup></span><span><i class="r4"></i>Save 25% of net income<em>Monthly</em></span></div></div></div></div></section>

<section class="sec"><div class="wrap">
<div class="sec-head"><span class="label">The app</span><h2>See your practice the way your CFO would.</h2><p class="lead">Cash, insurer payments and what needs you, on one screen. This is the real app with sample data.</p></div>
<div class="art frame reveal">${appFrame('/assets/i/app-home.webp', 'The Aria Financial Hub with cash on hand, accounts, insurer payments, payroll and open items, using sample data')}</div>
<p style="margin-top:28px"><a class="btn btn-line" href="${APP}">Try the demo</a> <span class="muted" style="margin-left:12px;font-size:15px">Sample data, no sign-up</span></p></div></section>

<section class="sec" style="padding-top:0"><div class="wrap split rev">
<div><span class="label">Marketplace</span><h2 style="margin-top:18px">The supplies you reorder, in one place.</h2>
<p class="lead" style="margin-top:22px">Gloves, wound care, syringes, PPE and exam room basics from one catalog, paid on the Aria Card so every order earns back.</p>
<div class="chips" style="margin-top:28px">${CATS.slice(0, 6).map((c) => `<a class="chip" href="/marketplace/${c.slug}">${c.name}</a>`).join('')}</div>
<p style="margin-top:28px"><a class="link arrow" href="/marketplace">Browse the marketplace</a></p></div>
<div class="art reveal"><img src="${IMG('market')}" alt="Medical supplies: exam gloves, gauze, syringes and a stethoscope" width="2000" height="857" loading="lazy" style="aspect-ratio:4/3"></div></div></section>

<section class="sec" style="padding-top:0"><div class="wrap">
<div class="sec-head"><span class="label">Specialties</span><h2>Built for how your specialty spends.</h2><p class="lead">Anti-VEGF drugs in retina, implants in orthopedics, vaccines in primary care. Every specialty buys differently, and Aria is built around it.</p></div>
<div class="grid g3">${groups.map((g) => `<a class="tile" href="${gurl(g.slug)}">${ic(GROUP_ICON[g.slug])}<h3>${GROUP_NAME[g.slug]}</h3><p>${esc(g.lead)}</p><span class="more arrow">${g.members.length > 1 ? g.members.length + ' specialties' : 'Learn more'}</span></a>`).join('')}</div></div></section>

<section class="sec" style="padding-top:0"><div class="wrap">
<div class="sec-head"><span class="label">Trust</span><h2>Careful with your money and your patients’ data.</h2></div>
<div class="grid g3">
<div class="tile">${ic('bank')}<h4>Licensed partners hold the money</h4><p>Aria is a technology company, not a bank. Accounts, cards and lending will come from licensed partner institutions, named before launch.</p></div>
<div class="tile">${ic('shield')}<h4>A BAA before patient data</h4><p>We won’t take in any patient information until we have signed a business associate agreement with you.</p></div>
<div class="tile">${ic('check')}<h4>Nothing moves without you</h4><p>Aria reads, matches and drafts. Payments happen only after someone at your practice approves them.</p></div></div>
<p style="margin-top:28px"><a class="link arrow" href="/security">How we protect your practice</a></p></div></section>

<section class="sec" style="padding-top:0"><div class="wrap split" style="align-items:start">
<div><span class="label">Questions</span><h2 style="margin-top:18px">What practices ask us.</h2></div>
${faqHtml(HOME_FAQ)}</div></section>
${ctaBand()}`;
  page({ url: '/', title: 'Aria: radically different banking for healthcare', desc: 'Banking that knows healthcare. Aria matches every insurer deposit to its claims, lends on how practices get paid and earns 2% back on med-surg supplies.', body, priority: '1.0', heroImg: IMG('hero'), graph: [{ '@type': 'WebSite', '@id': SITE + '/#site', name: 'Aria', url: SITE + '/' }, faqLd('/', HOME_FAQ)] });
}

// ---------------------------------------------------------------- platform and products
function productPage(p) {
  const pf = [...p.faqs, ...((DEPTH[p.key] || {}).faqs || [])];
  const others = PRODUCTS.filter((x) => x !== p);
  const specs = DATA.specialties.filter((s) => (p.key === 'lending' ? BUYBILL.has(s.slug) : true)).slice(0, 12);
  const body = `
<section class="page-head"><div class="wrap split">
<div>${crumbs([['Aria', '/'], ['Platform', '/platform'], [p.name, p.url]])}<span class="label">${p.name}</span><h1 style="margin-top:18px">${esc(p.h1)}</h1><p class="lead">${esc(p.lead)}</p><div class="actions"><a class="btn btn-dark" href="/join">Join the waitlist</a><a class="link arrow" href="${APP}">Try the demo</a></div></div>
<div class="art"><img src="${IMG(p.img)}" alt="" width="1200" height="900" fetchpriority="high"></div></div></section>
<section class="sec tight"><div class="wrap"><div class="sec-head"><span class="label">How it works</span><h2>Three steps, then it runs.</h2></div>
<ol class="steps">${p.steps.map(([t, d]) => `<li><h4>${t}</h4><p>${d}</p></li>`).join('')}</ol></div></section>
<section class="sec tight"><div class="wrap"><div class="sec-head"><span class="label">What’s included</span><h2>Everything ${p.name === 'Flex Pay' ? 'Flex Pay' : 'it'} does.</h2></div>
<div class="grid g3">${p.features.map(([i, t, d]) => `<div class="tile">${ic(i)}<h4>${t}</h4><p>${d}</p></div>`).join('')}</div></div></section>
${p.shot ? `<section class="sec tight"><div class="wrap"><div class="sec-head"><span class="label">In the app</span><h2>See it with sample data.</h2></div><div class="art frame reveal">${appFrame(p.shot, p.name + ' in the Aria app, sample data')}</div></div></section>` : ''}
<section class="sec tight"><div class="wrap"><div class="sec-head"><span class="label">Specialties</span><h2>Popular with</h2></div><div class="chips">${specs.map((s) => `<a class="chip" href="/specialties/${s.slug}">${esc(s.name)}</a>`).join('')}<a class="chip" href="/specialties">All specialties</a></div></div></section>
${DEPTH[p.key] ? `<section class="sec tight"><div class="wrap split" style="align-items:start"><div><span class="label">An example</span><h2 style="margin-top:18px">What it looks like in a practice.</h2></div><div class="prose">${DEPTH[p.key].example.map((x) => `<p>${esc(x)}</p>`).join('')}</div></div></section>
<section class="sec tight"><div class="wrap"><div class="sec-head"><span class="label">Compared</span><h2>How practices handle it today.</h2></div><div class="tw"><table class="tbl cmp-t"><thead><tr><th></th>${DEPTH[p.key].compare.cols.map((c, i, a) => `<th${i === a.length - 1 ? ' class="hl"' : ''}>${esc(c)}</th>`).join('')}</tr></thead><tbody>${DEPTH[p.key].compare.rows.map((r) => `<tr><th>${esc(r[0])}</th>${r.slice(1).map((c, i, a) => `<td${i === a.length - 1 ? ' class="hl"' : ''}>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div></section>` : ''}
<section class="sec tight"><div class="wrap split" style="align-items:start"><div><span class="label">Questions</span><h2 style="margin-top:18px">About ${p.name}</h2></div>${faqHtml(pf)}</div></section>
<section class="sec tight"><div class="wrap"><div class="sec-head"><span class="label">Works with ${p.name}</span><h2>The rest of your financial home.</h2></div>
<div class="grid g4">${others.map((o) => `<a class="tile" href="${o.url}">${ic(o.icon)}<h4>${o.name}</h4><p>${o.short}</p><span class="more arrow">Learn more</span></a>`).join('')}</div></div></section>
${ctaBand()}`;
  const desc = clip(p.lead);
  page({ url: p.url, title: p.title, desc, body, priority: '0.8', graph: [webPage(p.url, p.title, desc), crumbsLd([['Aria', '/'], ['Platform', '/platform'], [p.name, p.url]]), faqLd(p.url, pf), { '@type': ({ card: 'CreditCard', lending: 'LoanOrCredit', 'flex-pay': 'LoanOrCredit' })[p.key] || 'Service', '@id': SITE + p.url + '#product', name: 'Aria ' + p.name.replace(/^Aria /, ''), description: desc, url: SITE + p.url, provider: { '@id': SITE + '/#org' }, areaServed: 'US', audience: { '@type': 'BusinessAudience', name: 'Independent medical practices' } }] });
}

// ---------------------------------------------------------------- specialties
const specBy = Object.fromEntries(DATA.specialties.map((s) => [s.slug, s]));
const groupOf = (s) => DATA.groups.find((g) => g.slug === s.group);
const map = { card: 'Aria Card', lending: 'Bridge Payments', 'bill-pay': 'Accounts Payable', hub: 'CFO Hub' };

const CALC_FLOAT = `<form class="calc" data-calc="float" onsubmit="return false" aria-label="Injection float calculator"><div><span class="label">Your injection float</span><h3 style="margin:14px 0 22px;font-size:28px">How much cash is sitting in your fridge?</h3><label for="ca">Monthly buy-and-bill drug spend ($)</label><div class="in"><input id="ca" name="a" type="number" inputmode="numeric" min="0" step="5000" value="80000"></div><label for="cb">Days until injection claims are paid</label><div class="in"><input id="cb" name="b" type="number" inputmode="numeric" min="0" max="180" step="5" value="35"></div></div><div class="out"><div><b data-out="float">$0</b><span>tied up in injections at any moment</span></div><div><b data-out="year">$0</b><span>a year back at 2% if it goes on the Aria Card</span></div><p class="fine" style="margin-top:20px">Illustrative only. Card terms are set at launch, and some distributors add a fee for card payments.</p></div></form>`;
const CALC_BACK = `<form class="calc" data-calc="back" onsubmit="return false" aria-label="Supply cash back calculator"><div><span class="label">Your supply cash back</span><h3 style="margin:14px 0 22px;font-size:28px">What your supply orders could earn.</h3><label for="ca">Monthly med-surg supply spend ($)</label><div class="in"><input id="ca" name="a" type="number" inputmode="numeric" min="0" step="1000" value="25000"></div></div><div class="out"><div><b data-out="year">$0</b><span>a year back at 2% on the Aria Card</span></div><div><b data-out="month">$0</b><span>back every month</span></div><p class="fine" style="margin-top:20px">Illustrative only. Rewards apply to eligible med-surg purchases under the card terms at launch.</p></div></form>`;
// Questions every specialty page answers, also used in FAQ schema.
const COMMON_FAQS = [
  ['Is Aria a bank?', 'No. Aria is a financial technology company, not a bank. Banking, card and lending services will be provided by licensed partner institutions, which will be named before launch.'],
  ['Do we have to leave our current bank?', 'No. You can connect your current bank to the Financial Hub and keep using it. Aria accounts, cards and lending are there when you want them.'],
  ['How does the 2% back work?', 'You earn 2% back on medical and surgical supply purchases made on the Aria Card, where the supplier accepts card payment. Full terms are given in writing before you apply.'],
  ['Does Aria need patient information?', 'The Financial Hub works from bank, card and insurer payment data. Where patient details could be involved, such as remittance files, Aria signs a business associate agreement first.'],
];
function publishedPosts() {
  const dir = path.join(ROOT, 'blog/posts');
  return fs.readdirSync(dir).filter((f) => f.endsWith('.md')).map((f) => parsePost(path.join(dir, f))).filter((p) => p.date <= TODAY).sort((a, b) => (a.date < b.date ? 1 : -1));
}
const guideLinks = () => { const ps = publishedPosts().slice(0, 3); return ps.length ? `<section class="sec tight"><div class="wrap"><div class="sec-head"><span class="label">Guides</span><h2>Read next.</h2></div><div class="grid g3">${ps.map((p) => `<a class="tile" href="/blog/${p.slug}"><span class="label">${esc(p.category || 'Guide')}</span><h4>${esc(p.title)}</h4><p>${esc(p.description)}</p><span class="more arrow">Read the guide</span></a>`).join('')}</div></div></section>` : ''; };
// Worked month of spend, payer guidance and a bank checklist for one specialty.
const amt = (t) => Math.abs(Number(String(t).replace(/[^0-9.]/g, '')) || 0);
const fmt$ = (n) => '$' + Math.round(n).toLocaleString('en-US');
function guideSecs(s, who, g) {
  const G = GUIDES[g.slug]; if (!G) return '';
  const rows = s.rows.map((r) => [r.name, r.desc, amt(r.amt)]).filter((r) => r[2] > 0);
  const tot = rows.reduce((a, r) => a + r[2], 0);
  const month = rows.length ? `<section class="sec tight"><div class="wrap split" style="align-items:start"><div><span class="label">A month of spend</span><h2 style="margin-top:18px">What ${esc(who)} could earn back.</h2><p class="lead" style="margin-top:18px">Here are typical orders for one month, with 2% back on each. If your practice places orders like these every month, that is about ${fmt$(tot * 0.02 * 12)} back a year.</p></div>
<div class="tw"><table class="tbl"><thead><tr><th>Order</th><th class="n">Amount</th><th class="n">2% back</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${esc(r[0])}<small style="display:block;color:var(--muted)">${esc(r[1])}</small></td><td class="n">${fmt$(r[2])}</td><td class="n">${fmt$(r[2] * 0.02)}</td></tr>`).join('')}<tr><td><b>Month total</b></td><td class="n"><b>${fmt$(tot)}</b></td><td class="n"><b>${fmt$(tot * 0.02)}</b></td></tr></tbody></table><p class="muted" style="font-size:14px;margin-top:10px">Example orders, not real customer data. Cash back applies where the supplier accepts card payment.</p></div></div></section>` : '';
  return `<section class="sec tight"><div class="wrap split" style="align-items:start"><div><span class="label">Getting paid</span><h2 style="margin-top:18px">How ${esc(who)} get paid.</h2></div><div class="prose">${G.paid.map((p) => `<p>${esc(p)}</p>`).join('')}</div></div></section>
${month}
<section class="sec tight"><div class="wrap split" style="align-items:start"><div><span class="label">Choosing a bank</span><h2 style="margin-top:18px">What to look for in a bank for ${esc(who)}.</h2></div><ul class="checks">${G.look.map((l) => `<li>${esc(l)}</li>`).join('')}</ul></div></section>`;
}
function specialtyPage(s) {
  const g = groupOf(s), url = '/specialties/' + s.slug, name = s.name, lower = name.toLowerCase();
  const who = /(care|lab|labs|pharmacy|centers?|imaging|anesthesia|groups?|nursing|health|hospice)$/i.test(name) ? lower : lower + ' practices';
  const hook = s.hook || g.h1;
  const helps = [['card', s.table['Aria Card']], ['lending', s.table['Bridge Payments']], ['bill-pay', s.table['Accounts Payable']], ['hub', [s.table['CFO Hub'], s.table['Payment Recovery']].filter(Boolean).join(' ')]].filter(([, t]) => t);
  const faqs = [...s.faqs.map((f) => [f.q, f.a]), ...COMMON_FAQS];
  const sib = g.members.filter((m) => m !== s.slug).map((m) => specBy[m]).filter(Boolean);
  const cats = (GROUP_CATS[s.group] || []).map((c) => CATS.find((x) => x.slug === c));
  const money = s.money || `Most ${who} spend the bulk of their budget on ${s.rows.map((r) => r.name.toLowerCase()).join(', ')}. Those are the purchases Aria is designed around.`;
  const calc = s.calc ? CALC_FLOAT : CALC_BACK;
  const body = `
<section class="page-head"><div class="wrap split">
<div>${crumbs([['Aria', '/'], ['Specialties', '/specialties'], [GROUP_NAME[g.slug], gurl(g.slug)], [name, url]])}<span class="label">For ${esc(who)}</span><h1 style="margin-top:18px">${esc(hook)}</h1><p class="lead">${esc(s.lead)} ${esc(s.pitch)}</p><div class="actions"><a class="btn btn-dark" href="/join?specialty=${encodeURIComponent(name)}">Join the waitlist</a><a class="link arrow" href="${APP}">Try the demo</a></div></div>
<div class="panel" aria-label="Sample card activity"><div class="panel-h">Card activity <span>Sample data</span></div>${s.rows.map((r) => `<div class="panel-r"><div><b>${esc(r.name)}</b><small>${esc(r.desc)}</small></div><div><span class="amt">${esc(r.amt)}</span><span class="back">2% back</span></div></div>`).join('')}</div></div></section>
<section class="sec tight"><div class="wrap split" style="align-items:start"><div><span class="label">Where the money goes</span><h2 style="margin-top:18px">How ${esc(who)} spend.</h2></div><div class="prose"><p class="lead">${esc(money)}</p></div></div></section>
${guideSecs(s, who, g)}
<section class="sec tight"><div class="wrap">${calc}</div></section>
<section class="sec tight"><div class="wrap"><div class="sec-head"><span class="label">How Aria helps</span><h2>Built for ${esc(who)}.</h2></div>
<div class="grid g2">${helps.map(([k, t]) => `<a class="tile" href="${P[k].url}">${ic(P[k].icon)}<h4>${P[k].name}</h4><p>${esc(t)}</p><span class="more arrow">Learn more</span></a>`).join('')}</div></div></section>
<section class="sec tight"><div class="wrap"><div class="sec-head"><span class="label">On the card</span><h2>Controls your team will actually use.</h2></div>
<div class="grid g3">${s.card.slice(0, 6).map((c) => `<div class="tile"><h4>${esc(c.t)}</h4><p>${esc(c.d)}</p></div>`).join('')}</div></div></section>
<section class="sec tight"><div class="wrap"><div class="sec-head"><span class="label">Marketplace</span><h2>Supplies for ${esc(who)}.</h2></div>
<div class="mk-cats" style="grid-template-columns:repeat(4,1fr)">${cats.map((c) => `<a class="mk-cat" href="/marketplace/${c.slug}"><img src="${IMG('c-' + c.slug)}" alt="" width="800" height="800" loading="lazy"><b>${c.name}</b></a>`).join('')}</div></div></section>
${faqs.length ? `<section class="sec tight"><div class="wrap split" style="align-items:start"><div><span class="label">Questions</span><h2 style="margin-top:18px">What ${esc(who)} ask us.</h2></div>${faqHtml(faqs)}</div></section>` : ''}
${guideLinks()}
${sib.length ? `<section class="sec tight"><div class="wrap"><div class="sec-head"><span class="label">Related</span><h2>More in ${GROUP_NAME[g.slug].toLowerCase()}</h2></div><div class="chips">${sib.map((x) => `<a class="chip" href="/specialties/${x.slug}">${esc(x.name)}</a>`).join('')}<a class="chip" href="/specialties">All specialties</a></div></div></section>` : ''}
${ctaBand('Your practice’s financial home.', `Join the waitlist and we’ll show you what Aria would do for your ${lower} practice.`)}`;
  const base = who.endsWith(' practices') ? name + ' practice' : name;
  const title = [' banking, cards and financing', ' banking and financing', ' banking', ''].map((x) => base + x).find((t) => t.replace(/&amp;/g, '&').length <= 53);
  const desc = clip(hook + ' ' + s.lead + ' The Aria Card earns 2% back on med-surg supplies.');
  page({ url, title, desc, body, priority: '0.7', graph: [webPage(url, 'Aria for ' + name, desc), crumbsLd([['Aria', '/'], ['Specialties', '/specialties'], [GROUP_NAME[g.slug], gurl(g.slug)], [name, url]]), faqLd(url, faqs)] });
}
function groupPage(g) {
  if (g.members.length === 1 && g.members[0] === g.slug) return; // dental: the group is the specialty
  const url = gurl(g.slug), mem = g.members.map((m) => specBy[m]);
  const body = `
<section class="page-head"><div class="wrap">${crumbs([['Aria', '/'], ['Specialties', '/specialties'], [GROUP_NAME[g.slug], url]])}${ic(GROUP_ICON[g.slug], 'ic')}<h1 style="margin-top:18px">${esc(g.h1)}</h1><p class="lead">${esc(g.lead)}</p></div></section>
<section class="sec tight" style="padding-top:0"><div class="wrap"><div class="grid g3">${mem.map((s) => `<a class="tile" href="/specialties/${s.slug}"><span class="label">${esc(s.name)}</span><h3>${esc(s.hook || s.lead)}</h3><p>${esc(s.lead)}</p><span class="more arrow">See ${esc(s.name)}</span></a>`).join('')}</div></div></section>
${GUIDES[g.slug] ? `<section class="sec tight"><div class="wrap split" style="align-items:start"><div><span class="label">Getting paid</span><h2 style="margin-top:18px">How ${GROUP_NAME[g.slug].toLowerCase()} get paid.</h2></div><div class="prose">${GUIDES[g.slug].paid.map((x) => `<p>${esc(x)}</p>`).join('')}</div></div></section>
<section class="sec tight"><div class="wrap split" style="align-items:start"><div><span class="label">Choosing a bank</span><h2 style="margin-top:18px">What to look for.</h2></div><ul class="checks">${GUIDES[g.slug].look.map((l) => `<li>${esc(l)}</li>`).join('')}</ul></div></section>
<section class="sec tight"><div class="wrap"><div class="sec-head"><span class="label">By specialty</span><h2>Where each specialty spends.</h2></div><div class="grid g2">${mem.map((x) => `<div class="tile"><h4><a href="/specialties/${x.slug}">${esc(x.name)}</a></h4><p>${esc(x.money || x.pitch || x.lead)}</p></div>`).join('')}</div></div></section>` : ''}
<section class="sec tight"><div class="wrap split" style="align-items:start"><div><span class="label">Questions</span><h2 style="margin-top:18px">Common questions.</h2></div>${faqHtml(COMMON_FAQS)}</div></section>
${guideLinks()}
${ctaBand()}`;
  const desc = clip(g.h1 + ' ' + g.lead + ' Cards, buy-and-bill lending and bill pay for ' + GROUP_NAME[g.slug].toLowerCase() + '.');
  page({ url, title: [`Banking and financing for ${GROUP_NAME[g.slug].toLowerCase()}`, `Banking for ${GROUP_NAME[g.slug].toLowerCase()}`].find((t) => t.length <= 53) || GROUP_NAME[g.slug], desc, body, priority: '0.7', graph: [webPage(url, GROUP_NAME[g.slug], desc), crumbsLd([['Aria', '/'], ['Specialties', '/specialties'], [GROUP_NAME[g.slug], url]]), faqLd(url, COMMON_FAQS)] });
}
function specialtiesIndex() {
  const body = `
<section class="page-head"><div class="wrap">${crumbs([['Aria', '/'], ['Specialties', '/specialties']])}<span class="label">Specialties</span><h1 style="margin-top:18px">Built for how your specialty spends.</h1><p class="lead">Every specialty buys, bills and gets paid differently. Find yours.</p>
<div class="finder"><label class="sr" for="spec-find">Find your specialty</label><input id="spec-find" class="field" type="search" placeholder="Find your specialty, for example retina" autocomplete="off" style="width:100%"></div></div></section>
<section class="sec tight" style="padding-top:0"><div class="wrap"><div class="spec-groups">${DATA.groups.map((g) => `<div class="spec-g">${ic(GROUP_ICON[g.slug])}<h3><a href="${gurl(g.slug)}">${GROUP_NAME[g.slug]}</a></h3><ul>${g.members.map((m) => `<li><a href="/specialties/${m}">${esc(specBy[m].name)}</a></li>`).join('')}</ul></div>`).join('')}</div></div></section>
${ctaBand('Don’t see your specialty?', 'Join the waitlist and tell us what you do. We are adding specialties every month.')}`;
  page({ url: '/specialties', title: 'Financial tools for every medical specialty', desc: 'Cards, buy-and-bill lending, bill pay and a financial hub for primary care, specialists, surgical practices, eye care, dental, infusion and more.', body, priority: '0.8', graph: [crumbsLd([['Aria', '/'], ['Specialties', '/specialties']])] });
}

// ---------------------------------------------------------------- marketplace
const PREVIEW = `<div class="notice">${ic('box', 'ic" style="width:22px;height:22px;flex:none')}<span>The marketplace is in preview. Products and specs are listed now. Prices and checkout open as supplier agreements are signed, and waitlist members can request quotes today.</span></div>`;
function marketHome() {
  const body = `
<section class="page-head"><div class="wrap">${crumbs([['Aria', '/'], ['Marketplace', '/marketplace']])}<span class="label">Marketplace</span><h1 style="margin-top:18px">Every supply your practice reorders.</h1><p class="lead">One catalog for gloves, wound care, syringes, PPE and exam room basics, paid on the Aria Card so every order earns back.</p>
<div class="finder"><label class="sr" for="mk-find">Search supplies</label><input id="mk-find" class="field" type="search" placeholder="Search supplies, for example nitrile gloves" autocomplete="off" style="width:100%"></div></div></section>
<section class="sec tight" style="padding-top:0"><div class="wrap"><div class="art" style="aspect-ratio:21/8;margin-bottom:48px"><img src="${IMG('market')}" alt="Medical supplies arranged on a table" width="2000" height="857"></div>
<div class="sec-head"><span class="label">Categories</span><h2>Shop by category.</h2></div>
<div class="mk-cats">${CATS.map((c) => `<a class="mk-cat" data-name="${esc((c.name + ' ' + c.short + ' ' + c.prods.map((p) => p.name).join(' ')).toLowerCase())}" href="/marketplace/${c.slug}"><img src="${IMG('c-' + c.slug)}" alt="" width="800" height="800" loading="lazy"><b>${c.name}</b></a>`).join('')}</div>
<div style="margin-top:32px">${PREVIEW}</div></div></section>
<section class="sec tight"><div class="wrap"><div class="sec-head"><span class="label">How it works</span><h2>Reorder in minutes, earn on every order.</h2></div>
<ol class="steps"><li><h4>Find what you buy</h4><p>Search by name or browse by category and specialty.</p></li><li><h4>Pay on the Aria Card</h4><p>Every order goes on the card, so it earns back and the receipt is matched for you.</p></li><li><h4>Books done for you</h4><p>Each order is coded to the right supply category and synced to your books.</p></li></ol></div></section>
<section class="sec tight"><div class="wrap"><div class="sec-head"><span class="label">Shop by specialty</span><h2>Supplies for your specialty.</h2></div><div class="chips">${Object.entries(GROUP_NAME).map(([s, n]) => `<a class="chip" href="${gurl(s)}">${n}</a>`).join('')}</div></div></section>
${ctaBand('Get first access to the marketplace.', 'Join the waitlist to request quotes now and order as soon as checkout opens.')}`;
  page({ url: '/marketplace', title: 'Medical supply marketplace for independent practices', desc: 'Gloves, wound care, syringes, PPE, exam room and dental supplies in one catalog for independent medical practices, paid on the Aria Card.', body, priority: '0.8', graph: [crumbsLd([['Aria', '/'], ['Marketplace', '/marketplace']])] });
}
const usedBy = (slug) => DATA.specialties.filter((sp) => (GROUP_CATS[sp.group] || []).includes(slug));
const usedHtml = (slug) => { const u = usedBy(slug); return u.length ? `<section class="sec tight"><div class="wrap"><div class="sec-head"><span class="label">Used by</span><h2>Practices that order these most.</h2></div><div class="chips">${u.map((x) => `<a class="chip" href="/specialties/${x.slug}">${esc(x.name)}</a>`).join('')}</div></div></section>` : ''; };
const mfaqHtml = (slug) => (MFAQ[slug] ? `<section class="sec tight"><div class="wrap split" style="align-items:start"><div><span class="label">Questions</span><h2 style="margin-top:18px">Buying questions.</h2></div>${faqHtml(MFAQ[slug])}</div></section>` : '');
function catPage(c) {
  const url = '/marketplace/' + c.slug;
  const body = `
<section class="page-head"><div class="wrap split">
<div>${crumbs([['Aria', '/'], ['Marketplace', '/marketplace'], [c.name, url]])}<span class="label">Marketplace</span><h1 style="margin-top:18px">${c.name}</h1><p class="lead">${esc(c.short)}</p></div>
<div class="art" style="aspect-ratio:4/3"><img src="${IMG('c-' + c.slug)}" alt="${esc(c.name)}" width="800" height="800" fetchpriority="high"></div></div></section>
<section class="sec tight" style="padding-top:0"><div class="wrap"><div class="grid g4">${c.prods.map((p) => `<a class="tile img" href="${url}/${p.slug}"><div class="ph"><img src="${IMG('c-' + c.slug)}" alt="" width="800" height="800" loading="lazy"></div><div class="tx"><h4>${esc(p.name)}</h4><p>${esc(p.desc)}</p></div></a>`).join('')}</div><div style="margin-top:28px">${PREVIEW}</div></div></section>
<section class="sec tight"><div class="wrap split" style="align-items:start"><div><span class="label">Buying guide</span><h2 style="margin-top:18px">How to buy ${c.name.toLowerCase()}.</h2></div><div class="prose"><p class="lead">${esc(c.guide)}</p></div></div></section>
${mfaqHtml(c.slug)}
${usedHtml(c.slug)}
<section class="sec tight"><div class="wrap"><div class="sec-head"><span class="label">More categories</span></div><div class="chips">${CATS.filter((x) => x !== c).map((x) => `<a class="chip" href="/marketplace/${x.slug}">${x.name}</a>`).join('')}</div></div></section>
${ctaBand('Get first access to the marketplace.', 'Join the waitlist to request quotes now and order as soon as checkout opens.')}`;
  const desc = clip(c.name + ' for medical practices: ' + c.prods.map((p) => p.name.toLowerCase()).join(', ') + '. Paid on the Aria Card.');
  page({ url, title: `${c.name} for medical practices`, desc, body, priority: '0.6', graph: [crumbsLd([['Aria', '/'], ['Marketplace', '/marketplace'], [c.name, url]]), { '@type': 'CollectionPage', name: c.name, url: SITE + url, mainEntity: { '@type': 'ItemList', itemListElement: c.prods.map((p, i) => ({ '@type': 'ListItem', position: i + 1, name: p.name, url: SITE + url + '/' + p.slug })) } }, faqLd(url, MFAQ[c.slug] || [])] });
}
function prodPage(c, p) {
  const url = `/marketplace/${c.slug}/${p.slug}`;
  const body = `
<section class="page-head"><div class="wrap">${crumbs([['Aria', '/'], ['Marketplace', '/marketplace'], [c.name, '/marketplace/' + c.slug], [p.name, url]])}
<div class="prod"><div class="ph"><img src="${IMG('c-' + c.slug)}" alt="${esc(p.name)}" width="800" height="800" fetchpriority="high"></div>
<div><span class="label">${c.name}</span><h1 style="margin-top:18px;font-size:clamp(34px,4vw,52px)">${esc(p.name)}</h1><p class="lead">${esc(p.desc)}</p>
<table class="tbl" style="margin-top:28px"><tbody>${Object.entries(p.specs).map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</tbody></table>
<form class="signup" data-signup="quote" style="margin-top:28px;max-width:none"><input type="hidden" name="product" value="${esc(p.name)}"><label class="sr" for="q-em">Work email</label><input id="q-em" class="field" type="email" name="email" placeholder="Work email" required><button class="btn btn-dark" type="submit">Request a quote</button></form>
<p class="signup-note">Pays on the Aria Card. Price and availability depend on your supplier agreement.</p></div></div></div></section>
<section class="sec tight"><div class="wrap split" style="align-items:start"><div><span class="label">Buying guide</span><h2 style="margin-top:18px">Choosing ${c.name.toLowerCase()}.</h2></div><div class="prose"><p>${esc(c.guide)}</p></div></div></section>
${mfaqHtml(c.slug)}
${usedHtml(c.slug)}
<section class="sec tight"><div class="wrap"><div class="sec-head"><span class="label">More ${c.name.toLowerCase()}</span></div><div class="grid g3">${c.prods.filter((x) => x !== p).map((x) => `<a class="tile" href="/marketplace/${c.slug}/${x.slug}"><h4>${esc(x.name)}</h4><p>${esc(x.desc)}</p><span class="more arrow">View</span></a>`).join('')}</div><div style="margin-top:28px">${PREVIEW}</div></div></section>`;
  const desc = clip(p.name + '. ' + p.desc + ' ' + Object.entries(p.specs).map(([k, v]) => k + ': ' + v).join('. ') + '.');
  page({ url, title: `${p.name} for medical practices`, desc, body, priority: '0.5', graph: [crumbsLd([['Aria', '/'], ['Marketplace', '/marketplace'], [c.name, '/marketplace/' + c.slug], [p.name, url]]), webPage(url, p.name + ' for medical practices', p.desc), faqLd(url, MFAQ[c.slug] || [])] });
}

// ---------------------------------------------------------------- platform, security, join, blog, 404
function platformPage() {
  const body = `
<section class="page-head"><div class="wrap split"><div>${crumbs([['Aria', '/'], ['Platform', '/platform']])}<span class="label">Platform</span><h1 style="margin-top:18px">One financial home for your practice.</h1><p class="lead">The Financial Hub at the center, and five tools around it that each do one job well. Every dollar they touch shows up in one place.</p><div class="actions"><a class="btn btn-dark" href="/join">Join the waitlist</a><a class="link arrow" href="${APP}">Try the demo</a></div></div>
<div class="figure-card reveal">${figure()}<div class="figure-cap">Figure A<b>Aria</b></div></div></div></section>
<section class="sec tight"><div class="wrap"><div class="grid g3">${PRODUCTS.map((p) => `<a class="tile img" href="${p.url}"><div class="ph"><img src="${IMG(p.img)}" alt="" width="1200" height="900" loading="lazy"></div><div class="tx"><span class="label">${p.name}</span><h3>${esc(p.h1)}</h3><p>${p.short}</p></div></a>`).join('')}<a class="tile img" href="/marketplace"><div class="ph"><img src="${IMG('market')}" alt="" width="2000" height="857" loading="lazy"></div><div class="tx"><span class="label">Marketplace</span><h3>Every supply your practice reorders.</h3><p>One catalog, paid on the Aria Card.</p></div></a></div></div></section>
<section class="sec tight"><div class="wrap"><div class="sec-head"><span class="label">Connects to</span><h2>No new system. It plugs into what you use.</h2></div><div class="chips"><span class="chip">Your bank</span><span class="chip">QuickBooks</span><span class="chip">Xero</span><span class="chip">NetSuite</span><span class="chip">Your clearinghouse (835 files)</span><span class="chip">Your EHR</span><span class="chip">Gusto, ADP and other payroll</span></div></div></section>
<section class="sec tight"><div class="wrap"><div class="art frame reveal">${appFrame('/assets/i/app-home.webp', 'The Aria Financial Hub with sample data')}</div></div></section>
${ctaBand()}`;
  page({ url: '/platform', title: 'Financial platform for independent medical practices', desc: 'The Financial Hub, the Aria Card, buy-and-bill lending, bill pay, Flex Pay and a supply marketplace, in one financial home for independent medical practices.', body, priority: '0.9', graph: [crumbsLd([['Aria', '/'], ['Platform', '/platform']])] });
}
function securityPage() {
  const items = [['bank', 'Licensed partners', 'Deposits, cards and lending will be provided by licensed partner institutions, named before launch. Aria is a financial technology company, not a bank.'], ['lock', 'Read-only connections', 'Bank connections are read-only. Aria cannot move money from an account it reads.'], ['shield', 'A BAA before patient data', 'We sign a business associate agreement before taking in remittance files or any other information that may contain patient data.'], ['check', 'Approvals on every payment', 'Nothing is paid, moved or changed without a person at your practice approving it.'], ['users', 'Roles and permissions', 'Decide who can see balances, approve bills, issue cards and change settings.'], ['receipt', 'An audit trail', 'Every approval, payment and change is recorded with who did it and when.']];
  const body = `<section class="page-head"><div class="wrap">${crumbs([['Aria', '/'], ['Security', '/security']])}<span class="label">Security</span><h1 style="margin-top:18px">Careful with your money and your patients’ data.</h1><p class="lead">How Aria protects your practice.</p></div></section>
<section class="sec tight" style="padding-top:0"><div class="wrap"><div class="grid g3">${items.map(([i, t, d]) => `<div class="tile">${ic(i)}<h4>${t}</h4><p>${d}</p></div>`).join('')}</div></div></section>${ctaBand()}`;
  page({ url: '/security', title: 'Security and privacy', desc: 'How Aria protects independent medical practices: licensed partner institutions, read-only connections, a BAA before patient data, and approvals on every payment.', body, priority: '0.5' });
}
function joinPage() {
  const roles = ['Owner or partner', 'Practice or office manager', 'Accountant or bookkeeper', 'Other'];
  const body = `<section class="page-head"><div class="wrap split" style="align-items:start"><div>${crumbs([['Aria', '/'], ['Join the waitlist', '/join']])}<span class="label">Join the waitlist</span><h1 style="margin-top:18px">Your practice’s financial home.</h1><p class="lead">Tell us about your practice and we’ll reach out as we open access. No cost, no commitment, and pricing and terms in writing before you apply for anything.</p></div>
<form class="tile" data-signup="join" style="gap:14px"><label>Work email<input class="field" style="width:100%;border-radius:12px;margin-top:6px" type="email" name="email" required autocomplete="email"></label>
<label>Your name<input class="field" style="width:100%;border-radius:12px;margin-top:6px" name="name" autocomplete="name"></label>
<label>Practice name<input class="field" style="width:100%;border-radius:12px;margin-top:6px" name="practice" autocomplete="organization"></label>
<label>Your role<select class="field" style="width:100%;border-radius:12px;margin-top:6px" name="role">${roles.map((r) => `<option>${r}</option>`).join('')}</select></label>
<label>Specialty<select class="field" style="width:100%;border-radius:12px;margin-top:6px" name="specialty"><option value="">Choose one</option>${DATA.specialties.map((s) => `<option>${esc(s.name)}</option>`).join('')}<option>Other</option></select></label>
<label>Locations<select class="field" style="width:100%;border-radius:12px;margin-top:6px" name="locations"><option>1</option><option>2 to 5</option><option>6 or more</option></select></label>
<button class="btn btn-dark" type="submit" style="margin-top:8px">Join the waitlist</button><p class="signup-note" style="margin:0">We’ll only use this to contact you about Aria.</p></form></div></section>
<script>(function(){var q=new URLSearchParams(location.search),s=q.get('specialty');if(s){var o=[].slice.call(document.querySelectorAll('select[name=specialty] option')).find(function(x){return x.textContent===s});if(o)o.selected=true}})();</script>`;
  page({ url: '/join', title: 'Join the waitlist', desc: 'Join the Aria waitlist: cards, buy-and-bill lending, bill pay and a financial hub for independent medical practices.', body, priority: '0.5' });
}
function blogPages() {
  const dir = path.join(ROOT, 'blog/posts');
  const posts = fs.readdirSync(dir).filter((f) => f.endsWith('.md')).map((f) => parsePost(path.join(dir, f))).filter((p) => p.date <= TODAY).sort((a, b) => (a.date < b.date ? 1 : -1));
  const fmt = (d) => new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  const card = (p) => `<a class="tile" href="/blog/${p.slug}"><span class="label">${esc(p.category)}</span><h3>${esc(p.title)}</h3><p>${esc(p.description)}</p><span class="more muted" style="font-size:14px">${fmt(p.date)}</span></a>`;
  page({ url: '/blog', title: 'Guides for independent medical practices', desc: 'Practical guides on getting paid, cash flow, supply spend and the books, for independent medical practices.', priority: '0.6',
    body: `<section class="page-head"><div class="wrap">${crumbs([['Aria', '/'], ['Blog', '/blog']])}<span class="label">Resources</span><h1 style="margin-top:18px">Guides for running the money side of a practice.</h1></div></section><section class="sec tight" style="padding-top:0"><div class="wrap"><div class="grid g3">${posts.map(card).join('')}</div></div></section>${ctaBand()}` });
  for (const p of posts) {
    const url = '/blog/' + p.slug, { html } = md(p.body);
    page({ url, title: p.title, desc: p.description, priority: '0.6', graph: [{ '@type': 'BlogPosting', headline: p.title, description: p.description, datePublished: p.date, url: SITE + url, author: { '@id': SITE + '/#org' } }, crumbsLd([['Aria', '/'], ['Blog', '/blog'], [p.title, url]])],
      body: `<section class="page-head"><div class="narrow">${crumbs([['Aria', '/'], ['Blog', '/blog'], [p.category, '/blog']])}<span class="label">${esc(p.category)} · ${fmt(p.date)}</span><h1 style="margin-top:18px;font-size:clamp(36px,4.6vw,56px)">${esc(p.title)}</h1><p class="lead">${esc(p.description)}</p></div></section>
<section class="sec tight" style="padding-top:0"><article class="narrow prose">${html}<p class="fine" style="margin-top:40px">This article is general information, not legal, tax or financial advice.</p></article></section>
<section class="sec tight"><div class="wrap"><div class="sec-head"><span class="label">Keep reading</span></div><div class="grid g3">${posts.filter((q) => q !== p).slice(0, 3).map(card).join('')}</div></div></section>${ctaBand()}` });
  }
  return posts.length;
}

// ---------------------------------------------------------------- build
homePage();
platformPage();
for (const p of PRODUCTS) productPage(p);
specialtiesIndex();
for (const g of DATA.groups) groupPage(g);
for (const s of DATA.specialties) specialtyPage(s);
marketHome();
for (const c of CATS) { catPage(c); for (const p of c.prods) prodPage(c, p); }
securityPage();
joinPage();

// ---------------------------------------------------------------- tools
const TOOLS = [
  { slug: 'supply-cash-back-calculator', name: 'Supply cash back calculator', title: 'Medical supply cash back calculator', h1: 'How much could your supply orders earn back?', lead: 'Enter what your practice spends on medical and surgical supplies each month. The calculator shows what 2% back would add up to over a year.', calc: () => CALC_BACK,
    how: ['Cash back is a percentage of what you spend. At 2%, every $10,000 of supplies paid on the card earns $200 back.', 'The calculator multiplies your monthly supply spend by 12 for a year, then by 2%. A practice spending $25,000 a month on med-surg supplies would earn about $6,000 back a year.'],
    change: ['Whether each supplier accepts card payment, and whether they add a fee for it', 'Which purchases count as eligible medical and surgical supplies under the card terms', 'Seasonal swings in spend, such as flu season vaccines', 'Paying the card in full each month, so interest never eats the rewards'],
    faqs: [['Do all medical suppliers accept card payments?', 'Many do, including the large distributors, but some add a fee for card payments or limit card use to smaller orders. Ask each supplier before moving spend to a card.'], ['Is cash back taxable for a practice?', 'Rewards on business purchases are usually treated as a reduction in the cost of what you bought, not as income. Ask your CPA how to record them for your practice.'], ['How is this different from a regular business card?', 'Many business cards earn 1% to 2% on everything, often with exclusions or caps. The Aria Card is designed around med-surg supply spend, with controls and coding built for practices.']] },
  { slug: 'buy-and-bill-float-calculator', name: 'Buy-and-bill float calculator', title: 'Buy-and-bill cash flow calculator', h1: 'How much cash is tied up in buy-and-bill drugs?', lead: 'Enter your monthly buy-and-bill drug spend and how long injection or infusion claims take to pay. The calculator shows how much cash is waiting on claims at any moment.', calc: () => CALC_FLOAT,
    how: ['Float is the money you have paid out for drugs that payers have not paid back yet. It equals your daily drug spend multiplied by the days between paying the distributor and receiving the claim payment.', 'The calculator divides monthly spend by 30 to get daily spend, then multiplies by your days to payment. A practice buying $80,000 of drugs a month with claims paid in 35 days carries about $93,000 of float.'],
    change: ['Distributor payment terms, since longer terms shorten the gap', 'How quickly claims are submitted after the drug is given', 'Denials and resubmissions, which add weeks to the wait', 'Payer mix, since Medicare and commercial plans pay on different timelines'],
    faqs: [['What is buy and bill?', 'Buy and bill is how most physician-administered drugs are paid for: the practice buys the drug, gives it to the patient, then bills the payer and waits to be paid.'], ['How do practices fund the float?', 'Usually with cash on hand, extended distributor terms or a line of credit. Aria is building buy-and-bill lending that pays the distributor and is repaid from the claim payment.'], ['Does Medicare pay buy-and-bill drugs at cost?', 'Medicare Part B pays most physician-administered drugs at a rate tied to the drug’s average sales price, which is set quarterly. Whether that covers your cost depends on what you paid.']] },
];
function toolPage(t) {
  const url = '/tools/' + t.slug;
  const body = `
<section class="page-head"><div class="wrap">${crumbs([['Aria', '/'], ['Tools', '/tools'], [t.name, url]])}<span class="label">Free tool</span><h1 style="margin-top:18px">${esc(t.h1)}</h1><p class="lead">${esc(t.lead)}</p></div></section>
<section class="sec tight" style="padding-top:0"><div class="wrap">${t.calc()}</div></section>
<section class="sec tight"><div class="wrap split" style="align-items:start"><div><span class="label">The math</span><h2 style="margin-top:18px">How it works.</h2></div><div class="prose">${t.how.map((x) => `<p>${esc(x)}</p>`).join('')}</div></div></section>
<section class="sec tight"><div class="wrap split" style="align-items:start"><div><span class="label">Your numbers</span><h2 style="margin-top:18px">What changes the result.</h2></div><ul class="checks">${t.change.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div></section>
<section class="sec tight"><div class="wrap split" style="align-items:start"><div><span class="label">Questions</span><h2 style="margin-top:18px">Common questions.</h2></div>${faqHtml(t.faqs)}</div></section>
<section class="sec tight"><div class="wrap"><div class="sec-head"><span class="label">More tools</span></div><div class="grid g2">${TOOLS.filter((x) => x !== t).map((x) => `<a class="tile" href="/tools/${x.slug}"><h4>${x.name}</h4><p>${esc(x.lead)}</p><span class="more arrow">Open</span></a>`).join('')}</div></div></section>
${ctaBand()}`;
  page({ url, title: t.title, desc: clip(t.lead), body, priority: '0.7', graph: [webPage(url, t.title, t.lead), crumbsLd([['Aria', '/'], ['Tools', '/tools'], [t.name, url]]), faqLd(url, t.faqs), { '@type': 'WebApplication', name: t.title, url: SITE + url, applicationCategory: 'FinanceApplication', operatingSystem: 'Any', offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } }] });
}
function toolsIndex() {
  const body = `<section class="page-head"><div class="wrap">${crumbs([['Aria', '/'], ['Tools', '/tools']])}<span class="label">Free tools</span><h1 style="margin-top:18px">Calculators for practice finances.</h1><p class="lead">Quick math for the decisions practices make every month. No sign-up needed.</p></div></section>
<section class="sec tight" style="padding-top:0"><div class="wrap"><div class="grid g2">${TOOLS.map((x) => `<a class="tile" href="/tools/${x.slug}"><h3>${x.name}</h3><p>${esc(x.lead)}</p><span class="more arrow">Open the calculator</span></a>`).join('')}</div></div></section>${ctaBand()}`;
  page({ url: '/tools', title: 'Free calculators for medical practices', desc: 'Free calculators for medical practices: supply cash back and buy-and-bill drug float. Quick math for monthly money decisions, no sign-up needed.', body, priority: '0.6', graph: [crumbsLd([['Aria', '/'], ['Tools', '/tools']])] });
}
toolsIndex(); TOOLS.forEach(toolPage);
const nPosts = blogPages();
// 404 (not in the sitemap)
page({ url: '/404', title: 'Page not found', desc: 'That page could not be found.', noindex: true, body: `<section class="page-head"><div class="wrap"><span class="label">404</span><h1 style="margin-top:18px">We couldn’t find that page.</h1><p class="lead">It may have moved. Try one of these instead.</p><div class="actions"><a class="btn btn-dark" href="/">Home</a><a class="btn btn-line" href="/platform">Platform</a><a class="btn btn-line" href="/specialties">Specialties</a><a class="btn btn-line" href="/marketplace">Marketplace</a></div></div></section>` });
fs.writeFileSync(path.join(OUT, 'assets/site/mark.svg'), MARK.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ').replace('stroke="currentColor"', 'stroke="#171721"'));
// Real last-modified dates: a page's date changes only when its content does.
const LM_FILE = path.join(ROOT, 'site/data/lastmod.json');
const lastmod = fs.existsSync(LM_FILE) ? JSON.parse(fs.readFileSync(LM_FILE, 'utf8')) : {};
for (const p of pages) {
  const h = crypto.createHash('sha1').update((p.html || '').replace(/cta-[a-z0-9]{2,6}/g, '')).digest('hex').slice(0, 12);
  if (!lastmod[p.url] || lastmod[p.url].h !== h) lastmod[p.url] = { h, d: TODAY };
  p.lastmod = lastmod[p.url].d;
}
fs.writeFileSync(LM_FILE, JSON.stringify(lastmod, null, 0).replace(/},"/g, '},\n"'));
write('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + pages.map((p) => `  <url><loc>${SITE}${p.url === '/' ? '/' : p.url}</loc><lastmod>${p.lastmod}</lastmod><priority>${p.priority}</priority></url>`).join('\n') + '\n</urlset>\n');
write('llms.txt', `# Aria\n\n> Aria is banking built for healthcare practices. It matches insurer deposits to the claims behind them, offers buy-and-bill lending repaid from claim payments, and earns 2% back on medical and surgical supplies.\n\n## Products\n${PRODUCTS.map((p) => `- [${p.name}](${SITE}${p.url}): ${p.short}`).join('\n')}\n- [Marketplace](${SITE}/marketplace): medical supplies paid on the Aria Card.\n\n## Tools\n${TOOLS.map((t) => `- [${t.name}](${SITE}/tools/${t.slug}): ${t.lead}`).join('\n')}\n\n## Specialties\n${DATA.specialties.map((s) => `- [${s.name}](${SITE}/specialties/${s.slug})`).join('\n')}\n`);
console.log(`built ${pages.length} pages: ${DATA.specialties.length} specialties, ${CATS.length} categories, ${CATS.reduce((a, c) => a + c.prods.length, 0)} products, ${nPosts} posts`);
