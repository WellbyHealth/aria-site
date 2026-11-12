import { Suspense, type ReactNode } from 'react';
import { requireSession, logout } from '@/lib/auth';
import { db, isDemo } from '@/lib/db';
import { payerName } from '@/lib/metrics';
import { redirect } from 'next/navigation';
import Nav from '@/components/Nav';
import FilterBar from '@/components/FilterBar';
import { Search, HideToggle } from '@/components/TopTools';
import { Logo } from '@/components/Logo';
import { Icon } from '@/components/Icon';

export const dynamic = 'force-dynamic';
async function signOut() { 'use server'; await logout(); redirect('/login'); }

function ago(ts: string | Date | null) {
  if (!ts) return 'never';
  const m = Math.round((Date.now() - new Date(ts).getTime()) / 6e4);
  if (m < 2) return 'just now'; if (m < 90) return `${m} min ago`; if (m < 48 * 60) return `${Math.round(m / 60)} hours ago`;
  return `${Math.round(m / 1440)} days ago`;
}
const initials = (n: string) => n.replace(/^Dr\.?\s+/i, '').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();

export default async function HubLayout({ children }: { children: ReactNode }) {
  const s = await requireSession();
  const d = await db();
  const sites = await d.query<{ id: string; name: string }>(`select id, name from locations where practice_id=$1 order by name`, [s.practiceId]);
  const payerRows = await d.query(`select distinct payer from remittances where practice_id=$1 union select distinct payer from ledger_entries where practice_id=$1 and payer is not null`, [s.practiceId]);
  const payers = [...new Set(payerRows.map(r => payerName(r.payer)))].filter(p => p !== 'Insurer').sort();
  const [plaid] = await d.query(`select max(last_synced_at) t, bool_or(status='reconnect') bad, count(*)::int n from plaid_items where practice_id=$1`, [s.practiceId]);
  const [era] = await d.query(`select to_char(max(paid_on),'Mon DD') t from remittances where practice_id=$1`, [s.practiceId]);
  const [stripe] = await d.query(`select charges_enabled from stripe_accounts where practice_id=$1`, [s.practiceId]);
  return (
    <div className="shell">
      <aside className="side">
        <a className="ws" href="/hub"><span className="logo"><Logo size={22} /></span>{s.practiceName}{isDemo() && <span className="badge">Demo</span>}</a>
        <Suspense><Nav /></Suspense>
        <hr />
        <div className="conns">
          <div className="sec-h">Connections</div>
          <a className="src" href="/hub/banks"><i className={'dot' + (plaid?.bad ? ' warn' : plaid?.n ? '' : ' off')} /><span>Banks<small>{plaid?.bad ? 'Needs sign-in' : plaid?.n ? `Synced ${ago(plaid?.t)}` : 'Not connected'}</small></span></a>
          <a className="src" href="/hub/remittances"><i className={'dot' + (era?.t ? '' : ' off')} /><span>Insurer files<small>{era?.t ? `Through ${era.t}` : 'None yet'}</small></span></a>
          <a className="src" href="/hub/payments"><i className={'dot' + (stripe?.charges_enabled ? '' : ' warn')} /><span>Patient payments<small>{stripe?.charges_enabled ? 'Live' : 'Finish setup'}</small></span></a>
        </div>
        <div className="me"><span className="avatar">{initials(s.name)}</span><span style={{ flex: 1, minWidth: 0 }}><b>{s.name}</b>{s.role}</span>
          <form action={signOut}><button className="iconbtn" aria-label="Sign out" title="Sign out"><Icon name="logout" size={17} /></button></form></div>
      </aside>
      <div className="mainwrap">
        <div className="topbar">
          <Search />
          <div className="tools">
            <Suspense><FilterBar sites={sites} payers={payers} /></Suspense>
            <HideToggle />
            <span className="avatar" aria-hidden="true">{initials(s.name)}</span>
          </div>
        </div>
        <main className="main">{children}</main>
      </div>
    </div>
  );
}
