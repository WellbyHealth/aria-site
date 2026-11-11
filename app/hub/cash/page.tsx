import { revalidatePath } from 'next/cache';
import { view } from '@/lib/view';
import { requireSession } from '@/lib/auth';
import { db, audit } from '@/lib/db';
import { toCents } from '@/lib/money';
import { KpiTile, Card, Money, NeedsSource } from '@/components/ui';
import Forecast from '@/components/Forecast';
import { depositMatch, fmtDay, fmtValue } from '@/lib/metrics';
import { usd } from '@/lib/money';

async function saveFloor(form: FormData) {
  'use server';
  const s = await requireSession();
  if (s.role === 'viewer') return;
  const floor = toCents(Math.max(0, Number(String(form.get('floor') || '0').replace(/[^0-9.]/g, '')) || 0));
  const days = Math.max(0, Math.min(365, Number(form.get('days')) || 30));
  const d = await db();
  await d.query(`insert into practice_settings (practice_id, cash_floor_cents, days_cash_min) values ($1,$2,$3) on conflict (practice_id) do update set cash_floor_cents=$2, days_cash_min=$3, updated_at=now()`, [s.practiceId, floor, days]);
  await audit(s.practiceId, s.userId, 'settings.cash_floor', { floor, days });
  revalidatePath('/hub/cash');
}

export default async function Cash({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const { s, D, K, kpi, scope } = await view(searchParams);
  const match = depositMatch(D);
  const payroll = Math.max(0, ...K.weeks.map(w => w.payrollCents));
  const card = D.accounts.filter((a: any) => a.type === 'credit').reduce((t: number, a: any) => t + Math.abs(Number(a.current_cents || 0)), 0);
  return (<>
    <div className="head"><div><h1>Cash and forecast</h1><p>Can we make payroll and fund the plan this quarter? · {scope}</p></div></div>
    <div className="kpis">
      <KpiTile k={kpi('cash')} href="" />
      <KpiTile k={kpi('days_cash')} href="" />
      <KpiTile k={kpi('low_point')} href="" />
      <KpiTile k={{ key: 'payroll', label: 'Typical payroll run', unit: 'usd', value: payroll || null, prior: null, target: { op: 'none', value: 0, text: K.weeks.find(w => w.payrollCents) ? `Next: week of ${fmtDay(K.weeks.find(w => w.payrollCents)!.weekStart)}` : 'No payroll found' }, status: 'none', spark: [], hint: 'Average of the last four payroll runs found in bank activity.' }} />
      <KpiTile k={{ key: 'card', label: 'Card balance', unit: 'usd', value: card, prior: null, target: { op: 'none', value: 0, text: 'Across connected cards' }, status: 'none', spark: [], hint: 'Amount owed on connected credit cards.' }} />
    </div>
    <div className="g">
      <Card span={12} title="13-week cash forecast" foot="Expected collections and spending from the last 12 weeks, payroll on its own schedule">
        <Forecast weeks={K.weeks} floor={D.settings.cash_floor_cents} payroll={payroll} />
      </Card>
      <Card span={7} title="Where every deposit came from" foot={`Three-way match · ${scope}`}>
        <div className="tw"><table><thead><tr><th>Source</th><th className="n">Amount</th><th className="n">Matched</th><th className="n">Items</th></tr></thead><tbody>
          {match.map(m => <tr key={m.source}><td>{m.source}</td><td className="n"><Money cents={m.total} /></td><td className={`n ${m.total && m.matched < m.total && m.source.startsWith('Other') === false ? 'warn' : ''}`}>{m.source.startsWith('Other') ? '–' : fmtValue(m.total ? m.matched / m.total : null, 'pct')}</td><td className="n">{m.source.startsWith('Other') ? m.n : `${m.m} of ${m.n}`}</td></tr>)}
        </tbody></table></div>
        <p className="foot" style={{ marginTop: 8 }}>Insurer deposits are matched to 835 files by amount and trace number. Stripe payouts are matched by amount and arrival date.</p>
      </Card>
      <Card span={5} title="Cash floor" foot="Drives the forecast line and alerts">
        <form action={saveFloor} className="form">
          <div className="f2">
            <label>Minimum balance (USD)<input name="floor" inputMode="decimal" defaultValue={(D.settings.cash_floor_cents / 100).toFixed(0)} disabled={s.role === 'viewer'} /></label>
            <label>Days cash target<input name="days" type="number" min={0} max={365} defaultValue={D.settings.days_cash_min} disabled={s.role === 'viewer'} /></label>
          </div>
          <button className="btn" disabled={s.role === 'viewer'}>Save</button>
        </form>
      </Card>
      <Card span={12} title="Accounts" foot="From Plaid">
        <div className="tw"><table><thead><tr><th>Account</th><th>Bank</th><th>Site</th><th>Type</th><th className="n">Balance</th></tr></thead><tbody>
          {D.accounts.map((a: any) => <tr key={a.id}><td>{a.name} ···{a.mask}</td><td>{a.institution_name}</td><td>{a.location_name || '–'}</td><td>{a.subtype}</td><td className="n" title={usd(a.current_cents)}>{usd(a.current_cents)}</td></tr>)}
          {!D.accounts.length && <tr><td colSpan={5} className="note">No accounts yet. <a href="/hub/banks">Connect a bank</a>.</td></tr>}
        </tbody></table></div>
      </Card>
      <NeedsSource art="ledger" system="General ledger and lender data" examples="QuickBooks or similar, plus your loan agreements" unlocks={['Line of credit drawn vs available', 'Debt covenant tests with headroom', 'Accounts payable aging and large upcoming bills', 'Capex tracker vs budget', 'Partner distributions, planned vs paid', 'Rolling full-year forecast vs budget']} />
    </div>
  </>);
}
