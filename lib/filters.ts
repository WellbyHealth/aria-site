// Global filters shared by every view: date range, site and payer. Read from the URL so views stay linkable.
export type RangeKey = '30d' | '90d' | 'mtd' | 'qtd' | 'ytd' | '12m';
export interface Filters { range: RangeKey; site: string | null; payer: string | null; from: string; to: string; pFrom: string; pTo: string; label: string; priorLabel: string }

export const RANGES: [RangeKey, string][] = [['30d', 'Last 30 days'], ['90d', 'Last 90 days'], ['mtd', 'Month to date'], ['qtd', 'Quarter to date'], ['ytd', 'Year to date'], ['12m', 'Last 12 months']];
const DAY = 864e5;
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);

export function parseFilters(sp: Record<string, string | string[] | undefined>, today = new Date().toISOString().slice(0, 10)): Filters {
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : (sp[k] as string | undefined)) || null;
  const range = (RANGES.find(r => r[0] === one('range'))?.[0] ?? '30d') as RangeKey;
  const t = Date.parse(today);
  const d = new Date(t);
  let from: number;
  if (range === '30d') from = t - 29 * DAY;
  else if (range === '90d') from = t - 89 * DAY;
  else if (range === '12m') from = t - 364 * DAY;
  else if (range === 'mtd') from = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
  else if (range === 'qtd') from = Date.UTC(d.getUTCFullYear(), Math.floor(d.getUTCMonth() / 3) * 3, 1);
  else from = Date.UTC(d.getUTCFullYear(), 0, 1);
  const len = t - from + DAY;
  const site = one('site'); const payer = one('payer');
  return {
    range, site: site && site !== 'all' ? site : null, payer: payer && payer !== 'all' ? payer : null,
    from: iso(from), to: today, pFrom: iso(from - len), pTo: iso(from - DAY),
    label: RANGES.find(r => r[0] === range)![1], priorLabel: 'prior period',
  };
}

export function query(f: Filters, extra: Record<string, string> = {}) {
  const q = new URLSearchParams();
  if (f.range !== '30d') q.set('range', f.range);
  if (f.site) q.set('site', f.site);
  if (f.payer) q.set('payer', f.payer);
  for (const [k, v] of Object.entries(extra)) q.set(k, v);
  const s = q.toString();
  return s ? '?' + s : '';
}
