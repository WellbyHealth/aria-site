'use client';
// Sidebar: a three-way switch (Banking, Payments, CFO) and the pages in the chosen part.
import { usePathname, useSearchParams } from 'next/navigation';
import { Icon } from './Icon';

type Item = { href: string; label: string; icon: string; sub?: boolean };
const SECTIONS: { key: string; label: string; items: Item[] }[] = [
  { key: 'banking', label: 'Banking', items: [
    { href: '/hub', label: 'Home', icon: 'home' },
    { href: '/hub/accounts', label: 'Accounts', icon: 'bank' },
    { href: '/hub/cards', label: 'Cards', icon: 'card' },
    { href: '/hub/capital', label: 'Capital', icon: 'capital' },
    { href: '/hub/bills', label: 'Bill pay', icon: 'bill' },
    { href: '/hub/banks', label: 'Linked banks', icon: 'plug' },
  ] },
  { key: 'payments', label: 'Payments', items: [
    { href: '/hub/revenue', label: 'Insurer payments', icon: 'revenue' },
    { href: '/hub/payers', label: 'Payers', icon: 'payers', sub: true },
    { href: '/hub/providers', label: 'Providers', icon: 'providers', sub: true },
    { href: '/hub/payments', label: 'Patient payments', icon: 'card' },
    { href: '/hub/remittances', label: 'Insurer files (835)', icon: 'file' },
  ] },
  { key: 'insights', label: 'Insights', items: [
    { href: '/hub/cash', label: 'Cash and forecast', icon: 'cash' },
    { href: '/hub/costs', label: 'Costs and margin', icon: 'costs' },
    { href: '/hub/risk', label: 'Alerts and risk', icon: 'risk' },
  ] },
];
const KEEP = ['range', 'site', 'payer'];
const active = (p: string, h: string) => (h === '/hub' ? p === '/hub' : p.startsWith(h));

export default function Nav() {
  const p = usePathname();
  const sp = useSearchParams();
  const q = new URLSearchParams();
  for (const k of KEEP) { const v = sp.get(k); if (v) q.set(k, v); }
  const qs = q.toString() ? '?' + q.toString() : '';
  const cur = SECTIONS.find(s => s.items.some(i => active(p, i.href))) || SECTIONS[0];
  return (<>
    <div className="seg" role="tablist" aria-label="Sections">
      {SECTIONS.map(s => <a key={s.key} href={s.items[0].href + qs} aria-current={s === cur ? 'true' : undefined}>{s.label}</a>)}
    </div>
    <nav className="navlist" aria-label={cur.label}>
      {cur.items.map(i => <a key={i.href} className={'nav' + (i.sub ? ' sub' : '')} href={i.href + qs} aria-current={active(p, i.href) ? 'page' : undefined}>{!i.sub && <Icon name={i.icon} size={18} />}{i.label}</a>)}
    </nav>
  </>);
}
