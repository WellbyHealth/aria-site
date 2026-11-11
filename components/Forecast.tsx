import type { Week } from '@/lib/forecast';
import { usd } from '@/lib/money';
import { fmt } from '@/lib/weekly';

// Server-rendered SVG: projected end-of-week cash, payroll weeks marked, the lowest week called out.
export default function Forecast({ weeks, reserve }: { weeks: Week[]; reserve: number }) {
  if (!weeks.length) return null;
  const W = 960, H = 260, L = 76, R = 16, T = 20, B = 36;
  const vals = weeks.map(w => w.endCents);
  const lo = Math.min(0, reserve, ...vals), hi = Math.max(...vals, reserve) * 1.08;
  const x = (i: number) => L + (i + 0.5) * ((W - L - R) / weeks.length);
  const y = (v: number) => T + (1 - (v - lo) / (hi - lo || 1)) * (H - T - B);
  const low = weeks.reduce((m, w, i) => (w.endCents < weeks[m].endCents ? i : m), 0);
  const ticks = Array.from({ length: 4 }, (_, i) => lo + ((hi - lo) * i) / 3);
  const path = weeks.map((w, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(w.endCents).toFixed(1)}`).join('');
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`13-week cash forecast. Lowest point ${usd(weeks[low].endCents)} the week of ${fmt(weeks[low].weekStart)}.`}>
      {ticks.map(t => <g key={t}><line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#EEEDE8" /><text x={L - 8} y={y(t) + 4} textAnchor="end" fontSize="13" fill="#6B6A64">{usd(t)}</text></g>)}
      {reserve > 0 && <g><line x1={L} x2={W - R} y1={y(reserve)} y2={y(reserve)} stroke="#c9a227" strokeDasharray="4 4" /><text x={W - R} y={y(reserve) - 6} textAnchor="end" fontSize="13" fill="#7a5a00">One payroll ({usd(reserve)})</text></g>}
      {weeks.map((w, i) => w.payrollCents > 0 && <rect key={'p' + i} x={x(i) - 10} y={H - B + 6} width="20" height="6" rx="3" fill="#f6dcec" />)}
      <path d={path} fill="none" stroke="#1f4f8a" strokeWidth="2.5" />
      {weeks.map((w, i) => <circle key={i} cx={x(i)} cy={y(w.endCents)} r={i === low ? 5 : 3} fill={i === low ? '#c0262d' : '#1f4f8a'}><title>{`Week of ${fmt(w.weekStart)}: ${usd(w.endCents)}`}</title></circle>)}
      {weeks.map((w, i) => (i % 2 === 0 || i === low) && <text key={'t' + i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="13" fill={i === low ? '#000' : '#6B6A64'} fontWeight={i === low ? 600 : 400}>{fmt(w.weekStart)}</text>)}
      <text x={x(low)} y={y(weeks[low].endCents) - 12} textAnchor="middle" fontSize="14" fontWeight="600" fill="#000">{usd(weeks[low].endCents)}</text>
    </svg>
  );
}
