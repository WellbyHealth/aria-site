'use client';
import { usePathname } from 'next/navigation';
const LINKS = [['/hub', 'Overview'], ['/hub/banks', 'Banks and cards'], ['/hub/payments', 'Patient payments'], ['/hub/remittances', 'Insurer payments']] as const;
export default function Nav() {
  const p = usePathname();
  return <>{LINKS.map(([h, t]) => <a key={h} className="nav" href={h} aria-current={p === h ? 'page' : undefined}>{t}</a>)}</>;
}
