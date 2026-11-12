'use client';
// Top bar: jump to any page by name, and hide balances when someone is looking over your shoulder.
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Icon } from './Icon';

const PAGES: [string, string][] = [
  ['Home', '/hub'], ['Cash and forecast', '/hub/cash'], ['Costs and margin', '/hub/costs'], ['Alerts and risk', '/hub/risk'],
  ['Insurer payments', '/hub/revenue'], ['Payers', '/hub/payers'], ['Providers', '/hub/providers'], ['Patient payments', '/hub/payments'],
  ['Insurer files (835)', '/hub/remittances'], ['Accounts and cards', '/hub/banks'],
];

export function Search() {
  const router = useRouter();
  const [v, setV] = useState('');
  const go = (s: string) => { const m = PAGES.find(([l]) => l.toLowerCase().includes(s.toLowerCase().trim())); if (m) router.push(m[1]); };
  return (
    <form className="search" role="search" onSubmit={e => { e.preventDefault(); go(v); }}>
      <Icon name="search" size={18} />
      <input list="hub-pages" placeholder="Search for anything" aria-label="Search pages" value={v} onChange={e => { setV(e.target.value); if (PAGES.some(([l]) => l === e.target.value)) go(e.target.value); }} />
      <datalist id="hub-pages">{PAGES.map(([l]) => <option key={l} value={l} />)}</datalist>
    </form>
  );
}

export function HideToggle() {
  const [hide, setHide] = useState(false);
  useEffect(() => { try { setHide(localStorage.getItem('hub-hide') === '1'); } catch {} }, []);
  useEffect(() => { document.documentElement.toggleAttribute('data-hide', hide); try { localStorage.setItem('hub-hide', hide ? '1' : '0'); } catch {} }, [hide]);
  return <button type="button" className="iconbtn" aria-pressed={hide} aria-label={hide ? 'Show balances' : 'Hide balances'} title={hide ? 'Show balances' : 'Hide balances'} onClick={() => setHide(h => !h)}><Icon name={hide ? 'eyeoff' : 'eye'} size={19} /></button>;
}
