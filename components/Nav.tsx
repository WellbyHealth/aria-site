'use client';
// Sidebar: grouped sections with sub-pages. The current section opens by default.
import { usePathname, useSearchParams } from 'next/navigation';
import { Icon } from './Icon';

const GROUPS = [
  { label: 'Overview', icon: 'overview', href: '/hub' },
  { label: 'Money in', icon: 'revenue', items: [['/hub/revenue', 'Revenue cycle'], ['/hub/payers', 'Payers'], ['/hub/providers', 'Providers']] },
  { label: 'Money out', icon: 'costs', items: [['/hub/costs', 'Costs and margin']] },
  { label: 'Cash', icon: 'cash', items: [['/hub/cash', 'Cash and forecast']] },
  { label: 'Risk', icon: 'risk', items: [['/hub/risk', 'Operations and risk']] },
  { label: 'Data sources', icon: 'data', items: [['/hub/banks', 'Banks and cards'], ['/hub/payments', 'Patient payments'], ['/hub/remittances', 'Insurer files (835)']] },
] as const;
const KEEP = ['range', 'site', 'payer'];

export default function Nav() {
  const p = usePathname();
  const sp = useSearchParams();
  const q = new URLSearchParams();
  for (const k of KEEP) { const v = sp.get(k); if (v) q.set(k, v); }
  const qs = q.toString() ? '?' + q.toString() : '';
  return <nav aria-label="CFO Hub">{GROUPS.map(g => {
    if (!('items' in g)) return <a key={g.label} className="nav" href={g.href + qs} aria-current={p === g.href ? 'page' : undefined}><Icon name={g.icon} />{g.label}</a>;
    const open = g.items.some(([h]) => p.startsWith(h)) || g.label !== 'Data sources';
    return (
      <details key={g.label} className="navgroup" open={open}>
        <summary><Icon name={g.icon} />{g.label}<span className="chev"><Icon name="chev" size={14} /></span></summary>
        <div>{g.items.map(([h, t]) => <a key={h} className="nav sub" href={h + (g.label === 'Data sources' ? '' : qs)} aria-current={p.startsWith(h) ? 'page' : undefined}>{t}</a>)}</div>
      </details>
    );
  })}</nav>;
}
