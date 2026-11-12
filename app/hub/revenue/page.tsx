import { view } from '@/lib/view';
import { KpiTile, Card, Bars, LineChart, NeedsSource, Money } from '@/components/ui';
import { revenueCycle, fmtValue, fmtDay, CARC } from '@/lib/metrics';

export default async function Revenue({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const { D, kpi, scope } = await view(searchParams);
  const r = revenueCycle(D);
  const max = D.settings.denial_rate_max_bps / 10000;
  const reasonOf = (c: (typeof r.recent)[number]) => { const a = c.adj.find(x => x.reason !== '45') || c.adj[0]; return a ? `${a.group}-${a.reason} ${CARC[a.reason] || ''}` : '–'; };
  return (<>
    <div className="head"><div><h1>Insurer payments</h1><p>From charge to cash, using your 835 remittances · {scope}</p></div></div>
    <div className="kpis">
      <KpiTile k={kpi('denial_rate')} href="" />
      <KpiTile k={{ key: 'paid_pct', label: 'Paid % of billed', unit: 'pct', value: r.paidPct, prior: null, target: { op: 'none', value: 0, text: `${r.claims.toLocaleString()} claims` }, status: 'none', spark: [], hint: 'Insurer payments ÷ billed charges on the same claims.' }} />
      <KpiTile k={{ key: 'denied_usd', label: 'Denied charges', unit: 'usd', value: r.deniedBilled, prior: null, target: { op: 'none', value: 0, text: `${r.denied} claims` }, status: 'none', spark: [], hint: 'Billed amount on claims the insurer paid nothing on.' }} />
      <KpiTile k={{ key: 'pr_share', label: 'Patient share of allowed', unit: 'pct', value: r.prShare, prior: null, target: { op: 'none', value: 0, text: 'Deductibles, copays, coinsurance' }, status: 'none', spark: [], hint: 'Patient responsibility ÷ allowed amount. Rising means more to collect at the front desk.' }} />
      <KpiTile k={kpi('days_to_pay')} href="/hub/payers" />
    </div>
    <div className="g">
      <Card span={6} title="Charges to cash" foot="Billed → allowed → paid">
        <Bars rows={[
          { label: 'Billed charges', value: r.billed },
          { label: 'Contractual adjustment', value: r.contractual, sub: 'CO-45' },
          { label: 'Denied', value: r.deniedBilled, alert: r.deniedBilled > 0 },
          { label: 'Allowed', value: r.allowed },
          { label: 'Patient responsibility', value: r.pr },
          { label: 'Paid by insurers', value: r.paid },
        ]} />
      </Card>
      <Card span={6} title="Denials by reason" foot="Largest dollars first">
        {r.pareto.length ? <Bars rows={r.pareto.map(p => ({ label: <><b>{p.code}</b> {p.label}</>, value: p.cents, sub: `${p.n} ${p.n === 1 ? 'claim' : 'claims'}` }))} /> : <p className="note">No denials in this period.</p>}
      </Card>
      <Card span={12} title="Denial rate by month" foot="Last 12 complete months, all filters applied except date">
        <LineChart labels={r.trend.map(t => t.label)} series={r.trend.map(t => t.v)} unit="pct" width={1120} height={240} threshold={max} thresholdLabel={`Threshold ${fmtValue(max, 'pct')}`} />
      </Card>
      <Card span={12} title="Largest denied claims" foot="Work these first, by dollars and deadline">
        <div className="tw"><table><thead><tr><th>Paid on</th><th>Claim</th><th>Payer</th><th>Provider</th><th>Reason</th><th className="n">Billed</th></tr></thead><tbody>
          {r.recent.map(c => <tr key={c.ref + c.paid}><td>{fmtDay(c.paid)}</td><td className="num">{c.ref}</td><td>{c.payer}</td><td>{c.provider || '–'}</td><td>{reasonOf(c)}</td><td className="n"><Money cents={c.billed} /></td></tr>)}
          {!r.recent.length && <tr><td colSpan={6} className="note">No denied claims in this period.</td></tr>}
        </tbody></table></div>
      </Card>
      <NeedsSource art="practice" system="Practice management system" examples="athenahealth, eClinicalWorks, ModMed or similar" unlocks={['A/R aging by payer (0–30 … 120+)', 'Days in A/R and net collection rate', 'Charge lag', 'Clean claim rate and first-pass resolution', 'Point-of-service collections', 'Credit balances and write-offs by type']} />
    </div>
  </>);
}
