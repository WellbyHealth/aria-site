// Every number the views show, computed from three sources we have today: Plaid (bank), Stripe (patient payments)
// and 835 remittances (insurers). Loading is in SQL; the math is pure functions over plain rows so it can be tested.
import { db } from './db';
import { forecast, type Week } from './forecast';
import { classify } from './classify';
import type { Filters } from './filters';

export interface Flow { d: string; cents: number; kind: string; payer: string | null; loc: string | null; desc: string; matched: boolean; credit: boolean }
export interface Claim { paid: string; recv: string | null; payer: string; loc: string | null; status: string; billed: number; paidC: number; pr: number; adj: { group: string; reason: string; cents: number }[]; provider: string | null; ref: string }
export interface Settings { cash_floor_cents: number; days_cash_min: number; denial_rate_max_bps: number; days_to_pay_max: number; staff_cost_max_bps: number; unmatched_days: number }
export type Unit = 'usd' | 'pct' | 'days' | 'count';
export type Status = 'ok' | 'watch' | 'alert' | 'none';
export interface Kpi { key: string; label: string; value: number | null; unit: Unit; prior: number | null; target: { op: '>=' | '<=' | 'none'; value: number; text: string }; status: Status; spark: number[]; hint: string; href?: string; betterUp?: boolean; note?: string }

export const DEFAULT_SETTINGS: Settings = { cash_floor_cents: 0, days_cash_min: 30, denial_rate_max_bps: 800, days_to_pay_max: 30, staff_cost_max_bps: 6000, unmatched_days: 5 };
const DAY = 864e5;
const t = (s: string) => Date.parse(s + 'T00:00:00Z');
export const inRange = (d: string, from: string, to: string) => d >= from && d <= to;
export const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
export function median(xs: number[]) { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }

// The last twelve complete calendar months, so a half-finished month never reads as a collapse.
export function months(today: string) {
  const d = new Date(t(today));
  return Array.from({ length: 12 }, (_, i) => {
    const s = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 12 + i, 1), e = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 11 + i, 0);
    return { from: new Date(s).toISOString().slice(0, 10), to: new Date(e).toISOString().slice(0, 10), label: new Date(s).toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }) };
  });
}

// A threshold breach is "alert"; within 10% of it is "watch".
export function statusFor(value: number | null, op: '>=' | '<=' | 'none', target: number): Status {
  if (value == null || op === 'none') return 'none';
  if (op === '>=') return value < target ? 'alert' : value < target * 1.1 ? 'watch' : 'ok';
  return value > target ? 'alert' : value > target * 0.9 ? 'watch' : 'ok';
}

export const payerName = (raw: string) => classify(1, raw).payer || raw.replace(/\b\w/g, c => c.toUpperCase()).replace(/\B\w/g, c => c.toLowerCase());
export const isInflow = (f: Flow) => f.cents > 0 && f.kind !== 'transfer' && !f.credit;
export const isOutflow = (f: Flow) => f.cents < 0 && f.kind !== 'transfer';
// Partner distributions leave the bank but are not an operating cost.
export const isDistribution = (f: Flow) => /DISTRIBUTION|OWNER DRAW/i.test(f.desc);
export const isOpex = (f: Flow) => isOutflow(f) && !isDistribution(f);
export const collectionsOf = (fs: Flow[]) => sum(fs.filter(f => f.cents > 0 && (f.kind === 'insurer_deposit' || f.kind === 'processor_payout' || f.kind === 'patient_payment') && !f.credit).map(f => f.cents));

export function costCategory(f: Flow) {
  if (f.kind === 'payroll') return 'Payroll and benefits';
  if (/DISTRIBUTION|OWNER DRAW/i.test(f.desc)) return 'Partner distributions';
  if (/RENT|LEASE|PROPERT|PLAZA/i.test(f.desc)) return 'Rent and occupancy';
  if (/MALPRACTICE|INSURANCE|INS\b/i.test(f.desc)) return 'Insurance';
  if (/LABCORP|QUEST|LAB SERV/i.test(f.desc)) return 'Lab and outside services';
  if (/MCKESSON|HENRY SCHEIN|MEDLINE|OWENS|CARDINAL|SUPPL/i.test(f.desc)) return 'Medical supplies';
  if (/ATHENA|EPIC|ECLINICAL|MODMED|SOFTWARE|SUBSCRIPTION|MICROSOFT|GOOGLE/i.test(f.desc)) return 'Software and IT';
  return 'Other vendors and card spend';
}

