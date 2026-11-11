import { revalidatePath } from 'next/cache';
import { requireSession } from '@/lib/auth';
import { db, audit, isDemo } from '@/lib/db';
import { plaidConfigured, syncItem, refreshBalances } from '@/lib/plaid';
import { usd } from '@/lib/money';
import PlaidLink from '@/components/PlaidLink';

export const dynamic = 'force-dynamic';
async function assign(form: FormData) {
  'use server';
  const s = await requireSession(); const d = await db();
  const acct = String(form.get('account')), loc = String(form.get('location') || '') || null;
  await d.query('update bank_accounts set location_id=$3 where id=$1 and practice_id=$2', [acct, s.practiceId, loc]);
  await d.query('update ledger_entries set location_id=$3 where bank_account_id=$1 and practice_id=$2', [acct, s.practiceId, loc]);
  await audit(s.practiceId, s.userId, 'bank_account.location_set', { acct, loc });
  revalidatePath('/hub/banks');
}
async function addLocation(form: FormData) {
  'use server';
  const s = await requireSession(); const d = await db();
  const name = String(form.get('name') || '').trim();
  if (name) await d.query('insert into locations (practice_id, name) values ($1,$2)', [s.practiceId, name]);
  revalidatePath('/hub/banks');
}
async function syncNow(form: FormData) {
  'use server';
  const s = await requireSession(); const d = await db();
  const [item] = await d.query('select id from plaid_items where id=$1 and practice_id=$2', [String(form.get('item')), s.practiceId]);
  if (item && plaidConfigured()) { await refreshBalances(item.id); await syncItem(item.id); }
  revalidatePath('/hub/banks');
}
export default async function Banks() {
  const s = await requireSession(); const d = await db();
  const items = await d.query(`select * from plaid_items where practice_id=$1 and status <> 'removed' order by created_at`, [s.practiceId]);
  const accts = await d.query(`select * from bank_accounts where practice_id=$1 order by name`, [s.practiceId]);
  const locs = await d.query(`select * from locations where practice_id=$1 order by name`, [s.practiceId]);
  return (<>
    <div className="top"><div><h1>Banks and cards</h1><p>Connected through Plaid. We read balances and transactions; nothing moves without your approval.</p></div>
      {plaidConfigured() ? <PlaidLink /> : <span className="chip warn">Plaid keys not set{isDemo() ? ': showing sample data' : ''}</span>}</div>
    {items.map(it => (
      <section className="card" key={it.id} style={{ marginBottom: 16 }}>
        <div className="top" style={{ marginBottom: 8 }}><h2>{it.institution_name || 'Bank'}</h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{it.status === 'reconnect' ? <><span className="chip bad">Sign-in needed</span>{plaidConfigured() && <PlaidLink itemId={it.id} label="Reconnect" />}</> : <span className="chip ok">Connected</span>}
            {plaidConfigured() && !isDemo() && <form action={syncNow}><input type="hidden" name="item" value={it.id} /><button className="btn ghost">Sync now</button></form>}</div></div>
        <p className="note">Last synced {it.last_synced_at ? new Date(it.last_synced_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'never'}</p>
        <table><thead><tr><th>Account</th><th>Type</th><th>Location</th><th className="n">Balance</th></tr></thead><tbody>
          {accts.filter(a => a.plaid_item_id === it.id).map(a => <tr key={a.id}><td>{a.name} ···{a.mask}</td><td>{a.subtype || a.type}</td>
            <td><form action={assign} style={{ display: 'flex', gap: 6 }}><input type="hidden" name="account" value={a.id} /><select name="location" defaultValue={a.location_id || ''}><option value="">Unassigned</option>{locs.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select><button className="btn ghost" style={{ height: 44 }}>Save</button></form></td>
            <td className="n">{usd(a.current_cents)}</td></tr>)}
        </tbody></table>
      </section>))}
    {!items.length && <section className="card"><h2>No banks connected yet</h2><p>Connect your operating account first. Plaid works with most US banks and credit unions.</p></section>}
    <section className="card"><h2>Locations</h2><p className="note">{locs.map(l => l.name).join(' · ') || 'None yet'}</p>
      <form action={addLocation} style={{ display: 'flex', gap: 8, maxWidth: 420 }}><input name="name" placeholder="New location name" /><button className="btn ghost" style={{ height: 44 }}>Add</button></form></section>
  </>);
}
