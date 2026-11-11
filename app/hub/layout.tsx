import { Suspense, type ReactNode } from 'react';
import { requireSession, logout } from '@/lib/auth';
import { db, isDemo } from '@/lib/db';
import { payerName } from '@/lib/metrics';
import { redirect } from 'next/navigation';
import Nav from '@/components/Nav';
import FilterBar from '@/components/FilterBar';

export const dynamic = 'force-dynamic';
async function signOut() { 'use server'; await logout(); redirect('/login'); }

function ago(ts: string | Date | null) {
  if (!ts) return 'never';
  const m = Math.round((Date.now() - new Date(ts).getTime()) / 6e4);
  if (m < 2) return 'just now'; if (m < 90) return `${m} min ago`; if (m < 48 * 60) return `${Math.round(m / 60)} hours ago`;
  return `${Math.round(m / 1440)} days ago`;
}

export default async function HubLayout({ children }: { children: ReactNode }) {
  const s = await requireSession();
  const d = await db();
  const sites = await d.query<{ id: string; name: string }>(`select id, name from locations where practice_id=$1 order by name`, [s.practiceId]);
  const payerRows = await d.query(`select distinct payer from remittances where practice_id=$1 union select distinct payer from ledger_entries where practice_id=$1 and payer is not null`, [s.practiceId]);
  const payers = [...new Set(payerRows.map(r => payerName(r.payer)))].filter(p => p !== 'Insurer').sort();
  const [plaid] = await d.query(`select max(last_synced_at) t, bool_or(status='reconnect') bad from plaid_items where practice_id=$1`, [s.practiceId]);
  const [era] = await d.query(`select to_char(max(paid_on),'Mon DD') t from remittances where practice_id=$1`, [s.practiceId]);
  const [stripe] = await d.query(`select charges_enabled from stripe_accounts where practice_id=$1`, [s.practiceId]);
  return (
    <div className="shell">
      <aside className="side glass">
        <a className="brand" href="/hub"><img src="/art/icon-128.png" alt="" />Aria CFO Hub</a>
        <Suspense><Nav /></Suspense>
        <div className="who"><b>{s.practiceName}</b>{s.name} · {s.role}
          {isDemo() && <div style={{ marginTop: 8 }}><span className="tag watch">Sample data</span></div>}
          <form action={signOut}><button className="btn ghost" style={{ height: 30, marginTop: 10, fontSize: 12 }}>Sign out</button></form></div>
      </aside>
      <div className="mainwrap">
        <div className="topbar glass">
          <Suspense><FilterBar sites={sites} payers={payers} /></Suspense>
          <div className="fresh" aria-label="Data freshness">
            <span>Plaid <b>{plaid?.bad ? 'needs sign-in' : `synced ${ago(plaid?.t)}`}</b></span>
            <span>835 files <b>{era?.t ? `through ${era.t}` : 'none yet'}</b></span>
            <span>Stripe <b>{stripe?.charges_enabled ? 'live' : 'not set up'}</b></span>
          </div>
        </div>
        <main className="main">{children}</main>
      </div>
    </div>
  );
}
