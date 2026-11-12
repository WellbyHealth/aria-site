// Shared Clinical Ledger components. Server-rendered SVG; colors come from CSS tokens so dark mode follows.
import type { ReactNode } from 'react';
import { fmtValue, short, type Kpi, type Unit } from '@/lib/metrics';
import { usd } from '@/lib/money';
import { age, type Alert } from '@/lib/alerts';

export function Money({ cents, sign }: { cents: number | null | undefined; sign?: boolean }) {
  if (cents == null) return <>–</>;
  const s = short(cents);
  return <span title={usd(cents)} className="num">{sign && cents > 0 ? '+' : ''}{s}</span>;
}

// Balance with dollars large and cents raised, the way bank apps show it.
export function Big({ cents, className = 'big' }: { cents: number | null | undefined; className?: string }) {
  if (cents == null) return <span className={className}>–</span>;
  const neg = cents < 0, a = Math.abs(Math.round(cents));
  const d = Math.floor(a / 100).toLocaleString('en-US'), c = String(a % 100).padStart(2, '0');
  return <span className={className} title={usd(cents)}>{neg ? '−' : ''}${d}<sup>.{c}</sup></span>;
}

// Soft area chart: one series, light fill, date labels only.
export function Area({ points, labels, height = 220, width = 720 }: { points: number[]; labels: string[]; height?: number; width?: number }) {
  if (points.length < 2) return <p className="note">Not enough history yet.</p>;
  const W = width, H = height, T = 10, B = 30;
  const lo = Math.min(...points), hi = Math.max(...points), pad = (hi - lo) * 0.15 || 1;
  const x = (i: number) => (i * W) / (points.length - 1);
  const y = (v: number) => T + (1 - (v - (lo - pad)) / (hi - lo + 2 * pad)) * (H - T - B);
  const line = points.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join('');
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Trend">
      <defs><linearGradient id="area-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--accent)" stopOpacity=".18" /><stop offset="1" stopColor="var(--accent)" stopOpacity="0" /></linearGradient></defs>
      <path d={`${line}L${W} ${H - B}L0 ${H - B}Z`} fill="url(#area-g)" />
      <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      {labels.map((l, i) => l && <text key={i} x={x(i)} y={H - 8} textAnchor={i === 0 ? 'start' : i === labels.length - 1 ? 'end' : 'middle'} fontSize="12" fill="var(--slate)">{l}</text>)}
    </svg>
  );
}

export function Spark({ values, w = 120, h = 28, target }: { values: number[]; w?: number; h?: number; target?: number }) {
  const vs = values.filter(v => Number.isFinite(v));
  if (vs.length < 2) return <svg className="spark" viewBox={`0 0 ${w} ${h}`} aria-hidden="true" />;
  const all = target != null ? [...vs, target] : vs;
  const lo = Math.min(...all), hi = Math.max(...all);
  const x = (i: number) => 1 + (i * (w - 2)) / (values.length - 1);
  const y = (v: number) => h - 3 - ((v - lo) / (hi - lo || 1)) * (h - 6);
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join('');
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      {target != null && <line x1="0" x2={w} y1={y(target)} y2={y(target)} stroke="var(--cmp)" strokeDasharray="3 3" strokeWidth="1" vectorEffect="non-scaling-stroke" />}
      <path d={d} fill="none" stroke="var(--accent)" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
      <circle cx={x(values.length - 1)} cy={y(values[values.length - 1])} r="2" fill="var(--accent)" />
    </svg>
  );
}

export function Delta({ value, prior, unit, betterUp }: { value: number | null; prior: number | null; unit: Unit; betterUp?: boolean }) {
  if (value == null || prior == null) return <span className="delta">–</span>;
  const diff = value - prior;
  if (Math.abs(diff) < 1e-9) return <span className="delta">→ no change</span>;
  const arrow = diff > 0 ? '▲' : '▼';
  const txt = unit === 'pct' ? `${(Math.abs(diff) * 100).toFixed(1)} pts` : unit === 'days' ? `${Math.abs(Math.round(diff))} days` : prior ? `${Math.abs((diff / Math.abs(prior)) * 100).toFixed(1)}%` : short(Math.abs(diff));
  return <span className="delta" title={`Prior period: ${fmtValue(prior, unit)}`} aria-label={`${diff > 0 ? 'up' : 'down'} ${txt} vs prior period`}>{arrow} {txt}</span>;
  void betterUp;
}

export function StatusPill({ status }: { status: Kpi['status'] }) {
  if (status === 'alert') return <span className="st alert"><Icon name="alert" size={11} />Off target</span>;
  if (status === 'watch') return <span className="st watch"><Icon name="watch" size={11} />Near limit</span>;
  return null;
}

export function KpiTile({ k, href }: { k: Kpi; href?: string }) {
  const unitSuffix = k.unit === 'days' && k.value != null ? <small>days</small> : null;
  const body = (<>
    <div className="top"><span className="lbl" title={k.hint}>{k.label}</span><StatusPill status={k.status} /></div>
    <div className="v" title={k.unit === 'usd' && k.value != null ? usd(k.value) : undefined}>{fmtValue(k.value, k.unit)}{unitSuffix}</div>
    <div className="meta"><Delta value={k.value} prior={k.prior} unit={k.unit} betterUp={k.betterUp} /><span>{k.target.text}</span></div>
    <Spark values={k.spark} target={k.target.op !== 'none' && k.key !== 'low_point' ? k.target.value : undefined} />
    {k.note && <span className="foot">{k.note}</span>}
  </>);
  const link = href ?? k.href;
  return link ? <a className="kpi" href={link} title={k.hint}>{body}</a> : <div className="kpi" title={k.hint}>{body}</div>;
}