// Common CARC reason codes for denials, in plain words.
export const CARC: Record<string, string> = {
  '197': 'No prior authorization', '16': 'Missing or invalid claim information', '27': 'Coverage ended before service',
  '29': 'Filed after the deadline', '50': 'Not deemed medically necessary', '18': 'Duplicate claim', '96': 'Non-covered charge',
  '4': 'Modifier missing or wrong', '11': 'Diagnosis does not match procedure', '22': 'Another payer is primary', '45': 'Above contracted rate',
};

export async function load(practiceId: string, f: Filters, today = new Date().toISOString().slice(0, 10)) {
  const d = await db();
  const since = new Date(t(today) - 400 * DAY).toISOString().slice(0, 10);
  const [settingsRow] = await d.query(`select * from practice_settings where practice_id=$1`, [practiceId]);
  const settings: Settings = { ...DEFAULT_SETTINGS, ...(settingsRow ? Object.fromEntries(Object.entries(settingsRow).map(([k, v]) => [k, typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : v])) : {}) } as Settings;
  const accounts = await d.query(`select ba.*, l.name location_name, pi.institution_name, pi.status item_status, pi.last_synced_at from bank_accounts ba left join locations l on l.id=ba.location_id left join plaid_items pi on pi.id=ba.plaid_item_id where ba.practice_id=$1 order by l.name nulls last, ba.name`, [practiceId]);
  const locations = await d.query(`select id, name from locations where practice_id=$1 order by name`, [practiceId]);
  const flowRows = await d.query(`select to_char(le.posted_on,'YYYY-MM-DD') d, le.amount_cents, le.kind, le.payer, coalesce(le.location_id, ba.location_id) loc, le.description, le.matched_remittance_id is not null matched, coalesce(ba.type,'') = 'credit' credit
    from ledger_entries le left join bank_accounts ba on ba.id=le.bank_account_id where le.practice_id=$1 and le.source='plaid' and not le.pending and le.posted_on >= $2`, [practiceId, since]);
  const claimRows = await d.query(`select to_char(r.paid_on,'YYYY-MM-DD') paid, to_char(c.received_on,'YYYY-MM-DD') recv, r.payer, le.location_id loc, c.status_code, c.billed_cents, c.paid_cents, c.patient_resp_cents, c.adjustments, c.rendering_provider, c.claim_ref
    from remittance_claims c join remittances r on r.id=c.remittance_id left join ledger_entries le on le.id=r.matched_entry_id where r.practice_id=$1 and r.paid_on >= $2`, [practiceId, since]);
  const payouts = await d.query(`select amount_cents, to_char(arrival_date,'YYYY-MM-DD') d, matched_entry_id is not null matched from stripe_payouts where practice_id=$1 and arrival_date >= $2`, [practiceId, since]);
  const remitTotals = await d.query(`select count(*)::int n, count(matched_entry_id)::int m, max(paid_on) last from remittances where practice_id=$1`, [practiceId]);
  const [stripeAcct] = await d.query(`select * from stripe_accounts where practice_id=$1`, [practiceId]);
  const openPay = await d.query(`select count(*)::int n, coalesce(sum(amount_cents),0)::bigint c from payment_requests where practice_id=$1 and status='open' and created_at < now() - interval '14 days'`, [practiceId]);
  const [owner] = await d.query(`select name from users where practice_id=$1 order by case role when 'owner' then 0 else 1 end, created_at limit 1`, [practiceId]);

  const allFlows: Flow[] = flowRows.map(r => ({ d: r.d, cents: Number(r.amount_cents), kind: r.kind, payer: r.payer, loc: r.loc, desc: r.description, matched: r.matched, credit: r.credit }));
  const allClaims: Claim[] = claimRows.map(r => ({ paid: r.paid, recv: r.recv, payer: payerName(r.payer), loc: r.loc, status: r.status_code, billed: Number(r.billed_cents), paidC: Number(r.paid_cents), pr: Number(r.patient_resp_cents), adj: typeof r.adjustments === 'string' ? JSON.parse(r.adjustments) : r.adjustments || [], provider: r.rendering_provider, ref: r.claim_ref }));
  const payers = [...new Set([...allClaims.map(c => c.payer), ...allFlows.filter(x => x.payer).map(x => x.payer!)])].sort();
  const flows = allFlows.filter(x => !f.site || x.loc === f.site);
  const claims = allClaims.filter(c => (!f.site || c.loc === f.site) && (!f.payer || c.payer === f.payer));
  const siteAccounts = accounts.filter(a => !f.site || a.location_id === f.site);
  return { settings, accounts: siteAccounts, allAccounts: accounts, locations, flows, claims, payers, payouts, remitTotals: remitTotals[0], stripeAcct, openPay: openPay[0], owner: owner?.name || 'Owner', today, f };
}
export type Data = Awaited<ReturnType<typeof load>>;

