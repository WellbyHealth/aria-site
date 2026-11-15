// Front-desk checkout: what the patient owes today, collected on a Stripe Terminal reader, by text link,
// or on a card the patient agreed to keep on file. Demo mode records sample payments and charges nothing.
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireSession } from '@/lib/auth';
import { db, isDemo } from '@/lib/db';
import { createPaymentRequest, statementRef, chargeOnReader, chargeSavedCard, registerReader, cancelReader, refreshIntent } from '@/lib/stripe';
import { assertNoPhi, PhiError } from '@/lib/phi';
import { usd, toCents } from '@/lib/money';

export const dynamic = 'force-dynamic';
const METHODS = [['reader', 'Tap or insert card'], ['text', 'Text a link'], ['file', 'Card on file']] as const;
const back = (q: string) => redirect('/hub/payments/checkout?' + q);
const msg = (e: any) => e instanceof PhiError ? e.message : e?.message || 'Something went wrong';
const BRAND: Record<string, string> = { visa: 'Visa', mastercard: 'Mastercard', amex: 'Amex', discover: 'Discover' };

async function collect(form: FormData) {
  'use server';
  const s = await requireSession();
  const method = String(form.get('method') || 'reader');
  const cardId = String(form.get('card') || '');
  let name = String(form.get('name') || '').trim();
  const contact = String(form.get('contact') || '').trim() || null;
  const amount = toCents(parseFloat(String(form.get('copay') || '0')) || 0) + toCents(parseFloat(String(form.get('prior') || '0')) || 0);
  const location = String(form.get('location') || '') || null;
  const reader = String(form.get('reader') || '');
  const d = await db();
  if (method === 'file' && !name && cardId) { const [c] = await d.query('select patient_name from saved_cards where id=$1', [cardId]); name = c?.patient_name || ''; }
  if (!name) back('err=' + encodeURIComponent('Enter the patient’s name.'));
  if (!(amount > 0)) back('err=' + encodeURIComponent('Enter a copay or balance above zero.'));
  if (method === 'text' && !contact) back('err=' + encodeURIComponent('Add a mobile number to text the link.'));
  if (method === 'file' && !cardId) back('err=' + encodeURIComponent('Pick a saved card.'));
  if (method === 'reader' && !reader) back('err=' + encodeURIComponent('Pick a card reader.'));
  let ref = '';
  try {
    assertNoPhi({ patient_name: name, patient_contact: contact });
    if (isDemo()) {
      ref = statementRef();
      const paid = method !== 'text';
      await d.query(`insert into payment_requests (practice_id, location_id, statement_ref, patient_name, patient_contact, amount_cents, status, checkout_url, paid_at, method, reader_id)
        values ($1,$2,$3,$4,$5,$6,$7,'#demo',${paid ? 'now()' : 'null'},$8,$9)`,
        [s.practiceId, location, ref, name, contact, amount, paid ? 'paid' : 'open', method === 'text' ? 'link' : method, method === 'reader' ? reader : null]);
    } else if (method === 'text') {
      ref = (await createPaymentRequest({ practiceId: s.practiceId, userId: s.userId, practiceName: s.practiceName, locationId: location, patientName: name, patientContact: contact, amountCents: amount })).statement_ref;
    } else if (method === 'reader') {
      ref = (await chargeOnReader({ practiceId: s.practiceId, userId: s.userId, readerId: reader, locationId: location, patientName: name, patientContact: contact, amountCents: amount })).statement_ref;
    } else {
      ref = (await chargeSavedCard({ practiceId: s.practiceId, userId: s.userId, cardId, locationId: location, amountCents: amount })).statement_ref;
    }
  } catch (e) { back('err=' + encodeURIComponent(msg(e))); }
  revalidatePath('/hub/payments');
  back(`done=${ref}&m=${method}&a=${amount}`);
}

async function addReader(form: FormData) {
  'use server';
  const s = await requireSession();
  const g = (k: string) => String(form.get(k) || '').trim();
  if (isDemo()) back('err=' + encodeURIComponent('Demo mode: readers are registered once Stripe keys are set.'));
  try {
    await registerReader({ practiceId: s.practiceId, userId: s.userId, locationId: g('location'), code: g('code'), label: g('label') || 'Front desk',
      address: { line1: g('line1'), city: g('city'), state: g('state'), postal_code: g('zip') } });
  } catch (e) { back('err=' + encodeURIComponent(msg(e))); }
  back('reader=added');
}
async function cancel(form: FormData) {
  'use server';
  const s = await requireSession();
  try { if (!isDemo()) await cancelReader(s.practiceId, String(form.get('reader'))); } catch (e) { back('err=' + encodeURIComponent(msg(e))); }
  back('canceled=1');
}
async function refresh(form: FormData) {
  'use server';
  const s = await requireSession();
  try { if (!isDemo()) await refreshIntent(s.practiceId, String(form.get('id'))); } catch (e) { back('err=' + encodeURIComponent(msg(e))); }
  back('');
}

