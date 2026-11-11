// The owner's weekly list. Rules first; each item says what to do and why. The AI layer can reword these later,
// but it never adds an action a rule did not produce.
import { db } from './db';
import { forecast } from './forecast';
import { usd } from './money';

export interface Item { tone: 'act' | 'watch' | 'good'; title: string; detail: string; href?: string }

export async function hubData(practiceId: string, today = new Date().toISOString().slice(0, 10)) {
  const d = await db();
  const accounts = await d.query(`select ba.*, l.name location_name, pi.institution_name, pi.status item_status from bank_accounts ba left join locations l on l.id=ba.location_id left join plaid_items pi on pi.id=ba.plaid_item_id where ba.practice_id=$1 order by l.name nulls last, ba.name`, [practiceId]);
  const cash = accounts.filter(a => a.type === 'depository').reduce((s, a) => s + Number(a.current_cents || 0), 0);
  const flows = await d.query(`select to_char(posted_on,'YYYY-MM-DD') posted_on, amount_cents, kind from ledger_entries where practice_id=$1 and source='plaid' and not pending`, [practiceId]);
  const weeks = forecast(cash, flows as any, today);
  const low = weeks.reduce((m, w) => (w.endCents < m.endCents ? w : m), weeks[0]);
  const payrollRun = Math.max(0, ...weeks.map(w => w.payrollCents));
  const unmatched = await d.query(`select count(*)::int n, coalesce(sum(amount_cents),0)::bigint c from ledger_entries where practice_id=$1 and source='plaid' and kind='insurer_deposit' and matched_remittance_id is null and posted_on < $2::date - 3`, [practiceId, today]);
  const denied = await d.query(`select count(*)::int n, coalesce(sum(rc.billed_cents),0)::bigint c from remittance_claims rc join remittances r on r.id=rc.remittance_id where r.practice_id=$1 and rc.paid_cents=0 and rc.status_code in ('4','22')`, [practiceId]);
  const openPay = await d.query(`select count(*)::int n, coalesce(sum(amount_cents),0)::bigint c from payment_requests where practice_id=$1 and status='open' and created_at < now() - interval '14 days'`, [practiceId]);
  const reconnect = await d.query(`select institution_name from plaid_items where practice_id=$1 and status='reconnect'`, [practiceId]);
  const [stripeAcct] = await d.query(`select * from stripe_accounts where practice_id=$1`, [practiceId]);
  const collected = await d.query(`select coalesce(sum(amount_cents),0)::bigint c from payment_requests where practice_id=$1 and status='paid' and paid_at > now() - interval '7 days'`, [practiceId]);

  const items: Item[] = [];
  for (const r of reconnect) items.push({ tone: 'act', title: `Reconnect ${r.institution_name || 'a bank'}`, detail: 'The bank asked you to sign in again. Until you do, its balances and transactions are out of date.', href: '/hub/banks' });
  if (weeks.length && payrollRun && low.endCents < payrollRun) items.push({ tone: 'act', title: `Cash runs tight the week of ${fmt(low.weekStart)}`, detail: `The forecast drops to ${usd(low.endCents)}, less than one payroll (${usd(payrollRun)}). Hold large purchases or move reserve cash before then.`, href: '/hub' });
  if (denied[0].n) items.push({ tone: 'act', title: `${denied[0].n} denied claims worth ${usd(denied[0].c)}`, detail: 'Insurers paid nothing on these. Send the list to your biller to appeal the largest first.', href: '/hub/remittances' });
  if (unmatched[0].n) items.push({ tone: 'watch', title: `${unmatched[0].n} insurer deposits without a remittance`, detail: `${usd(unmatched[0].c)} arrived with no ERA file to explain it. Upload the 835 files from your clearinghouse so we can check each payment.`, href: '/hub/remittances' });
  if (openPay[0].n) items.push({ tone: 'watch', title: `${openPay[0].n} patient ${openPay[0].n === 1 ? "balance" : "balances"} unpaid after 14 days`, detail: `${usd(openPay[0].c)} outstanding. Send a fresh payment link.`, href: '/hub/payments' });
  if (!stripeAcct?.charges_enabled) items.push({ tone: 'watch', title: 'Finish payment setup', detail: 'Patients can pay by link or at the front desk once your Stripe account is verified.', href: '/hub/payments' });
  if (Number(collected[0].c) > 0) items.push({ tone: 'good', title: `${usd(collected[0].c)} collected from patients this week`, detail: 'Paid through payment links. It reaches your bank with your next Stripe payout.' });
  if (!accounts.length) items.unshift({ tone: 'act', title: 'Connect your first bank account', detail: 'CFO Hub needs at least one operating account to show cash and build your forecast.', href: '/hub/banks' });
  return { accounts, cash, weeks, low, items };
}

export const fmt = (iso: string) => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
