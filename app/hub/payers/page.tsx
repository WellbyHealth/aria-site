import { view } from '@/lib/view';
import { KpiTile, Card, Bars, Spark, Money, Delta, NeedsSource } from '@/components/ui';
import { payerTable, fmtValue } from '@/lib/metrics';

export default async function Payers({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const { D, kpi, scope } = await view(searchParams);
  const rows = payerTable(D);
  const S = D.settings;
  const top = rows[0];
  return (<>
    <div className="head"><div><h1>Payers</h1><p>Who pays, how much and how fast · {scope}</p></div></div>
    <div className="kpis">
      <KpiTile k={kpi('insurer')} href="" />
      <KpiTile k={kpi('days_to_pay')} href="" />
      <KpiTile k={kpi('denial_rate')} />
      <KpiTile k={{ key: 'top_payer', label: 'Largest payer share', unit: 'pct', value: top?.share ?? null, prior: null, target: { op: 'none', value: 0, text: top?.name || '' }, status: 'none', spark: top?.spark || [], hint: 'Share of insurer collections from your largest payer. High concentration means more contract risk.' }} />
      <KpiTile k={kpi('unmatched')} />
    </div>
    <div className="g">
      <Card span={6} title="Payer mix" foot="Share of insurer collections">
        <Bars rows={rows.map(p => ({ label: p.name, value: p.share, sub: undefined }))} unit="pct" />
      </Card>
      <Card span={6} title="Days to pay by payer" foot={`Median, claim received to paid · threshold ${S.days_to_pay_max} days`}>
        <Bars rows={rows.filter(p => p.daysToPay != null).sort((a, b) => (b.daysToPay ?? 0) - (a.daysToPay ?? 0)).map(p => ({ label: p.name, value: p.daysToPay!, alert: (p.daysToPay ?? 0) > S.days_to_pay_max }))} unit="days" />
      </Card>
      <Card span={12} title="Payer scorecard" foot="Collections from bank deposits; claims, denials and days from 835 files">
        <div className="tw"><table><thead><tr><th>Payer</th><th className="n">Collected</th><th className="n">vs prior</th><th className="n">Share</th><th className="n">Claims</th><th className="n">Denial rate</th><th className="n">Days to pay</th><th className="n">Paid % of billed</th><th>12 months</th></tr></thead><tbody>
          {rows.map(p => <tr key={p.name}>
            <td><a href={`/hub/revenue?payer=${encodeURIComponent(p.name)}`}>{p.name}</a></td>
            <td className="n"><Money cents={p.collected} /></td>
            <td className="n"><Delta value={p.collected} prior={p.prior} unit="usd" /></td>
            <td className="n">{fmtValue(p.share, 'pct')}</td>
            <td className="n">{p.claims.toLocaleString()}</td>
            <td className={`n ${(p.denialRate ?? 0) > S.denial_rate_max_bps / 10000 ? 'bad' : ''}`}>{fmtValue(p.denialRate, 'pct')}</td>
            <td className={`n ${(p.daysToPay ?? 0) > S.days_to_pay_max ? 'warn' : ''}`}>{fmtValue(p.daysToPay, 'days')}</td>
            <td className="n">{fmtValue(p.paidPct, 'pct')}</td>
            <td><Spark values={p.spark} w={96} h={22} /></td></tr>)}
        </tbody></table></div>
      </Card>
      <NeedsSource system="Payer contracts and fee schedules" examples="upload each payer's fee schedule, or connect your practice management system" unlocks={['Contract variance: expected allowed vs actually paid, by CPT', 'Payers running more than 2% below contract', 'Reimbursement as a % of the Medicare fee schedule', 'Top 20 CPT codes: volume, allowed and paid', 'Value-based revenue: shared savings, quality bonuses, MIPS', 'Contract renewal and termination-notice calendar']} />
    </div>
  </>);
}