export const denied = (c: Claim) => c.paidC === 0 && (c.status === '4' || c.status === '22');
export function denialRate(cs: Claim[]) { return cs.length ? cs.filter(denied).length / cs.length : null; }
export function daysToPay(cs: Claim[]) { return median(cs.filter(c => c.recv && !denied(c)).map(c => (t(c.paid) - t(c.recv!)) / DAY)); }

export function cashToday(accounts: any[]) { return sum(accounts.filter(a => a.type === 'depository').map(a => Number(a.current_cents || 0))); }
// Balance at the end of a past day = today's balance minus everything that posted after it.
export function balanceAt(cash: number, flows: Flow[], day: string) { return cash - sum(flows.filter(x => !x.credit && x.d > day).map(x => x.cents)); }
export function dailyOutflow(flows: Flow[], to: string) {
  const from = new Date(t(to) - 89 * DAY).toISOString().slice(0, 10);
  return -sum(flows.filter(x => isOpex(x) && !x.credit && inRange(x.d, from, to)).map(x => x.cents)) / 90;
}

export function computeKpis(D: Data) {
  const { f, settings: S, flows, claims, today } = D;
  const ms = months(today);
  const inF = (x: { d: string }) => inRange(x.d, f.from, f.to), inP = (x: { d: string }) => inRange(x.d, f.pFrom, f.pTo);
  const cInF = (c: Claim) => inRange(c.paid, f.from, f.to), cInP = (c: Claim) => inRange(c.paid, f.pFrom, f.pTo);
  const payerFlows = flows.filter(x => !f.payer || x.payer === f.payer);
  const cash = cashToday(D.accounts);
  const priorDay = new Date(t(f.from) - DAY).toISOString().slice(0, 10);
  const weeks: Week[] = forecast(cash, flows.filter(x => !x.credit).map(x => ({ posted_on: x.d, amount_cents: x.cents, kind: x.kind })), today);
  const low = weeks.length ? weeks.reduce((m, w) => (w.endCents < m.endCents ? w : m), weeks[0]) : null;
  const doh = (to: string, bal: number) => { const o = dailyOutflow(flows, to); return o > 0 ? bal / o : null; };
  const insurer = (fs: Flow[]) => sum(fs.filter(x => x.kind === 'insurer_deposit' && x.cents > 0).map(x => x.cents));
  const patient = (fs: Flow[]) => sum(fs.filter(x => x.kind === 'processor_payout' && x.cents > 0).map(x => x.cents));
  const staff = (fs: Flow[]) => { const c = collectionsOf(fs); return c ? -sum(fs.filter(x => x.kind === 'payroll' && x.cents < 0).map(x => x.cents)) / c : null; };
  const margin = (fs: Flow[]) => { const i = sum(fs.filter(isInflow).map(x => x.cents)); return i ? (i + sum(fs.filter(isOpex).map(x => x.cents))) / i : null; };
  const unmatchedCut = new Date(t(today) - S.unmatched_days * DAY).toISOString().slice(0, 10);
  const unmatchedFrom = new Date(t(today) - 90 * DAY).toISOString().slice(0, 10);
  const unmatched = flows.filter(x => x.kind === 'insurer_deposit' && x.cents > 0 && !x.matched && x.d <= unmatchedCut && x.d >= unmatchedFrom);
  const byMonth = <T,>(fn: (m: { from: string; to: string }) => T) => ms.map(fn);
  const pct = (bps: number) => bps / 10000;

  const kpis: Kpi[] = [
    { key: 'cash', label: 'Cash today', unit: 'usd', value: cash, prior: balanceAt(cash, flows, priorDay), betterUp: true,
      target: { op: S.cash_floor_cents ? '>=' : 'none', value: S.cash_floor_cents, text: S.cash_floor_cents ? `Floor ${short(S.cash_floor_cents)}` : 'Set a cash floor' },
      status: 'none', spark: byMonth(m => balanceAt(cash, flows, m.to)), hint: 'Balance across connected checking and savings accounts, from Plaid.', href: '/hub/cash' },
    { key: 'days_cash', label: 'Days cash on hand', unit: 'days', value: doh(today, cash), prior: doh(priorDay, balanceAt(cash, flows, priorDay)), betterUp: true,
      target: { op: '>=', value: S.days_cash_min, text: `Target ≥ ${S.days_cash_min} days` }, status: 'none',
      spark: byMonth(m => doh(m.to, balanceAt(cash, flows, m.to)) ?? 0), hint: 'Cash ÷ average daily spending over the last 90 days.', href: '/hub/cash' },
    { key: 'low_point', label: 'Forecast low point', unit: 'usd', value: low ? low.endCents : null, prior: null, betterUp: true,
      target: { op: S.cash_floor_cents ? '>=' : 'none', value: S.cash_floor_cents, text: low ? `Week of ${fmtDay(low.weekStart)}` : '' }, status: 'none',
      spark: weeks.map(w => w.endCents), hint: 'Lowest projected week-end balance in the next 13 weeks.', href: '/hub/cash' },
    { key: 'insurer', label: 'Insurer collections', unit: 'usd', value: insurer(payerFlows.filter(inF)), prior: insurer(payerFlows.filter(inP)), betterUp: true,
      target: { op: 'none', value: 0, text: 'vs prior period' }, status: 'none', spark: byMonth(m => insurer(payerFlows.filter(x => inRange(x.d, m.from, m.to)))),
      hint: 'Insurer deposits that reached your bank accounts.', href: '/hub/payers' },
    { key: 'patient', label: 'Patient collections', unit: 'usd', value: patient(flows.filter(inF)), prior: patient(flows.filter(inP)), betterUp: true,
      target: { op: 'none', value: 0, text: 'vs prior period' }, status: 'none', spark: byMonth(m => patient(flows.filter(x => inRange(x.d, m.from, m.to)))),
      hint: 'Card and payment-link money paid out by Stripe into your bank.', href: '/hub/payments' },
    { key: 'denial_rate', label: 'Denial rate', unit: 'pct', value: denialRate(claims.filter(cInF)), prior: denialRate(claims.filter(cInP)),
      target: { op: '<=', value: pct(S.denial_rate_max_bps), text: `Target ≤ ${S.denial_rate_max_bps / 100}%` }, status: 'none',
      spark: byMonth(m => denialRate(claims.filter(c => inRange(c.paid, m.from, m.to))) ?? 0), hint: 'Claims the insurer paid nothing on ÷ claims on remittances in the period.', href: '/hub/revenue' },
    { key: 'days_to_pay', label: 'Days to pay', unit: 'days', value: daysToPay(claims.filter(cInF)), prior: daysToPay(claims.filter(cInP)),
      target: { op: '<=', value: S.days_to_pay_max, text: `Target ≤ ${S.days_to_pay_max} days` }, status: 'none',
      spark: byMonth(m => daysToPay(claims.filter(c => inRange(c.paid, m.from, m.to))) ?? 0), hint: 'Median days from the insurer receiving a claim to paying it, from 835 files.', href: '/hub/payers' },
    { key: 'unmatched', label: 'Deposits with no remittance', unit: 'usd', value: sum(unmatched.map(x => x.cents)), prior: null,
      target: { op: '<=', value: 0, text: `${unmatched.length} older than ${S.unmatched_days} days` }, status: 'none', spark: [],
      hint: 'Insurer money in the bank that no 835 file explains yet. Each one is a payment nobody has checked.', href: '/hub/remittances' },
    { key: 'staff_cost', label: 'Payroll % of collections', unit: 'pct', value: staff(flows.filter(inF)), prior: staff(flows.filter(inP)),
      target: { op: '<=', value: pct(S.staff_cost_max_bps), text: `Target ≤ ${S.staff_cost_max_bps / 100}%` }, status: 'none',
      spark: byMonth(m => staff(flows.filter(x => inRange(x.d, m.from, m.to))) ?? 0), hint: 'All payroll leaving the bank, providers included, ÷ money collected. Staff-only cost needs your payroll system.', href: '/hub/costs', note: 'All payroll, from bank activity' },
    { key: 'margin', label: 'Operating margin', unit: 'pct', value: margin(flows.filter(inF)), prior: margin(flows.filter(inP)), betterUp: true,
      target: { op: 'none', value: 0, text: 'vs prior period' }, status: 'none', spark: byMonth(m => margin(flows.filter(x => inRange(x.d, m.from, m.to))) ?? 0),
      hint: '(Money in − operating spending) ÷ money in. Excludes transfers and partner distributions. Cash basis until the general ledger is connected.', href: '/hub/costs', note: 'Cash basis' },
  ];
  for (const k of kpis) k.status = k.key === 'unmatched' ? (unmatched.length ? 'watch' : 'ok') : statusFor(k.value, k.target.op, k.target.value);
  return { kpis, weeks, low, cash, unmatched, ms };
}

