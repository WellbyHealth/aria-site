// Sample data for demo mode only (no DATABASE_URL). A fictional practice; every figure is invented.
// Twelve months of bank activity and remittances so trends and sparklines have something to draw.
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import type { Db } from './db';
import { encrypt } from './crypto';
import { matchPractice, matchPayouts } from './match';

export const DEMO_EMAIL = 'demo@ariapractice.com';
export const DEMO_PASSWORD = 'aria-demo';
export const DEMO_PRACTICE = '00000000-0000-4000-8000-000000000001';
const WEEKS = 53;

// One multi-row insert per table keeps a cold start fast.
async function insertMany(d: Db, table: string, cols: string[], rows: unknown[][]) {
  for (let i = 0; i < rows.length; i += 400) {
    const chunk = rows.slice(i, i + 400);
    const params: unknown[] = [];
    const values = chunk.map(r => '(' + r.map(v => { params.push(v); return '$' + params.length; }).join(',') + ')').join(',');
    await d.query(`insert into ${table} (${cols.join(',')}) values ${values}`, params);
  }
}

export async function seedDemo(d: Db) {
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const id = () => crypto.randomUUID();
  const P = DEMO_PRACTICE;
  await d.query(`insert into practices (id, name) values ($1,'Riverside Family Medicine')`, [P]);
  const main = id(), north = id();
  await insertMany(d, 'locations', ['id', 'practice_id', 'name'], [[main, P, 'Main Street'], [north, P, 'North Clinic']]);
  await d.query(`insert into users (id, practice_id, email, name, role, password_hash) values ('00000000-0000-4000-8000-000000000002',$1,$2,'Dr. Sam Rivera','owner',$3)`, [P, DEMO_EMAIL, bcrypt.hashSync(DEMO_PASSWORD, 8)]);
  await d.query(`insert into practice_settings (practice_id, cash_floor_cents) values ($1, 6000000)`, [P]);
  const item = id();
  await d.query(`insert into plaid_items (id, practice_id, item_id, institution_name, access_token_enc, last_synced_at) values ($1,$2,'demo-item','First Community Bank',$3, now() - interval '3 hours')`, [item, P, encrypt('demo-not-a-real-token')]);
  const op = id(), op2 = id(), card = id();
  await insertMany(d, 'bank_accounts', ['id', 'practice_id', 'plaid_item_id', 'account_id', 'name', 'mask', 'type', 'subtype', 'location_id', 'current_cents', 'available_cents', 'balance_at'], [
    [op, P, item, 'demo-op', 'Operating checking', '4021', 'depository', 'checking', main, 8_642_000, 8_642_000, new Date(Date.now() - 3 * 36e5)],
    [op2, P, item, 'demo-op2', 'North Clinic checking', '7710', 'depository', 'checking', north, 2_315_000, 2_315_000, new Date(Date.now() - 3 * 36e5)],
    [card, P, item, 'demo-card', 'Business card', '1188', 'credit', 'credit card', main, -1_204_000, -1_204_000, new Date(Date.now() - 3 * 36e5)],
  ]);

  const today = new Date();
  const day = (n: number) => new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - n)).toISOString().slice(0, 10);
  const ymd = (n: number) => day(n).replace(/-/g, '');
  void ymd;
  const ledger: unknown[][] = [], remits: unknown[][] = [], claims: unknown[][] = [], payouts: unknown[][] = [];
  let n = 0;
  const tx = (acct: string, loc: string, dAgo: number, cents: number, desc: string, kind: string, payer: string | null = null) => {
    const eid = id();
    ledger.push([eid, P, 'plaid', `demo-${++n}`, acct, loc, day(dAgo), cents, desc, kind, payer]);
    return eid;
  };
  // Payer behaviour: label on the deposit, display name, median days to pay, denial rate.
  const payers = [
    ['UNITEDHEALTHCARE', 'UnitedHealthcare', 24, 0.07, 1.0],
    ['AETNA', 'Aetna', 27, 0.06, 0.8],
    ['BCBS', 'Blue Cross Blue Shield', 19, 0.05, 1.1],
    ['MEDICARE NORIDIAN', 'Medicare', 14, 0.04, 1.2],
    ['CIGNA', 'Cigna', 36, 0.11, 0.6],
  ] as const;
  const reasons = [['CO', '197', 34], ['CO', '16', 22], ['CO', '27', 14], ['CO', '29', 10], ['CO', '50', 12], ['CO', '18', 8]] as const;
  const pickReason = () => { let r = rnd() * 100; for (const x of reasons) { if ((r -= x[2]) <= 0) return x; } return reasons[0]; };
  const providers = ['Sam Rivera', 'Priya Nair', 'Marcus Lee', 'Jenna Ortiz'];
  const provWeight = [0.32, 0.28, 0.24, 0.16];
  const pickProv = () => { let r = rnd(); for (let i = 0; i < providers.length; i++) if ((r -= provWeight[i]) <= 0) return providers[i]; return providers[0]; };

  for (let w = WEEKS - 1; w >= 0; w--) {
    const season = 1 + 0.08 * Math.sin((w / 52) * Math.PI * 2);
    const growth = 1 + (WEEKS - w) * 0.002;
    for (const [i, [label, payer, dtp, denyRate, size]] of payers.entries()) {
      const dAgo = w * 7 + i;
      if (dAgo < 1) continue;
      const cents = Math.round((7000 + rnd() * 6000) * 100 * size * season * growth);
      const trace = `${(910000000 + n * 37) % 999999999}`;
      const loc = i % 3 === 2 ? north : main;
      tx(loc === north ? op2 : op, loc, dAgo, cents, `${label} HCCLAIMPMT TRN*1*${trace}`, 'insurer_deposit', payer);
      if (w <= 1 && i === 4) continue; // two recent deposits arrive without an ERA
      const rid = id();
      remits.push([rid, P, label, trace, day(dAgo + 1), cents, 'ACH', 'sample-835.txt']);
      const count = 4 + Math.floor(rnd() * 5);
      let left = cents;
      for (let c = 0; c < count; c++) {
        const paid = c === count - 1 ? left : Math.round(left / (count - c) * (0.7 + rnd() * 0.5));
        left -= paid;
        const billed = Math.round(paid * (1.55 + rnd() * 0.2));
        const pr = Math.round(paid * 0.12);
        const recv = dAgo + 1 + Math.max(5, Math.round(dtp * (0.75 + rnd() * 0.5)));
        claims.push([id(), rid, `CLM${n}${c}`, '1', billed, paid, pr, JSON.stringify([{ group: 'CO', reason: '45', cents: billed - paid - pr }, { group: 'PR', reason: '2', cents: pr }]), day(recv), pickProv()]);
      }
      const denials = Math.round(count * denyRate * (0.6 + rnd() * 0.9) / (1 - denyRate));
      for (let c = 0; c < denials; c++) {
        const billed = Math.round((300 + rnd() * 2200) * 100);
        const [g, rc] = pickReason();
        claims.push([id(), rid, `CLD${n}${c}`, '4', billed, 0, 0, JSON.stringify([{ group: g, reason: rc, cents: billed }]), day(dAgo + 1 + Math.round(dtp * 0.8)), pickProv()]);
      }
    }
    const payout = Math.round((2200 + rnd() * 1800) * 100 * season);
    const pe = tx(op, main, w * 7 + 2, payout, 'STRIPE TRANSFER PAYOUT', 'processor_payout');
    void pe;
    if (w * 7 + 2 > 3) payouts.push([`po_demo_${w}`, P, payout, day(w * 7 + 2), 'paid']);
    tx(op, main, w * 7 + 3, -Math.round((3800 + rnd() * 2600) * 100), 'MCKESSON MEDICAL SURGICAL', 'vendor');
    tx(card, main, w * 7 + 4, -Math.round((400 + rnd() * 900) * 100), 'AMAZON BUSINESS SUPPLIES', 'vendor');
    if (w % 2 === 0) { tx(op, main, w * 7 + 5, -Math.round(4_610_000 * growth), 'GUSTO NET PAY', 'payroll'); tx(op, main, w * 7 + 5, -Math.round(1_180_000 * growth), 'GUSTO TAX', 'payroll'); }
    if (w % 4 === 1) { tx(op, main, w * 7 + 1, -1_450_000, 'RIVERSIDE PROPERTIES RENT', 'vendor'); tx(op2, north, w * 7 + 1, -820_000, 'NORTHGATE PLAZA RENT', 'vendor'); }
    if (w % 4 === 2) tx(op, main, w * 7 + 6, -Math.round((900 + rnd() * 600) * 100), 'ATHENAHEALTH SUBSCRIPTION', 'vendor');
    if (w % 13 === 3) tx(op, main, w * 7 + 2, -2_500_000, 'TRANSFER TO RESERVE', 'transfer');
    tx(op, main, w * 7 + 3, -Math.round((2600 + rnd() * 900) * 100), 'LABCORP LAB SERVICES', 'vendor');
    if (w % 2 === 1) tx(op, main, w * 7 + 6, -1_600_000, 'PARTNER DISTRIBUTION', 'other');
    if (w % 4 === 3) tx(op, main, w * 7 + 4, -880_000, 'MEDPRO MALPRACTICE INS', 'vendor');
  }
  await insertMany(d, 'ledger_entries', ['id', 'practice_id', 'source', 'source_id', 'bank_account_id', 'location_id', 'posted_on', 'amount_cents', 'description', 'kind', 'payer'], ledger);
  await insertMany(d, 'remittances', ['id', 'practice_id', 'payer', 'trace_number', 'paid_on', 'total_cents', 'method', 'file_name'], remits);
  await insertMany(d, 'remittance_claims', ['id', 'remittance_id', 'claim_ref', 'status_code', 'billed_cents', 'paid_cents', 'patient_resp_cents', 'adjustments', 'received_on', 'rendering_provider'], claims);
  await insertMany(d, 'stripe_payouts', ['payout_id', 'practice_id', 'amount_cents', 'arrival_date', 'status'], payouts);
  await matchPractice(P, d);
  await matchPayouts(P, d);
  await d.query(`insert into stripe_accounts (practice_id, account_id, charges_enabled, payouts_enabled, details_submitted) values ($1,'acct_demo',true,true,true)`, [P]);
  const pr = [['J. Alvarez', 18_500, 'paid', 2], ['M. Chen', 42_000, 'paid', 5], ['T. Okafor', 9_500, 'open', 1], ['R. Patel', 126_000, 'open', 19], ['L. Brooks', 31_000, 'paid', 9]] as const;
  for (const [name, cents, status, ago] of pr)
    await d.query(`insert into payment_requests (practice_id, location_id, statement_ref, patient_name, patient_contact, amount_cents, status, checkout_url, created_at, paid_at) values ($1,$2,$3,$4,'patient@example.com',$5,$6,'#demo', now() - ($7 || ' days')::interval, case when $6='paid' then now() - (($7::int - 1) || ' days')::interval end)`,
      [P, main, `ARIA-DM${10 + ago}QX${20 + ago}`, name, cents, status, String(ago)]);
}
