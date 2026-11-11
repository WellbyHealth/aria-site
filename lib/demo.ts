// Sample data for demo mode only (no DATABASE_URL). A fictional practice; every figure is invented.
import bcrypt from 'bcryptjs';
import type { Db } from './db';
import { encrypt } from './crypto';
import { matchPractice } from './match';

export const DEMO_EMAIL = 'demo@ariapractice.com';
export const DEMO_PASSWORD = 'aria-demo';

export async function seedDemo(d: Db) {
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const [p] = await d.query(`insert into practices (id, name) values ('00000000-0000-4000-8000-000000000001','Riverside Family Medicine') returning id`);
  const [main] = await d.query(`insert into locations (practice_id, name) values ($1,'Main Street') returning id`, [p.id]);
  const [north] = await d.query(`insert into locations (practice_id, name) values ($1,'North Clinic') returning id`, [p.id]);
  await d.query(`insert into users (id, practice_id, email, name, role, password_hash) values ('00000000-0000-4000-8000-000000000002',$1,$2,'Dr. Sam Rivera','owner',$3)`, [p.id, DEMO_EMAIL, bcrypt.hashSync(DEMO_PASSWORD, 8)]);
  const [item] = await d.query(`insert into plaid_items (practice_id, item_id, institution_name, access_token_enc, last_synced_at) values ($1,'demo-item','First Community Bank',$2, now()) returning id`, [p.id, encrypt('demo-not-a-real-token')]);
  const acct = async (id: string, name: string, mask: string, type: string, sub: string, loc: string, cur: number) =>
    (await d.query(`insert into bank_accounts (practice_id, plaid_item_id, account_id, name, mask, type, subtype, location_id, current_cents, available_cents, balance_at) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9, now()) returning id`, [p.id, item.id, id, name, mask, type, sub, loc, cur]))[0].id;
  const op = await acct('demo-op', 'Operating checking', '4021', 'depository', 'checking', main.id, 8_642_000);
  const op2 = await acct('demo-op2', 'North Clinic checking', '7710', 'depository', 'checking', north.id, 2_315_000);
  const card = await acct('demo-card', 'Business card', '1188', 'credit', 'credit card', main.id, -1_204_000);

  const today = new Date(); const day = (n: number) => new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - n)).toISOString().slice(0, 10);
  let n = 0;
  const tx = async (acctId: string, loc: string, dAgo: number, cents: number, desc: string, kind: string, payer: string | null = null) =>
    d.query(`insert into ledger_entries (practice_id, source, source_id, bank_account_id, location_id, posted_on, amount_cents, description, kind, payer) values ($1,'plaid',$2,$3,$4,$5,$6,$7,$8,$9) returning id`, [p.id, `demo-${++n}`, acctId, loc, day(dAgo), cents, desc, kind, payer]);
  const payers = [['UNITEDHEALTHCARE', 'UnitedHealthcare'], ['AETNA', 'Aetna'], ['BCBS', 'Blue Cross Blue Shield'], ['MEDICARE NORIDIAN', 'Medicare'], ['CIGNA', 'Cigna']];
  const remits: { trace: string; cents: number; dAgo: number; payer: string; denied: boolean }[] = [];
  for (let w = 16; w >= 0; w--) {
    for (const [i, [label, payer]] of payers.entries()) {
      const dAgo = w * 7 + i;
      if (dAgo < 1) continue;
      const cents = Math.round((6000 + rnd() * 9000) * 100);
      const trace = `${(910000000 + n * 37) % 999999999}`;
      const loc = i % 3 === 2 ? north : main;
      await tx(loc === north ? op2 : op, loc.id, dAgo, cents, `${label} HCCLAIMPMT TRN*1*${trace}`, 'insurer_deposit', payer);
      if (!(w <= 1 && i === 4)) remits.push({ trace, cents, dAgo, payer: label, denied: w === 3 && i === 1 });
    }
    await tx(op, main.id, w * 7 + 2, Math.round((2200 + rnd() * 1800) * 100), 'STRIPE TRANSFER PAYOUT', 'processor_payout');
    await tx(op, main.id, w * 7 + 3, -Math.round((3800 + rnd() * 2600) * 100), 'MCKESSON MEDICAL SURGICAL', 'vendor');
    await tx(card, main.id, w * 7 + 4, -Math.round((400 + rnd() * 900) * 100), 'AMAZON BUSINESS SUPPLIES', 'vendor');
    if (w % 2 === 0) { await tx(op, main.id, w * 7 + 5, -4_610_000, 'GUSTO NET PAY', 'payroll'); await tx(op, main.id, w * 7 + 5, -1_180_000, 'GUSTO TAX', 'payroll'); }
    if (w % 4 === 1) { await tx(op, main.id, w * 7 + 1, -1_450_000, 'RIVERSIDE PROPERTIES RENT', 'vendor'); await tx(op2, north.id, w * 7 + 1, -820_000, 'NORTHGATE PLAZA RENT', 'vendor'); }
  }
  for (const r of remits) {
    const [rm] = await d.query(`insert into remittances (practice_id, payer, trace_number, paid_on, total_cents, method, file_name) values ($1,$2,$3,$4,$5,'ACH','sample-835.txt') returning id`, [p.id, r.payer, r.trace, day(r.dAgo + 1), r.cents]);
    const claims = 3 + Math.floor(rnd() * 4);
    let left = r.cents;
    for (let c = 0; c < claims; c++) {
      const paid = c === claims - 1 ? left : Math.round(left / (claims - c) * (0.7 + rnd() * 0.5));
      left -= paid;
      await d.query(`insert into remittance_claims (remittance_id, claim_ref, status_code, billed_cents, paid_cents, patient_resp_cents) values ($1,$2,'1',$3,$4,$5)`, [rm.id, `CLM${n}${c}`, Math.round(paid * 1.6), paid, Math.round(paid * 0.12)]);
    }
    if (r.denied) for (let c = 0; c < 3; c++) await d.query(`insert into remittance_claims (remittance_id, claim_ref, status_code, billed_cents, paid_cents) values ($1,$2,'4',$3,0)`, [rm.id, `CLMD${c}`, Math.round((800 + rnd() * 2400) * 100)]);
  }
  await matchPractice(p.id, d);
  await d.query(`insert into stripe_accounts (practice_id, account_id, charges_enabled, payouts_enabled, details_submitted) values ($1,'acct_demo',true,true,true)`, [p.id]);
  const pr = [['J. Alvarez', 18_500, 'paid', 2], ['M. Chen', 42_000, 'paid', 5], ['T. Okafor', 9_500, 'open', 1], ['R. Patel', 126_000, 'open', 19], ['L. Brooks', 31_000, 'paid', 9]] as const;
  for (const [name, cents, status, ago] of pr)
    await d.query(`insert into payment_requests (practice_id, location_id, statement_ref, patient_name, patient_contact, amount_cents, status, checkout_url, created_at, paid_at) values ($1,$2,$3,$4,'patient@example.com',$5,$6,'#demo', now() - ($7 || ' days')::interval, case when $6='paid' then now() - (($7::int - 1) || ' days')::interval end)`,
      [p.id, main.id, `ARIA-DM${10 + ago}QX${20 + ago}`, name, cents, status, String(ago)]);
}