export function revenueCycle(D: Data) {
  const { f, claims, today } = D;
  const cs = claims.filter(c => inRange(c.paid, f.from, f.to));
  const den = cs.filter(denied);
  const billed = sum(cs.map(c => c.billed)), paid = sum(cs.map(c => c.paidC)), pr = sum(cs.map(c => c.pr));
  const deniedBilled = sum(den.map(c => c.billed));
  const contractual = sum(cs.flatMap(c => c.adj.filter(a => a.group === 'CO' && a.reason === '45').map(a => a.cents)));
  const reasons = new Map<string, { code: string; label: string; n: number; cents: number }>();
  for (const c of den) {
    const a = c.adj.find(x => x.reason !== '45' && x.group !== 'PR') || c.adj[0];
    const code = a ? `${a.group}-${a.reason}` : 'Unknown';
    const r = reasons.get(code) || { code, label: (a && CARC[a.reason]) || 'Other reason', n: 0, cents: 0 };
    r.n++; r.cents += c.billed; reasons.set(code, r);
  }
  const ms = months(today);
  return {
    claims: cs.length, denied: den.length, billed, paid, pr, deniedBilled, contractual, allowed: paid + pr,
    paidPct: billed ? paid / billed : null, prShare: paid + pr ? pr / (paid + pr) : null,
    pareto: [...reasons.values()].sort((a, b) => b.cents - a.cents),
    trend: ms.map(m => ({ label: m.label, v: denialRate(claims.filter(c => inRange(c.paid, m.from, m.to))) })),
    recent: den.sort((a, b) => b.billed - a.billed).slice(0, 12),
  };
}

