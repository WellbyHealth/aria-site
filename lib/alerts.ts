// Alerts: every KPI with a threshold, plus operational problems (a bank needing sign-in, unexplained deposits).
// One row per open alert, so the panel can say how long it has been open. Rules only; nothing is invented.
import { db } from './db';
import { fmtValue, short, fmtDay, type Data, type Kpi } from './metrics';
import { usd } from './money';

export interface Alert { key: string; title: string; tone: 'alert' | 'watch'; value: string; threshold: string; href: string; detail: string; openedAt?: string }

export function buildAlerts(D: Data, kpis: Kpi[], low: { weekStart: string; endCents: number } | null): Alert[] {
  const a: Alert[] = [];
  const S = D.settings;
  for (const r of D.allAccounts.filter(x => x.item_status === 'reconnect'))
    a.push({ key: `reconnect:${r.plaid_item_id}`, tone: 'alert', title: `Reconnect ${r.institution_name || 'a bank'}`, value: 'Sign-in needed', threshold: 'Connected', href: '/hub/banks', detail: 'Balances and transactions from this bank are out of date until you sign in again.' });
  const k = (key: string) => kpis.find(x => x.key === key)!;
  const cash = k('days_cash');
  if (cash.status === 'alert' || cash.status === 'watch')
    a.push({ key: 'days_cash', tone: cash.status, title: 'Days cash on hand is below target', value: `${fmtValue(cash.value, 'days')} days`, threshold: cash.target.text, href: '/hub/cash', detail: 'Hold large purchases or move reserve cash into operating.' });
  if (low && S.cash_floor_cents && low.endCents < S.cash_floor_cents)
    a.push({ key: 'low_point', tone: 'alert', title: `Cash drops under your floor the week of ${fmtDay(low.weekStart)}`, value: short(low.endCents), threshold: `Floor ${short(S.cash_floor_cents)}`, href: '/hub/cash', detail: 'The 13-week forecast dips below the minimum balance you set.' });
  const dr = k('denial_rate');
  if (dr.status === 'alert' || dr.status === 'watch')
    a.push({ key: 'denial_rate', tone: dr.status, title: 'Denial rate is above target', value: fmtValue(dr.value, 'pct'), threshold: dr.target.text, href: '/hub/revenue', detail: 'See which reason codes drive it, then fix the cause upstream.' });
  // Per-payer denial and days-to-pay breaches are where the money is, so they get their own lines.
  const byPayer = new Map<string, { n: number; d: number; days: number[] }>();
  for (const c of D.claims.filter(c => c.paid >= D.f.from && c.paid <= D.f.to)) {
    const p = byPayer.get(c.payer) || { n: 0, d: 0, days: [] };
    p.n++; if (c.paidC === 0 && (c.status === '4' || c.status === '22')) p.d++;
    else if (c.recv) p.days.push((Date.parse(c.paid) - Date.parse(c.recv)) / 864e5);
    byPayer.set(c.payer, p);
  }
  for (const [payer, p] of byPayer) {
    const rate = p.n >= 10 ? p.d / p.n : 0;
    if (rate > S.denial_rate_max_bps / 10000)
      a.push({ key: `denials:${payer}`, tone: 'alert', title: `${payer} is denying ${(rate * 100).toFixed(1)}% of claims`, value: `${(rate * 100).toFixed(1)}%`, threshold: `≤ ${S.denial_rate_max_bps / 100}%`, href: `/hub/revenue?payer=${encodeURIComponent(payer)}`, detail: 'Above your denial threshold for this payer.' });
    const sorted = p.days.sort((x, y) => x - y);
    const med = sorted.length >= 5 ? sorted[sorted.length >> 1] : 0;
    if (med > S.days_to_pay_max)
      a.push({ key: `dtp:${payer}`, tone: 'watch', title: `${payer} takes ${Math.round(med)} days to pay`, value: `${Math.round(med)} days`, threshold: `≤ ${S.days_to_pay_max} days`, href: `/hub/payers`, detail: 'Slow payers are the main reason a forecast misses. Raise it at contract renewal.' });
  }
  const un = k('unmatched');
  if (un.value)
    a.push({ key: 'unmatched', tone: 'watch', title: 'Insurer deposits with no remittance', value: usd(un.value), threshold: un.target.text, href: '/hub/remittances', detail: 'Upload the 835 files from your clearinghouse so each payment can be checked.' });
  const st = k('staff_cost');
  if (st.status === 'alert')
    a.push({ key: 'staff_cost', tone: 'alert', title: 'Payroll is above target', value: fmtValue(st.value, 'pct'), threshold: st.target.text, href: '/hub/costs', detail: 'Payroll is taking a larger share of collections than your target.' });
  if (D.openPay.n)
    a.push({ key: 'patient_open', tone: 'watch', title: `${D.openPay.n} patient ${D.openPay.n === 1 ? 'balance' : 'balances'} unpaid after 14 days`, value: usd(D.openPay.c), threshold: 'Paid within 14 days', href: '/hub/payments', detail: 'Send a fresh payment link.' });
  if (!D.stripeAcct?.charges_enabled)
    a.push({ key: 'stripe_setup', tone: 'watch', title: 'Finish patient payment setup', value: 'Not verified', threshold: 'Verified', href: '/hub/payments', detail: 'Patients can pay by link once your Stripe account is verified.' });
  if (!D.allAccounts.length)
    a.unshift({ key: 'no_bank', tone: 'alert', title: 'Connect your first bank account', value: 'None', threshold: '1 or more', href: '/hub/banks', detail: 'Cash and the forecast need at least one operating account.' });
  return a.sort((x, y) => (x.tone === y.tone ? 0 : x.tone === 'alert' ? -1 : 1));
}

// Keep opened_at stable across page loads; close alerts that cleared. Filtered views do not write.
export async function syncAlerts(practiceId: string, alerts: Alert[], persist: boolean) {
  const d = await db();
  if (persist) {
    for (const x of alerts)
      await d.query(`insert into alerts (practice_id, key, title, tone, value_text, threshold_text, href) values ($1,$2,$3,$4,$5,$6,$7)
        on conflict (practice_id, key) do update set title=excluded.title, tone=excluded.tone, value_text=excluded.value_text, threshold_text=excluded.threshold_text, href=excluded.href, last_seen_at=now(),
        opened_at=case when alerts.closed_at is not null then now() else alerts.opened_at end, closed_at=null`, [practiceId, x.key, x.title, x.tone, x.value, x.threshold, x.href]);
    await d.query(`update alerts set closed_at=now() where practice_id=$1 and closed_at is null and not (key = any($2::text[]))`, [practiceId, alerts.map(x => x.key)]);
  }
  const rows = await d.query(`select key, opened_at from alerts where practice_id=$1 and closed_at is null`, [practiceId]);
  const opened = new Map(rows.map(r => [r.key, new Date(r.opened_at).toISOString()]));
  return alerts.map(x => ({ ...x, openedAt: opened.get(x.key) }));
}

export function age(iso?: string) {
  if (!iso) return 'new';
  const h = (Date.now() - Date.parse(iso)) / 36e5;
  if (h < 1) return 'under an hour';
  if (h < 48) return `${Math.round(h)} hours`;
  return `${Math.round(h / 24)} days`;
}
