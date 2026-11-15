// Blog covers: one piece of the Aria app per post, large on a flat ground, rendered with Playwright.
// Writes assets/i/cover-<slug>-1280.webp and -640.webp (blog pages) and site/img/cover-<slug>.webp (guide cards).
// Run: node tools/covers.mjs [slug ...]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)(process.env.PW || 'playwright');
import { execFileSync } from 'node:child_process';
import os from 'node:os';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const posts = fs.readdirSync(path.join(ROOT, 'blog/posts')).filter((f) => f.endsWith('.md')).map((f) => {
  const raw = fs.readFileSync(path.join(ROOT, 'blog/posts', f), 'utf8');
  const g = (k) => (raw.match(new RegExp('^' + k + ':\\s*(.+)$', 'm')) || [])[1]?.trim().replace(/^["']|["']$/g, '');
  return { slug: g('slug'), title: g('title'), category: g('category') };
});

// Which scene each post gets, with the label and figure it shows. Sample data only.
const S = {
  'how-to-read-an-era-835': ['match', '835 from Aetna', 'Short paid', '−$4,820'],
  'check-insurer-payments-against-contract': ['match', 'Contract check, UnitedHealthcare', 'Below contract', '−$12,460'],
  'common-claim-denial-reasons': ['denials', 'Denials this month', 'CO-197', '34%'],
  'days-in-ar': ['kpi', 'Days in A/R', '31 days', 'down 6'],
  '13-week-cash-flow-forecast': ['chart', '13-week cash forecast', '$812,480', 'Lowest week Jan 12'],
  'card-rewards-supply-spend': ['card', 'Medline Industries', '−$218,420.00', '+$4,368.40 back'],
  'buy-and-bill-cash-gap': ['line', 'Buy-and-bill line', '$253,600', 'repaid from claims'],
  'month-end-close-checklist': ['check', 'November close', ['Bank accounts reconciled', 'Insurer deposits matched', 'Bills coded', 'Payroll posted'], 3],
  'chart-of-accounts-medical-practice': ['ledger', 'Chart of accounts', ['4010 Insurance revenue', '4020 Patient payments', '5010 Medical supplies', '6000 Rent'], 0],
  'collecting-patient-balances': ['pay', 'Patient balance', '$1,260.00', 'Paid by text link'],
  'staff-spending-policy': ['limits', 'Front desk card', '$25,000 a month', 'Office supplies only'],
  'paying-vendor-bills': ['bills', 'Bills to pay', '$1,615,515', '3 bills'],
  'multi-location-practice-finances': ['sites', 'Margin by location', 'Main Street', 'North Clinic'],
  'what-to-send-your-bookkeeper-each-month': ['check', 'Bookkeeper packet', ['Bank statements', 'Card statements', 'Payroll reports', '835 remittances'], 4],
  'timely-filing-limits': ['deadline', 'Timely filing', 'Cigna', '12 days left'],
  'prior-authorization-denials': ['denials', 'Prior auth denials', 'CO-197', '22%'],
  'payer-contract-basics': ['match', 'Fee schedule, Blue Cross', 'Allowed 99214', '$148.20'],
  'idle-practice-cash': ['chart', 'Operating account', '$318,204', 'above your floor'],
  'monthly-practice-numbers': ['kpi', 'Collections', '$1.2M', 'up 8%'],
  'practice-finances-sale-ready': ['ledger', 'Books for a buyer', ['3 years of statements', 'Payer mix by month', 'Provider productivity', 'Owner pay separated'], 4],
  'credentialing-enrollment-gaps': ['deadline', 'Enrollment, Dr. Patel', 'Medicare', 'pending 41 days'],
  'coordination-of-benefits-denials': ['denials', 'COB denials', 'CO-22', '9%'],
  'secondary-insurance-claims': ['match', 'Secondary claim, Medicaid', 'Balance after primary', '$212.40'],
  'payment-posting-deposit-remittance': ['match', 'Deposit and remittance', 'Matched', '$148,250'],
  'reconcile-insurer-deposits-bank-statement': ['match', 'Bank deposit, Nov 12', 'Matched to 835', '$96,400'],
  'cash-vs-accrual-accounting-medical-practice': ['ledger', 'Cash vs accrual', ['Billed in October', 'Collected in November', 'Payroll accrued', 'Supplies prepaid'], 0],
  'budget-medical-practice-first-year': ['chart', 'First-year budget', '$1.4M', 'break even in month 9'],
  'startup-costs-independent-medical-practice': ['check', 'Startup costs', ['Build-out, $210,000', 'Equipment, $186,000', 'Working capital, $90,000', 'Licenses and credentialing'], 2],
  'line-of-credit-term-loan-equipment-financing': ['line', 'Line of credit', '$400,000', 'drawn $120,000'],
  'leasing-or-buying-equipment': ['compare', 'OCT scanner', 'Lease', 'Buy'],
  'planning-cash-around-payroll': ['chart', 'Cash before payroll', '$142,000', 'payroll Nov 21'],
  'setting-supply-par-levels': ['par', 'Supply par levels', 'Nitrile gloves', '12 cases'],
  'group-purchasing-organizations': ['card', 'Henry Schein', '−$263,515.00', '+$5,270.30 back'],
  'cutting-supply-costs-without-cutting-quality': ['par', 'Supply spend', 'Wound care', 'down 11%'],
  'protecting-practice-from-check-payment-fraud': ['alert', 'Check blocked', 'Payee changed', '$48,200'],
  'simple-internal-controls-small-practice': ['limits', 'Approvals', 'Bills over $50,000', 'Owner approves'],
  'reimbursing-staff-mileage-expenses': ['pay', 'Reimbursement', '$842.10', 'Mileage, October'],
  'medical-practice-record-retention': ['ledger', 'Records to keep', ['Remittances, 7 years', 'Bank statements, 7 years', 'Payroll, 4 years', 'Contracts, life plus 7'], 0],
  'patient-payment-plans': ['pay', 'Payment plan', '$3,600.00', '6 payments of $600'],
  'self-pay-pricing': ['compare', 'Self-pay price', 'Office visit', 'Lab panel'],
  'cost-of-patient-no-shows': ['kpi', 'No-show cost', '$184K', 'last 12 months'],
  'patient-credit-balances-refunds': ['pay', 'Patient refund', '$318.00', 'credit balance'],
  'telehealth-billing-basics': ['match', 'Telehealth claim', 'POS 10, modifier 95', '$112.80'],
  'medical-practice-year-end-checklist': ['check', 'Year-end', ['1099s for contractors', 'Inventory counted', 'Equipment logged', 'Payer contracts reviewed'], 2],
  'quarterly-tax-planning-questions-for-your-cpa': ['line', 'Tax reserve', '$190,500', '25% of net income'],
  'medical-practice-overhead-and-margin': ['kpi', 'Overhead', '58%', 'margin 42%'],
  'revenue-cycle-metrics-explained': ['kpi', 'Clean claim rate', '94%', 'denial rate 6%'],
  'opening-a-second-practice-location-financial-checklist': ['sites', 'Second location', 'Main Street', 'New site'],
  'choosing-financial-software-for-your-practice': ['stack', 'Connected', 'athenahealth', 'QuickBooks'],
  'separating-personal-and-practice-finances': ['ledger', 'Owner pay', ['Salary through payroll', 'Distributions, quarterly', 'No personal card spend', 'Practice card only'], 4],
  'what-an-ai-cfo-can-and-cant-do': ['alert', 'Needs you', 'Cigna paid short', '$6,540'],
  'weekly-money-routine-for-practice-owners': ['check', 'Monday routine', ['Cash and the week ahead', 'Short pays to appeal', 'Bills to approve', 'Card spend to review'], 2],
};

const CSS = `*{box-sizing:border-box;margin:0}body{width:1280px;height:720px;font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;color:#171721;-webkit-font-smoothing:antialiased;
display:grid;place-items:center;background:var(--g)}body>*{zoom:1.3}body>.stack{zoom:1.02}
.ui{background:#fff;border-radius:28px;box-shadow:0 40px 80px -40px rgba(23,23,33,.35),0 0 0 1px rgba(23,23,33,.05);padding:40px 44px;width:640px}
.h{display:flex;justify-content:space-between;align-items:center;font-size:22px;color:#4d4d5c;margin-bottom:22px}.h b{font-weight:500;color:#171721}
.big{font-size:64px;letter-spacing:-.03em;font-weight:500;line-height:1}.big small{font-size:28px;color:#787886;font-weight:400;margin-left:8px}
.sub{font-size:20px;color:#787886;margin-top:10px}
.row{display:flex;justify-content:space-between;align-items:center;font-size:21px;padding:16px 0;border-top:1px solid #f0f0f4}.row span{color:#4d4d5c}
.chip{display:inline-block;font-size:17px;font-weight:500;padding:6px 14px;border-radius:999px;background:#eeedfc;color:#4540c4}
.chip.bad{background:#fbeee6;color:#b4541f}.chip.ok{background:#e6f4ec;color:#2f7d54}
.pos{color:#2f7d54}.neg{color:#b4541f}
.card{width:560px;aspect-ratio:1.586;border-radius:26px;position:relative;color:#fff;overflow:hidden;
background:radial-gradient(85% 110% at 20% 6%,#a99cff 0%,rgba(169,156,255,0) 58%),radial-gradient(75% 95% at 95% 100%,#3a2fc4 0%,rgba(58,47,196,0) 62%),linear-gradient(135deg,#8576ff 0%,#6556ef 42%,#4c3fd8 100%);box-shadow:0 40px 80px -36px rgba(60,40,180,.6)}
.card i{position:absolute;right:30px;top:28px;font-style:normal;letter-spacing:.3em;font-size:20px}.card u{position:absolute;right:30px;bottom:26px;text-decoration:none;font-size:18px}
.stack{display:grid;gap:24px;justify-items:center}
.tick{display:flex;align-items:center;gap:16px;font-size:23px;padding:15px 0;border-top:1px solid #f0f0f4}.tick:first-of-type{border-top:0}
.tick em{width:30px;height:30px;border-radius:50%;border:2px solid #d4d1ee;flex:none;display:grid;place-items:center;font-style:normal;font-size:17px}
.tick.d em{background:#5651d8;border-color:#5651d8;color:#fff}.tick.d{color:#787886}
.bars{display:flex;align-items:flex-end;gap:10px;height:150px;margin-top:26px}.bars i{flex:1;border-radius:6px 6px 2px 2px;background:#d9d6f7}.bars i.c{background:#5651d8}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}.tile{background:#f6f6f9;border-radius:18px;padding:22px}.tile b{display:block;font-size:40px;font-weight:500;letter-spacing:-.02em;margin-top:6px}.tile span{font-size:18px;color:#787886}
.meter{height:14px;border-radius:999px;background:#eeedfc;margin:24px 0 12px;overflow:hidden}.meter i{display:block;height:100%;background:#5651d8;border-radius:999px}
svg.ch{width:100%;height:190px;margin-top:20px}`;

const tickRows = (items, done) => items.map((t, i) => `<div class="tick${i < done ? ' d' : ''}"><em>${i < done ? '✓' : ''}</em>${t}</div>`).join('');
function scene([kind, a, b, c]) {
  switch (kind) {
    case 'match': return `<div class="ui"><div class="h"><b>${a}</b><span class="chip ok">Matched</span></div><div class="row"><span>Deposit, Nov 12</span><b>$148,250.00</b></div><div class="row"><span>Claim 4471 · 99214</span><b>$142.80</b></div><div class="row"><span>Claim 4472 · 20610</span><b>$96.10</b></div><div class="row"><span>${b}</span><b class="${String(c).startsWith('−') ? 'neg' : ''}">${c}</b></div></div>`;
    case 'denials': return `<div class="ui"><div class="h"><b>${a}</b><span class="chip bad">${b} ${c}</span></div><div class="bars"><i style="height:92%" class="c"></i><i style="height:60%"></i><i style="height:42%"></i><i style="height:30%"></i><i style="height:22%"></i><i style="height:14%"></i></div><div class="row" style="margin-top:20px"><span>Top reason</span><b>${b}</b></div></div>`;
    case 'kpi': return `<div class="ui"><div class="h"><b>${a}</b><span class="chip">Last 30 days</span></div><div class="big">${b}</div><div class="sub">${c}</div><svg class="ch" viewBox="0 0 560 190" preserveAspectRatio="none"><path d="M0 150 C80 140 120 120 180 126 S300 90 360 96 S470 50 560 40 L560 190 L0 190Z" fill="#eeedfc"/><path d="M0 150 C80 140 120 120 180 126 S300 90 360 96 S470 50 560 40" fill="none" stroke="#5651d8" stroke-width="4"/></svg></div>`;
    case 'chart': return `<div class="ui"><div class="h"><b>${a}</b><span class="chip">13 weeks</span></div><div class="big">${b}</div><div class="sub">${c}</div><svg class="ch" viewBox="0 0 560 190" preserveAspectRatio="none"><path d="M0 70 C60 70 80 110 140 104 S220 60 280 80 S360 140 420 112 S500 50 560 46 L560 190 L0 190Z" fill="#eeedfc"/><path d="M0 70 C60 70 80 110 140 104 S220 60 280 80 S360 140 420 112 S500 50 560 46" fill="none" stroke="#5651d8" stroke-width="4" stroke-linejoin="round"/></svg></div>`;
    case 'card': return `<div class="stack"><div class="card"><i>ARIA</i><u>business</u></div><div class="ui" style="width:560px;padding:26px 32px"><div class="row" style="border:0;padding:0"><span>${a}</span><b>${b}</b></div><div class="pos" style="font-size:20px;margin-top:8px">${c}</div></div></div>`;
    case 'line': return `<div class="ui"><div class="h"><b>${a}</b><span class="chip">Available</span></div><div class="big">${b}</div><div class="meter"><i style="width:62%"></i></div><div class="sub">${c}</div></div>`;
    case 'check': return `<div class="ui"><div class="h"><b>${a}</b><span class="chip">${c} of ${b.length}</span></div>${tickRows(b, c)}</div>`;
    case 'ledger': return `<div class="ui"><div class="h"><b>${a}</b></div>${b.map((t) => `<div class="row"><span>${t}</span><b style="color:#c3bfe9">•••</b></div>`).join('')}</div>`;
    case 'pay': return `<div class="ui" style="width:520px;text-align:center"><div class="h" style="justify-content:center"><b>${a}</b></div><div class="big">${b}</div><div class="sub">${c}</div><div style="margin-top:30px;background:#5651d8;color:#fff;border-radius:999px;padding:18px;font-size:22px">Pay now</div></div>`;
    case 'limits': return `<div class="stack"><div class="card" style="width:480px"><i>ARIA</i><u>business</u></div><div class="ui" style="width:520px;padding:24px 32px"><div class="row" style="border:0;padding:6px 0"><span>${a}</span><b>${b}</b></div><div class="row"><span>Rule</span><b>${c}</b></div></div></div>`;
    case 'bills': return `<div class="ui"><div class="h"><b>${a}</b><span class="chip">${c}</span></div><div class="row"><span>Medline Industries</span><b>$912,040.00</b></div><div class="row"><span>Henry Schein</span><b>$487,475.00</b></div><div class="row"><span>Quest Diagnostics</span><b>$216,000.00</b></div><div class="row"><span>Total due</span><b>${b}</b></div></div>`;
    case 'sites': return `<div class="ui"><div class="h"><b>${a}</b></div><div class="grid"><div class="tile"><span>${b}</span><b>44%</b></div><div class="tile"><span>${c}</span><b>31%</b></div></div><div class="bars" style="height:110px"><i style="height:80%" class="c"></i><i style="height:60%"></i><i style="height:84%" class="c"></i><i style="height:52%"></i><i style="height:90%" class="c"></i><i style="height:58%"></i></div></div>`;
    case 'deadline': return `<div class="ui"><div class="h"><b>${a}</b><span class="chip bad">${c}</span></div><div class="big" style="font-size:52px">${b}</div><div class="meter"><i style="width:82%;background:#b4541f"></i></div><div class="sub">Submitted claims need to reach the payer in time</div></div>`;
    case 'compare': return `<div class="ui"><div class="h"><b>${a}</b></div><div class="grid"><div class="tile"><span>${b}</span><b>$4,120</b><span>a month</span></div><div class="tile" style="background:#eeedfc"><span>${c}</span><b>$186K</b><span>once</span></div></div></div>`;
    case 'par': return `<div class="ui"><div class="h"><b>${a}</b><span class="chip">${c}</span></div><div class="row"><span>${b}</span><b>Reorder at 4</b></div><div class="meter"><i style="width:34%"></i></div><div class="row"><span>Gauze sponges</span><b>Reorder at 6</b></div><div class="meter"><i style="width:70%"></i></div></div>`;
    case 'alert': return `<div class="ui"><div class="h"><b>${a}</b><span class="chip bad">Review</span></div><div class="big" style="font-size:48px">${b}</div><div class="sub">${c}</div><div style="display:flex;gap:12px;margin-top:28px"><span class="chip" style="font-size:19px;padding:12px 20px">Approve</span><span class="chip bad" style="font-size:19px;padding:12px 20px">Hold</span></div></div>`;
    case 'stack': return `<div class="ui"><div class="h"><b>${a}</b></div>${[b, c, 'Gusto', 'Chase'].map((t) => `<div class="row"><span>${t}</span><span class="chip ok">Synced</span></div>`).join('')}</div>`;
  }
}
const GROUND = { 'Getting paid': '#eef0f6', 'Cash flow': '#efeef8', 'Spend & cards': '#f1effa', 'Books & close': '#f2f2ef', 'Running the practice': '#edf2ef' };

const only = process.argv.slice(2);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
let n = 0;
for (const post of posts) {
  if (only.length && !only.includes(post.slug)) continue;
  const s = S[post.slug]; if (!s) { console.log('no scene for', post.slug); continue; }
  await p.setContent(`<!doctype html><html><head><style>${CSS}</style></head><body style="--g:${GROUND[post.category] || '#f2f2f5'}">${scene(s)}</body></html>`);
  const png = await p.screenshot({ type: 'png' });
  const tmp = path.join(os.tmpdir(), `cover-${post.slug}.png`);
  fs.writeFileSync(tmp, png);
  execFileSync('python3', ['-c', `import sys
from PIL import Image
im=Image.open(sys.argv[1]).convert('RGB')
for w,h,out in [(1280,720,sys.argv[2]),(640,360,sys.argv[3]),(1400,788,sys.argv[4])]:
    im.resize((w,h),Image.LANCZOS).save(out,'WEBP',quality=86)`, tmp,
    path.join(ROOT, 'assets/i', `cover-${post.slug}-1280.webp`), path.join(ROOT, 'assets/i', `cover-${post.slug}-640.webp`), path.join(ROOT, 'site/img', `cover-${post.slug}.webp`)]);
  fs.unlinkSync(tmp);
  n++;
}
await b.close();
console.log('covers', n);
