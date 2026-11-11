import { view } from '@/lib/view';
import { KpiTile, Card, AlertList } from '@/components/ui';
import Forecast from '@/components/Forecast';
import { fmtDay } from '@/lib/metrics';
import { usd } from '@/lib/money';

export default async function Overview({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const { s, D, K, alerts, scope } = await view(searchParams);
  const payroll = Math.max(0, ...K.weeks.map(w => w.payrollCents));
  const nextPayroll = K.weeks.find(w => w.payrollCents > 0);
  return (<>
    <div className="head"><div><h1>Overview</h1><p>{s.practiceName} · {scope}</p></div></div>
    <div className="kpis">{K.kpis.map(k => <KpiTile key={k.key} k={k} />)}</div>
    <div className="g">
      <Card span={7} title="13-week cash forecast" foot={nextPayroll ? `Next payroll ${usd(nextPayroll.payrollCents)}, week of ${fmtDay(nextPayroll.weekStart)}` : undefined}>
        <Forecast weeks={K.weeks} floor={D.settings.cash_floor_cents} payroll={payroll} width={700} />
        <p className="foot" style={{ marginTop: 8 }}>Built from the last 12 weeks of bank activity, with payroll placed on its own schedule. Not affected by the date filter.</p>
      </Card>
      <Card span={5} title="Top alerts" foot={alerts.length > 5 ? <a href="/hub/risk">All {alerts.length} alerts</a> : `${alerts.length} open`}>
        <AlertList alerts={alerts} owner={D.owner} limit={5} />
      </Card>
    </div>
  </>);
}
