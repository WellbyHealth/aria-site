// 13-week cash forecast from the last 12 weeks of bank activity, with payroll placed on its own cadence.
export interface Flow { posted_on: string; amount_cents: number; kind: string }
export interface Week { weekStart: string; inCents: number; outCents: number; payrollCents: number; endCents: number }

const DAY = 864e5;
const mondayOf = (t: number) => { const d = new Date(t); const dow = (d.getUTCDay() + 6) % 7; return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - dow); };
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);

export function forecast(startCents: number, flows: Flow[], today: string, weeks = 13): Week[] {
  const now = Date.parse(today);
  const since = now - 84 * DAY;
  const recent = flows.filter(f => { const t = Date.parse(f.posted_on); return t >= since && t <= now && f.kind !== 'transfer'; });
  const inflow = recent.filter(f => f.amount_cents > 0).reduce((s, f) => s + Number(f.amount_cents), 0) / 12;
  const outflow = recent.filter(f => f.amount_cents < 0 && f.kind !== 'payroll').reduce((s, f) => s - Number(f.amount_cents), 0) / 12;
  const payrolls = flows.filter(f => f.kind === 'payroll' && f.amount_cents < 0).map(f => ({ t: Date.parse(f.posted_on), c: -Number(f.amount_cents) })).sort((a, b) => a.t - b.t);
  // Group payroll debits on the same day (taxes and net pay often post separately).
  const runs: { t: number; c: number }[] = [];
  for (const p of payrolls) { const last = runs.at(-1); if (last && p.t - last.t <= 2 * DAY) last.c += p.c; else runs.push({ ...p }); }
  let cadence = 14 * DAY, runCents = 0, next = Infinity;
  if (runs.length) {
    const lastRuns = runs.slice(-4);
    runCents = lastRuns.reduce((s, r) => s + r.c, 0) / lastRuns.length;
    if (lastRuns.length >= 2) { const gaps = lastRuns.slice(1).map((r, i) => r.t - lastRuns.at(i)!.t).sort((a, b) => a - b); cadence = gaps.at(Math.floor(gaps.length / 2))!; }
    next = runs.at(-1)!.t + cadence;
    while (next <= now) next += cadence;
  }
  const out: Week[] = [];
  let bal = startCents, ws = mondayOf(now) + 7 * DAY;
  for (let i = 0; i < weeks; i++, ws += 7 * DAY) {
    let pay = 0;
    while (next < ws + 7 * DAY) { if (next >= ws) pay += runCents; next += cadence; }
    bal += inflow - outflow - pay;
    out.push({ weekStart: iso(ws), inCents: Math.round(inflow), outCents: Math.round(outflow), payrollCents: Math.round(pay), endCents: Math.round(bal) });
  }
  return out;
}
