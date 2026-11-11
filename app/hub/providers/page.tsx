import { view } from '@/lib/view';
import { Card, Bars, Spark, Money, Delta, NeedsSource, KpiTile } from '@/components/ui';
import { providerTable, fmtValue } from '@/lib/metrics';

export default async function Providers({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const { D, scope } = await view(searchParams);
  const rows = providerTable(D);
  const total = rows.reduce((s, r) => s + r.paid, 0);
  return (<>
    <div className="head"><div><h1>Providers</h1><p>Collections by rendering provider, from 835 remittances · {scope}</p></div></div>
    {rows.length ? <>
      <div className="kpis">
        <KpiTile k={{ key: 'prov_total', label: 'Insurer payments, all providers', unit: 'usd', value: total, prior: rows.reduce((s, r) => s + r.prior, 0), betterUp: true, target: { op: 'none', value: 0, text: 'vs prior period' }, status: 'none', spark: rows[0].spark.map((_, i) => rows.reduce((s, r) => s + r.spark[i], 0)), hint: 'Insurer payments on claims that name a rendering provider.' }} />
        <KpiTile k={{ key: 'prov_n', label: 'Providers billing', unit: 'count', value: rows.filter(r => r.claims).length, prior: null, target: { op: 'none', value: 0, text: 'with claims in period' }, status: 'none', spark: [], hint: 'Rendering providers on remittances in the period.' }} />
      </div>
      <div className="g">
        <Card span={5} title="Share of insurer payments"><Bars rows={rows.map(r => ({ label: r.name, value: r.paid }))} /></Card>
        <Card span={7} title="Provider scorecard" foot="Insurer payments only; patient payments are not yet split by provider">
          <div className="tw"><table><thead><tr><th>Provider</th><th className="n">Paid</th><th className="n">vs prior</th><th className="n">Claims</th><th className="n">Avg per paid claim</th><th className="n">Denial rate</th><th>12 months</th></tr></thead><tbody>
            {rows.map(r => <tr key={r.name}><td>{r.name}</td><td className="n"><Money cents={r.paid} /></td><td className="n"><Delta value={r.paid} prior={r.prior} unit="usd" /></td><td className="n">{r.claims}</td><td className="n"><Money cents={r.perClaim} /></td>
              <td className={`n ${(r.denialRate ?? 0) > D.settings.denial_rate_max_bps / 10000 ? 'bad' : ''}`}>{fmtValue(r.denialRate, 'pct')}</td><td><Spark values={r.spark} w={96} h={22} /></td></tr>)}
          </tbody></table></div>
        </Card>
      </div>
    </> : <p className="note" style={{ marginBottom: 16 }}>No remittances with a rendering provider yet. Upload 835 files that include NM1*82 provider loops.</p>}
    <div className="g" style={{ marginTop: 24 }}>
      <NeedsSource system="Practice management system and payroll" examples="EHR scheduling and coding, plus ADP, Gusto or similar for compensation" unlocks={['wRVUs per clinical FTE vs specialty benchmark', 'Visits per day and per session', 'Compensation per wRVU and as % of collections', 'Schedule utilization', 'E/M level distribution vs peers', 'Panel size and new-patient share', 'Encounters closed within 72 hours', 'wRVU percentile vs compensation percentile scatter']} />
    </div>
  </>);
}