export function payerTable(D: Data) {
  const { f, claims, flows, today } = D;
  const ms = months(today);
  const dep = flows.filter(x => x.kind === 'insurer_deposit' && x.cents > 0);
  const total = sum(dep.filter(x => inRange(x.d, f.from, f.to)).map(x => x.cents));
  const names = [...new Set([...claims.map(c => c.payer), ...dep.map(x => x.payer || 'Unknown')])];
  return names.map(name => {
    const pd = dep.filter(x => (x.payer || 'Unknown') === name);
    const pc = claims.filter(c => c.payer === name && inRange(c.paid, f.from, f.to));
    const collected = sum(pd.filter(x => inRange(x.d, f.from, f.to)).map(x => x.cents));
    const billed = sum(pc.map(c => c.billed));
    return {
      name, collected, prior: sum(pd.filter(x => inRange(x.d, f.pFrom, f.pTo)).map(x => x.cents)), share: total ? collected / total : 0,
      claims: pc.length, denialRate: denialRate(pc), daysToPay: daysToPay(pc), paidPct: billed ? sum(pc.map(c => c.paidC)) / billed : null,
      spark: ms.map(m => sum(pd.filter(x => inRange(x.d, m.from, m.to)).map(x => x.cents))),
    };
  }).filter(p => p.collected || p.claims).sort((a, b) => b.collected - a.collected);
}

