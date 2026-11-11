import type { Week } from '@/lib/forecast';
import { short, fmtDay } from '@/lib/metrics';
import { usd } from '@/lib/money';

// 13-week cash line: projected week-end balance, payroll weeks marked, the floor dashed, the low point labelled.
export default function Forecast({ weeks, floor, payroll, width = 1100 }: { weeks: Week[]; floor: number; payroll?: number; width?: number }) {
  if (!weeks.length) return <p className="note">Connect a bank account to build the forecast.</p>;
  const W = width, H = width < 900 ? 300 : 260, L = 64, R = 16, T = 22, B = 34;
  const vals = weeks.map(w => w.endCents);
  const lo = Math.min(0, floor, ...vals), hi = Math.max(...vals, floor, payroll || 0) * 1.1;
  const x = (i: number) => L + (i + 0.5) * ((W - L - R) / weeks.length);
  const y = (v: number) => T + (1 - (v - lo) / (hi - lo || 1)) * (H - T - B);
  const low = weeks.reduce((m, w, i) => (w.endCents < weeks[m].endCents ? i : m), 0);
  const ticks = [0, 1, 2, 3].map(i => lo + ((hi - lo) * i) / 3);
  const path = weeks.map((w, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(w.endCents).toFixed(1)}`).join('');
  const breach = floor > 0 && weeks[low].endCents < floor;
  return (<>
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`13-week cash forecast. Lowest point ${usd(weeks[low].endCents)} the week of ${fmtDay(weeks[low].weekStart)}.`}>
      {ticks.map(t => <g key={t}><line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="var(--rule)" /><text x={L - 8} y={y(t) + 4} textAnchor="end" fontSize="12" fill="var(--slate)">{short(t)}</text></g>)}
      {floor > 0 && <g><line x1={L} x2={W - R} y1={y(floor)} y2={y(floor)} stroke="var(--watch)" strokeDasharray="5 4" /><text x={W - R} y={y(floor) - 6} textAnchor="end" fontSize="12" fill="var(--watch)">Cash floor {short(floor)}</text></g>}
      {weeks.map((w, i) => w.payrollCents > 0 && <rect key={'p' + i} x={x(i) - 9} y={H - B + 4} width="18" height="4" rx="2" fill="var(--cmp)"><title>{`Payroll ${usd(w.payrollCents)}`}</title></rect>)}
      <path d={path} fill="none" stroke="var(--accent)" strokeWidth="2.4" />
      {weeks.map((w, i) => <circle key={i} cx={x(i)} cy={y(w.endCents)} r={i === low ? 4.5 : 2.8} fill={i === low && breach ? 'var(--alert)' : 'var(--accent)'}><title>{`Week of ${fmtDay(w.weekStart)}: ${usd(w.endCents)} (in ${usd(w.inCents)}, out ${usd(w.outCents + w.payrollCents)})`}</title></circle>)}
      {weeks.map((w, i) => (i % 2 === 0 || i === low) && <text key={'t' + i} x={x(i)} y={H - 10} textAnchor="middle" fontSize="12" fill={i === low ? 'var(--ink)' : 'var(--slate)'} fontWeight={i === low ? 600 : 400}>{fmtDay(w.weekStart)}</text>)}
      <text x={x(low)} y={y(weeks[low].endCents) - 10} textAnchor="middle" fontSize="13" fontWeight="600" fill="var(--ink)">Low {short(weeks[low].endCents)}</text>
    </svg>
    <div className="legend"><span><i />Projected week-end cash</span>{floor > 0 && <span><i className="flo" />Cash floor</span>}<span><i className="cmp" style={{ borderTopStyle: 'solid', borderTopWidth: 4 }} />Payroll week</span></div>
  </>);
}
