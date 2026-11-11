'use client';
// Global filters: date range, site, payer. Changing one reloads the view with the new URL.
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { RANGES } from '@/lib/filters';

export default function FilterBar({ sites, payers }: { sites: { id: string; name: string }[]; payers: string[] }) {
  const router = useRouter(); const path = usePathname(); const sp = useSearchParams();
  const set = (k: string, v: string) => {
    const q = new URLSearchParams(sp.toString());
    if (!v || v === 'all' || (k === 'range' && v === '30d')) q.delete(k); else q.set(k, v);
    router.push(path + (q.toString() ? '?' + q : ''));
  };
  if (path.startsWith('/hub/banks') || path.startsWith('/hub/payments') || path.startsWith('/hub/remittances')) return <div className="filters" />;
  return (
    <form className="filters" onSubmit={e => e.preventDefault()} aria-label="Filters">
      <select aria-label="Date range" value={sp.get('range') || '30d'} onChange={e => set('range', e.target.value)}>
        {RANGES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
      </select>
      <select aria-label="Site" value={sp.get('site') || 'all'} onChange={e => set('site', e.target.value)}>
        <option value="all">All sites</option>{sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <select aria-label="Payer" value={sp.get('payer') || 'all'} onChange={e => set('payer', e.target.value)}>
        <option value="all">All payers</option>{payers.map(p => <option key={p} value={p}>{p}</option>)}
      </select>
    </form>
  );
}