export default async function Checkout({ searchParams }: { searchParams: Promise<{ err?: string; done?: string; m?: string; a?: string; reader?: string; canceled?: string }> }) {
  const sp = await searchParams;
  const s = await requireSession(); const d = await db();
  const locs = await d.query(`select * from locations where practice_id=$1 order by name`, [s.practiceId]);
  const readers = await d.query(`select r.*, l.name loc from terminal_readers r left join locations l on l.id=r.location_id where r.practice_id=$1 order by r.created_at`, [s.practiceId]);
  const cards = await d.query(`select * from saved_cards where practice_id=$1 and removed_at is null order by patient_name`, [s.practiceId]);
  const today = await d.query(`select * from payment_requests where practice_id=$1 and created_at > now() - interval '1 day' order by created_at desc limit 12`, [s.practiceId]);
  const [acct] = await d.query('select charges_enabled from stripe_accounts where practice_id=$1', [s.practiceId]);
  const paidToday = today.filter(r => r.status === 'paid').reduce((t, r) => t + Number(r.amount_cents), 0);
  const openToday = today.filter(r => r.status === 'open').reduce((t, r) => t + Number(r.amount_cents), 0);
  const how = (r: any) => r.method === 'reader' ? 'Card reader' : r.method === 'file' ? 'Card on file' : 'Text link';
  const state = (r: any) => r.status === 'paid' ? ['ok', 'Paid'] : r.status === 'open' ? ['warn', r.method === 'reader' ? 'On reader' : 'Link sent'] : ['bad', r.method === 'link' ? 'Expired' : 'Declined'];
  const live = !isDemo();
  return (<>
    <div className="head"><div><h1>Front desk</h1><p>Collect copays and balances at check-in. Payments land in your Aria account and show up in your forecast.</p></div>
      <a className="btn ghost" href="/hub/payments">All patient payments</a></div>
    {sp.err && <div className="banner err">{sp.err}</div>}
    {sp.done && <div className="banner ok">{sp.m === 'text' ? `Text link sent for statement ${sp.done}.` : sp.m === 'reader' && live ? `Sent ${usd(Number(sp.a || 0))} to the reader. Ask the patient to tap or insert their card.` : `Collected ${usd(Number(sp.a || 0))} for statement ${sp.done}.`}{isDemo() ? ' Demo mode: no card was charged.' : ''}</div>}
    {sp.reader && <div className="banner ok">Reader added. It shows as ready once it is online.</div>}
    {sp.canceled && <div className="banner">Canceled on the reader.</div>}
    {live && !acct?.charges_enabled && <div className="banner">Turn on patient payments first. <a href="/hub/payments">Finish setup</a></div>}
    <div className="kpis fd-k">
      <div className="kpi"><span className="lbl">Collected today</span><div className="v">{usd(paidToday)}</div></div>
      <div className="kpi"><span className="lbl">Waiting</span><div className="v">{usd(openToday)}</div><span className="foot">On a reader or a text link</span></div>
      <div className="kpi"><span className="lbl">Card readers</span><div className="v fd-rd"><i className={readers.length ? '' : 'off'} />{readers.length ? `${readers.length} ready` : 'None yet'}</div><span className="foot">{readers.map(r => r.label).join(', ') || 'Add one below'}</span></div>
    </div>
    <div className="g">
      <section className="card s7 fd-pos"><header><h2>Check out a patient</h2></header>
        <form action={collect} className="form">
          <div className="f2"><label>Patient name<input name="name" placeholder="First and last name" /></label>
            <label>Mobile<input name="contact" placeholder="For the receipt or a text link" /></label></div>
          <div className="f2"><label>Copay (USD)<input name="copay" type="number" min="0" step="0.01" placeholder="40.00" /></label>
            <label>Prior balance (USD)<input name="prior" type="number" min="0" step="0.01" placeholder="0.00" /></label></div>
          <label>Location<select name="location">{locs.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label>
          <fieldset className="fd-m"><legend>How the patient pays</legend>
            {METHODS.map(([v, t], i) => <label key={v}><input type="radio" name="method" value={v} defaultChecked={i === 0} /><span>{t}</span></label>)}</fieldset>
          <div className="f2"><label>Card reader<select name="reader">{readers.length ? readers.map(r => <option key={r.reader_id} value={r.reader_id}>{r.label}{r.loc ? ` · ${r.loc}` : ''}</option>) : <option value="">No readers yet</option>}</select></label>
            <label>Saved card<select name="card"><option value="">Choose a patient’s card</option>{cards.map(c => <option key={c.id} value={c.id}>{c.patient_name} · {BRAND[c.brand] || c.brand} •••• {c.last4}</option>)}</select></label></div>
          <button className="btn">Collect payment</button>
          <p className="note">Only the amount, the patient’s name and mobile, and a statement number go to the processor. Never enter visit reasons or codes. Cards are saved only when a patient pays by text link and agrees on the payment page.</p>
        </form></section>
      <section className="card s5"><header><h2>Today at the desk</h2></header>
        <div className="tw"><table><thead><tr><th>Patient</th><th>How</th><th>Status</th><th className="n">Amount</th></tr></thead><tbody>
          {today.map(r => { const [tone, label] = state(r); return <tr key={r.id}><td>{r.patient_name}<div className="note" style={{ whiteSpace: 'nowrap' }}>{r.statement_ref}</div></td><td>{how(r)}</td>
            <td><span className={`chip ${tone}`}>{label}</span>{r.failure && <div className="note">{r.failure}</div>}
              {live && r.status === 'open' && r.method === 'reader' && <div className="fd-act"><form action={refresh}><input type="hidden" name="id" value={r.id} /><button className="lnk">Check</button></form><form action={cancel}><input type="hidden" name="reader" value={r.reader_id} /><button className="lnk">Cancel</button></form></div>}</td>
            <td className="n">{usd(r.amount_cents)}</td></tr>; })}
          {!today.length && <tr><td colSpan={4} className="note">No one checked out yet today.</td></tr>}
        </tbody></table></div></section>
    </div>
    <div className="g" style={{ marginTop: 24 }}>
      <section className="card s7"><header><h2>Card readers</h2></header>
        <div className="tw"><table><thead><tr><th>Reader</th><th>Location</th><th>Model</th><th>Status</th></tr></thead><tbody>
          {readers.map(r => <tr key={r.reader_id}><td>{r.label}</td><td>{r.loc || '—'}</td><td>{({ bbpos_wisepos_e: 'WisePOS E', stripe_s700: 'Stripe S700', stripe_m2: 'Stripe M2' } as Record<string, string>)[r.device_type] || r.device_type || '—'}</td><td><span className={`chip ${r.status === 'online' ? 'ok' : ''}`}>{r.status === 'online' ? 'Online' : r.status || 'Unknown'}</span></td></tr>)}
          {!readers.length && <tr><td colSpan={4} className="note">No readers yet. Order a WisePOS E or S700 from Stripe, then register it here.</td></tr>}
        </tbody></table></div>
        <details className="fd-add"><summary>Add a reader</summary>
          <form action={addReader} className="form">
            <p className="note">On the reader, open Settings and choose Generate pairing code, then enter it here.</p>
            <div className="f2"><label>Pairing code<input name="code" required placeholder="sepia-cerulean-aardvark" /></label><label>Name<input name="label" placeholder="Front desk" /></label></div>
            <label>Location<select name="location">{locs.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label>
            <label>Street address<input name="line1" required placeholder="Needed once per location" /></label>
            <div className="f3"><label>City<input name="city" required /></label><label>State<input name="state" required maxLength={2} placeholder="WI" /></label><label>ZIP<input name="zip" required /></label></div>
            <button className="btn ghost">Register reader</button>
          </form></details></section>
      <section className="card s5"><header><h2>Cards on file</h2></header>
        <div className="tw"><table><thead><tr><th>Patient</th><th>Card</th><th>Expires</th></tr></thead><tbody>
          {cards.map(c => <tr key={c.id}><td>{c.patient_name}<div className="note">Agreed {new Date(c.consent_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div></td><td>{BRAND[c.brand] || c.brand} •••• {c.last4}</td><td>{String(c.exp_month).padStart(2, '0')}/{String(c.exp_year).slice(-2)}</td></tr>)}
          {!cards.length && <tr><td colSpan={3} className="note">Cards appear here after a patient pays by text link and agrees to keep the card on file.</td></tr>}
        </tbody></table></div></section>
    </div>
  </>);
}
