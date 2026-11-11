export const toCents = (dollars: number) => Math.round(dollars * 100);
export function usd(cents: number | bigint | string | null | undefined, opts: { sign?: boolean } = {}) {
  const n = Number(cents ?? 0) / 100;
  const s = Math.abs(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: Math.abs(n) >= 1000 ? 0 : 2 });
  if (opts.sign) return (n < 0 ? '−' : '+') + s;
  return n < 0 ? '−' + s : s;
}
