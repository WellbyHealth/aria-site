import { requireSession } from '@/lib/auth';
import { hubData, fmt } from '@/lib/weekly';
import { db } from '@/lib/db';
import { usd } from '@/lib/money';
import Forecast from '@/components/Forecast';

export const dynamic = 'force-dynamic';
export default async function Overview() {
  const s = await requireSession();
  const { accounts, cash, weeks, low, items } = await hubData(s.practiceId);
  const d = await db();
  const byLoc = await d.query(`select coalesce(l.name,'Unassigned') name, sum(ba.current_cents)::bigint c from bank_accounts ba left join locations l on l.id=ba.location_id where ba.practice_id=$1 and ba.type='depository' group by 1 order by 2 desc`, [s.practiceId]);
  const recent = await d.query(`select to_char(posted_on,'YYYY-MM-DD') d, description, payer, amount_cents, kind, matched_remittance_id from ledger_entries where practice_id=$1 and source='plaid' order by posted_on desc, amount_cents desc limit 12`, [s.practiceId]);
  const card = accounts.filter(a => a.type === 'credit').reduce((t, a) => t + Number(a.current_cents || 0), 0);
  const payroll = Math.max(0, ...weeks.map(w => w.payrollCents));
  return (<>
    <div className="top"><div><h1>Hello, {s.name}</h1><p>{s.practiceName} · balances as of {accounts[0]?.balance_at ? new Date(accounts[0].balance_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'not connected yet'}</p></div></div>
    <div className="grid g3" style={{ marginBottom: 16 }}>
      <div className="kpi" style={{ ['--t' as any]: 'var(--blue)' }}><span>Cash today</span><b>{usd(cash)}</b><small>{byLoc.map(l => `${l.name} ${usd(l.c)}`).join(' · ')}</small></div>
      <div className="kpi" style={{ ['--t' as any]: low && low.endCents < payroll ? 'var(--red)' : 'var(--mint)' }}><span>Lowest point, next 13 weeks</span><b>{low ? usd(low.endCents) : '–'}</b><small>{low ? `Week of ${fmt(low.weekStart)}` : 'Connect a bank to forecast'}</small></div>
      <div className="kpi" style={{ ['--t' as any]: 'var(--pink)' }}><span>Card balance</span><b>{usd(Math.abs(card))}</b><small>Across connected cards</small></div>
    </div>
    <section className="card" style={{ marginBottom: 16 }}><h2>13-week cash forecast</h2><Forecast weeks={weeks} reserve={payroll} />
        <p className="note">Built from your last 12 weeks of bank activity. Pink marks are payroll weeks. It updates every time your banks sync.</p></section>
    <div className="grid">
      <section className="card"><h2>This week</h2>
        <ul className="list">{items.map((it, i) => <li key={i} className={`item ${it.tone}`}><div><b>{it.title}</b><p>{it.detail}</p>{it.href && <a href={it.href}>Open →</a>}</div></li>)}</ul>
      </section>

    </div>
    <section className="card" style={{ marginTop: 16 }}><h2>Recent bank activity</h2>
      <table><thead><tr><th>Date</th><th>Description</th><th>Type</th><th className="n">Amount</th></tr></thead><tbody>
        {recent.map((r, i) => <tr key={i}><td>{fmt(r.d)}</td><td>{r.payer || r.description}</td><td>{r.kind === 'insurer_deposit' ? <span className={`chip ${r.matched_remittance_id ? 'ok' : 'warn'}`}>{r.matched_remittance_id ? 'Insurer, matched' : 'Insurer, no ERA'}</span> : <span className="chip">{label(r.kind)}</span>}</td><td className={`n ${Number(r.amount_cents) > 0 ? 'pos' : 'neg'}`}>{usd(r.amount_cents, { sign: true })}</td></tr>)}
      </tbody></table></section>
  </>);
}
const label = (k: string) => ({ processor_payout: 'Processor payout', payroll: 'Payroll', vendor: 'Vendor', transfer: 'Transfer', patient_payment: 'Patient', other: 'Other' } as Record<string, string>)[k] || k;