export function Card({ title, foot, children, span = 12 }: { title: ReactNode; foot?: ReactNode; children: ReactNode; span?: 4 | 5 | 6 | 7 | 8 | 12 }) {
  return <section className={`card s${span}`}><header><h2>{title}</h2>{foot && <span className="foot">{foot}</span>}</header>{children}</section>;
}

// Horizontal bars for rankings.
export function Bars({ rows, unit = 'usd', tone }: { rows: { label: ReactNode; value: number; sub?: string; alert?: boolean }[]; unit?: Unit; tone?: 'cmp' }) {
  const max = Math.max(1, ...rows.map(r => Math.abs(r.value)));
  return <div className="bars">{rows.map((r, i) => (
    <div className="bar" key={i}><span>{r.label}{r.sub && <span className="foot"> · {r.sub}</span>}</span>
      <div className="track"><div className={`fill ${r.alert ? 'alert' : tone || ''}`} style={{ width: `${(Math.abs(r.value) / max) * 100}%` }} /></div>
      <span className="val">{unit === 'usd' ? <Money cents={r.value} /> : fmtValue(r.value, unit)}</span></div>))}</div>;
}

// Trend line: current series in accent, comparison dashed grey, optional threshold line.
export function LineChart({ labels, series, cmp, unit, threshold, thresholdLabel, height = 220, width }: { labels: string[]; series: (number | null)[]; cmp?: (number | null)[]; unit: Unit; threshold?: number; thresholdLabel?: string; height?: number; width?: number }) {
  const W = width ?? 760, H = height, L = 64, R = 12, T = 14, B = 28;
  const vals = [...series, ...(cmp || []), ...(threshold != null ? [threshold] : [])].filter((v): v is number => v != null && Number.isFinite(v));
  if (!vals.length) return <p className="note">No data for this period yet.</p>;
  const lo = Math.min(0, ...vals), hi = Math.max(...vals) * 1.1 || 1;
  const x = (i: number) => L + (i + 0.5) * ((W - L - R) / labels.length);
  const y = (v: number) => T + (1 - (v - lo) / (hi - lo || 1)) * (H - T - B);
  const path = (s: (number | null)[]) => s.map((v, i) => (v == null ? '' : `${i && s[i - 1] != null ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`)).join('');
  const ticks = [0, 1, 2, 3].map(i => lo + ((hi - lo) * i) / 3);
  const f = (v: number) => (unit === 'usd' ? short(v) : fmtValue(v, unit));
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Trend: latest ${f(series.at(-1) ?? 0)}`}>
      {ticks.map(t => <g key={t}><line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="var(--rule)" /><text x={L - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--slate)">{f(t)}</text></g>)}
      {threshold != null && <g><line x1={L} x2={W - R} y1={y(threshold)} y2={y(threshold)} stroke="var(--watch)" strokeDasharray="5 4" /><text x={W - R} y={y(threshold) - 5} textAnchor="end" fontSize="11" fill="var(--watch)">{thresholdLabel}</text></g>}
      {cmp && <path d={path(cmp)} fill="none" stroke="var(--cmp)" strokeWidth="1.8" strokeDasharray="5 4" />}
      <path d={path(series)} fill="none" stroke="var(--accent)" strokeWidth="2.2" />
      {series.map((v, i) => v != null && <circle key={i} cx={x(i)} cy={y(v)} r="2.6" fill="var(--accent)"><title>{`${labels[i]}: ${f(v)}`}</title></circle>)}
      {labels.map((l, i) => <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--slate)">{l}</text>)}
    </svg>
  );
}

export function AlertList({ alerts, owner, limit }: { alerts: Alert[]; owner: string; limit?: number }) {
  const list = limit ? alerts.slice(0, limit) : alerts;
  if (!list.length) return <p className="note"><Icon name="check" size={13} /> Nothing needs attention. Every tracked number is within its threshold.</p>;
  return <ul className="alerts">{list.map(a => (
    <li key={a.key}>
      <span className="ic" style={{ color: a.tone === 'alert' ? 'var(--alert)' : 'var(--watch)' }}><Icon name={a.tone === 'alert' ? 'alert' : 'watch'} size={16} /></span>
      <div><a href={a.href}><b>{a.title}</b></a><div className="sub">{a.detail} Owner: {owner}. Open {age(a.openedAt)}.</div></div>
      <div className="vt"><b>{a.value}</b>{a.threshold}</div>
    </li>))}</ul>;
}

export function NeedsSource({ system, examples, unlocks, art }: { system: string; examples: string; unlocks: string[]; art?: 'practice' | 'ledger' | 'contracts' | 'people' | 'risk' }) {
  return (
    <div className={`empty s12${art ? ' has-art' : ''}`}>
      {art && <img className="empty-art" src={`/art/spot-${art}.webp`} alt="" width={120} height={120} loading="lazy" />}
      <div>
      <h3><Icon name="plug" size={14} /> Not connected: {system}</h3>
      <p>These need data that isn’t connected yet: {examples}. Until then nothing is shown, rather than a zero that looks real.</p>
      <ul>{unlocks.map(u => <li key={u}>{u}</li>)}</ul>
      </div>
    </div>
  );
}

export { Icon } from './Icon';
import { Icon } from './Icon';
