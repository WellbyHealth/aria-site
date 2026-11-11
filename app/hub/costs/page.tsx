import { view } from '@/lib/view';
import { KpiTile, Card, Spark, Money, Delta, LineChart, NeedsSource } from '@/components/ui';
import { costTable, fmtValue } from '@/lib/metrics';

export default async function Costs({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const { D, kpi, scope } = await view(searchParams);
  const c = costTable(D);
  const row = (n: string) => c.rows.find(r => r.name === n);
  const pctKpi = (key: string, label: string, name: string, hint: string) => {
    const r = row(name);
    return { key, label, unit: 'pct' as const, value: r?.pctOfCollections ?? null, prior: null, target: { op: 'none' as const, value: 0, text: 'of collections' }, status: 'none' as const, spark: [], hint, note: 'From bank activity' };
  };
  return (<>
    <div className="head"><div><h1>Costs and margin</h1><p>Spending by category, from bank and card activity · {scope}</p></div></div>
    <div className="kpis">
      <KpiTile k={{ key: 'spend', label: 'Operating spend', unit: 'usd', value: c.total, prior: c.prior, target: { op: 'none', value: 0, text: 'vs prior period' }, status: 'none', spark: c.trend.map(t => t.spend), hint: 'Money leaving bank and card accounts, excluding transfers between your own accounts and partner distributions.', note: 'From bank activity' }} />
      <KpiTile k={kpi('margin')} href="" />
      <KpiTile k={kpi('staff_cost')} href="" />
      <KpiTile k={pctKpi('occupancy', 'Occupancy % of collections', 'Rent and occupancy', 'Rent and facility costs ÷ collections.')} />
      <KpiTile k={pctKpi('supplies', 'Supplies % of collections', 'Medical supplies', 'Medical supply spend ÷ collections.')} />
    </div>
    <div className="g">
      <Card span={12} title="Collections vs spending by month" foot="Cash basis. Collections solid, spending dashed">
        <LineChart labels={c.trend.map(t => t.label)} series={c.trend.map(t => t.collections)} cmp={c.trend.map(t => t.spend)} unit="usd" width={1120} height={240} />
        <div className="legend"><span><i />Collections</span><span><i className="cmp" />Spending</span></div>
      </Card>
      <Card span={12} title="Spending by category" foot="Categories come from transaction descriptions; correct them in your ledger once it is connected">
        <div className="tw"><table><thead><tr><th>Category</th><th className="n">This period</th><th className="n">Prior period</th><th className="n">Change</th><th className="n">% of collections</th><th>12 months</th></tr></thead><tbody>
          {c.rows.map(r => <tr key={r.name}><td>{r.name}</td><td className="n"><Money cents={r.amount} /></td><td className="n"><Money cents={r.prior} /></td><td className="n"><Delta value={r.amount} prior={r.prior} unit="usd" /></td><td className="n">{fmtValue(r.pctOfCollections, 'pct')}</td><td><Spark values={r.spark} w={96} h={22} /></td></tr>)}
          <tr><td><b>Total</b></td><td className="n"><b><Money cents={c.total} /></b></td><td className="n"><Money cents={c.prior} /></td><td className="n"><Delta value={c.total} prior={c.prior} unit="usd" /></td><td className="n">{fmtValue(c.collections ? c.total / c.collections : null, 'pct')}</td><td /></tr>
          {c.distributions && <tr><td>Partner distributions <span className="foot">not an operating cost</span></td><td className="n"><Money cents={c.distributions.amount} /></td><td className="n"><Money cents={c.distributions.prior} /></td><td className="n"><Delta value={c.distributions.amount} prior={c.distributions.prior} unit="usd" /></td><td className="n">{fmtValue(c.distributions.pctOfCollections, 'pct')}</td><td><Spark values={c.distributions.spark} w={96} h={22} /></td></tr>}
        </tbody></table></div>
      </Card>
      <NeedsSource system="General ledger" examples="QuickBooks, Sage Intacct, NetSuite or similar" unlocks={['P&L vs budget and prior year, by site and service line', 'Accrual operating margin', 'Cost per visit and per wRVU (with the PM system)', 'Overhead ratio excluding provider comp', 'Ancillary contribution: lab, imaging, infusion', 'Labor detail: FTEs, overtime, agency spend (with payroll)']} />
    </div>
  </>);
}