export function providerTable(D: Data) {
  const { f, claims, today } = D;
  const ms = months(today);
  const cs = claims.filter(c => c.provider);
  const total = sum(cs.filter(c => inRange(c.paid, f.from, f.to)).map(c => c.paidC));
  return [...new Set(cs.map(c => c.provider!))].map(name => {
    const pc = cs.filter(c => c.provider === name && inRange(c.paid, f.from, f.to));
    const paid = sum(pc.map(c => c.paidC));
    const prior = sum(cs.filter(c => c.provider === name && inRange(c.paid, f.pFrom, f.pTo)).map(c => c.paidC));
    const display = /[a-z]/.test(name) ? name : name.toLowerCase().replace(/\b\w/g, ch => ch.toUpperCase());
    return { name: display, paid, prior, share: total ? paid / total : 0, claims: pc.length, denialRate: denialRate(pc), perClaim: pc.filter(c => !denied(c)).length ? paid / pc.filter(c => !denied(c)).length : null,
      spark: ms.map(m => sum(cs.filter(c => c.provider === name && inRange(c.paid, m.from, m.to)).map(c => c.paidC))) };
  }).sort((a, b) => b.paid - a.paid);
}

export function costTable(D: Data) {
  const { f, flows, today } = D;
  const ms = months(today);
  const out = flows.filter(isOutflow);
  const coll = collectionsOf(flows.filter(x => inRange(x.d, f.from, f.to)));
  const cats = ['Payroll and benefits', 'Rent and occupancy', 'Medical supplies', 'Lab and outside services', 'Insurance', 'Software and IT', 'Other vendors and card spend', 'Partner distributions'];
  const rows = cats.map(name => {
    const c = out.filter(x => costCategory(x) === name);
    const amt = -sum(c.filter(x => inRange(x.d, f.from, f.to)).map(x => x.cents));
    return { name, amount: amt, prior: -sum(c.filter(x => inRange(x.d, f.pFrom, f.pTo)).map(x => x.cents)), pctOfCollections: coll ? amt / coll : null,
      spark: ms.map(m => -sum(c.filter(x => inRange(x.d, m.from, m.to)).map(x => x.cents))) };
  }).filter(r => r.amount || r.prior);
  const trend = ms.map(m => ({ label: m.label, collections: collectionsOf(flows.filter(x => inRange(x.d, m.from, m.to))), spend: -sum(out.filter(x => !isDistribution(x) && inRange(x.d, m.from, m.to)).map(x => x.cents)) }));
  const ops = rows.filter(r => r.name !== 'Partner distributions');
  return { rows: ops, distributions: rows.find(r => r.name === 'Partner distributions') || null, total: sum(ops.map(r => r.amount)), prior: sum(ops.map(r => r.prior)), collections: coll, trend };
}

export function depositMatch(D: Data) {
  const { f, flows, payouts } = D;
  const ins = flows.filter(x => x.kind === 'insurer_deposit' && x.cents > 0 && inRange(x.d, f.from, f.to));
  const po = payouts.filter(p => inRange(p.d, f.from, f.to));
  const other = flows.filter(x => x.cents > 0 && !x.credit && x.kind !== 'insurer_deposit' && x.kind !== 'processor_payout' && x.kind !== 'transfer' && inRange(x.d, f.from, f.to));
  return [
    { source: 'Insurer deposits ↔ 835 remittances', total: sum(ins.map(x => x.cents)), matched: sum(ins.filter(x => x.matched).map(x => x.cents)), n: ins.length, m: ins.filter(x => x.matched).length },
    { source: 'Stripe payouts ↔ bank deposits', total: sum(po.map(p => Number(p.amount_cents))), matched: sum(po.filter(p => p.matched).map(p => Number(p.amount_cents))), n: po.length, m: po.filter(p => p.matched).length },
    { source: 'Other money in (unexplained)', total: sum(other.map(x => x.cents)), matched: 0, n: other.length, m: 0 },
  ];
}

// Short currency for reading ($1.24M, $86.4K); the exact value goes in a title attribute.
export function short(cents: number | null | undefined) {
  if (cents == null) return '–';
  const v = cents / 100, a = Math.abs(v), s = v < 0 ? '−' : '';
  if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(a >= 1e7 ? 1 : 2)}M`;
  if (a >= 1e4) return `${s}$${(a / 1e3).toFixed(a >= 1e5 ? 0 : 1)}K`;
  return `${s}$${a.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}
export function fmtValue(v: number | null, unit: Unit) {
  if (v == null || Number.isNaN(v)) return '–';
  if (unit === 'usd') return short(v);
  if (unit === 'pct') return `${(v * 100).toFixed(1)}%`;
  if (unit === 'days') return `${Math.round(v)}`;
  return v.toLocaleString('en-US');
}
export const fmtDay = (iso: string) => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
