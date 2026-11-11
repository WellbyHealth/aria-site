import type { ReactNode } from 'react';
import { requireSession, logout } from '@/lib/auth';
import { isDemo } from '@/lib/db';
import { redirect } from 'next/navigation';
import Nav from '@/components/Nav';

export const dynamic = 'force-dynamic';
async function signOut() { 'use server'; await logout(); redirect('/login'); }
export default async function HubLayout({ children }: { children: ReactNode }) {
  const s = await requireSession();
  return (
    <div className="shell">
      <aside className="side">
        <a className="brand" href="/hub"><i />CFO Hub</a>
        <Nav />
        <div className="who"><b>{s.practiceName}</b>{s.name}{isDemo() && <><br /><span className="chip warn" style={{ marginTop: 8 }}>Sample data</span></>}
          <form action={signOut}><button className="btn ghost" style={{ height: 34, marginTop: 10, fontSize: 13 }}>Sign out</button></form></div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
