// Front-desk checkout: what the patient owes today, collected by reader, text link or card on file.
// Demo mode records sample payments. Live mode sends real text-to-pay links through Stripe; the card reader
// and card-on-file charges need Stripe Terminal and saved payment methods, which are not wired yet.
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireSession } from '@/lib/auth';
import { db, isDemo } from '@/lib/db';
import { createPaymentRequest, statementRef } from '@/lib/stripe';
import { assertNoPhi, PhiError } from '@/lib/phi';
import { usd, toCents } from '@/lib/money';

export const dynamic = 'force-dynamic';
const METHODS = [['reader', 'Tap or insert card'], ['text', 'Text a link'], ['file', 'Card on file']] as const;

async function collect(form: FormData) {
  'use server';
  const s = await requireSession();
  const name = String(form.get('name') || '').trim();
  const contact = String(form.get('contact') || '').trim() || null;
  const copay = toCents(parseFloat(String(form.get('copay') || '0')) || 0);
  const prior = toCents(parseFloat(String(form.get('prior') || '0')) || 0);
  const method = String(form.get('method') || 'reader');
  const location = String(form.get('location') || '') || null;
  const amount = copay + prior;
  const back = (q: string) => redirect('/hub/payments/checkout?' + q);
  if (!name) back('err=' + encodeURIComponent('Enter the patient’s name.'));
  if (!(amount > 0)) back('err=' + encodeURIComponent('Enter a copay or balance above zero.'));
  if (method === 'text' && !contact) back('err=' + encodeURIComponent('Add a mobile number to text the link.'));
  let ref = '';
  try {
    assertNoPhi({ patient_name: name, patient_contact: contact });
    const d = await db();
    if (isDemo()) {
      ref = statementRef();
      const paid = method !== 'text';
      await d.query(`insert into payment_requests (practice_id, location_id, statement_ref, patient_name, patient_contact, amount_cents, status, checkout_url, paid_at)
        values ($1,$2,$3,$4,$5,$6,$7,$8,${paid ? 'now()' : 'null'})`,
        [s.practiceId, location, ref, name, contact, amount, paid ? 'paid' : 'open', paid ? `#${method}` : '#demo']);
    } else if (method === 'text') {
      const r = await createPaymentRequest({ practiceId: s.practiceId, userId: s.userId, practiceName: s.practiceName, locationId: location, patientName: name, patientContact: contact, amountCents: amount });
      ref = r.statement_ref;
    } else {
      throw new Error(method === 'reader' ? 'No card reader is connected to this location yet. Send a text link instead.' : 'Saved cards open once a patient has paid by link and agreed to keep the card on file.');
    }
  } catch (e: any) {
    back('err=' + encodeURIComponent(e instanceof PhiError ? e.message : e.message || 'Could not collect the payment'));
  }
  revalidatePath('/hub/payments');
  back(`done=${ref}&m=${method}&a=${amount}`);
}

export default async function Checkout({ searchParams }: { searchParams: Promise<{ err?: string; done?: string; m?: string; a?: string }> }) {
  const sp = await searchParams;
  const s = await requireSession(); const d = await db();
  const locs = await d.query(`select * from locations where practice_id=$1 order by name`, [s.practiceId]);
  const today = await d.query(`select pr.*, l.name loc from payment_requests pr left join locations l on l.id=pr.location_id
    where pr.practice_id=$1 and pr.created_at > now() - interval '1 day' order by pr.created_at desc limit 12`, [s.practiceId]);
  const [acct] = await d.query('select charges_enabled from stripe_accounts where practice_id=$1', [s.practiceId]);
  const paidToday = today.filter(r => r.status === 'paid').reduce((t, r) => t + Number(r.amount_cents), 0);
  const openToday = today.filter(r => r.status === 'open').reduce((t, r) => t + Number(r.amount_cents), 0);
  const how = (r: any) => r.checkout_url === '#reader' ? 'Card reader' : r.checkout_url === '#file' ? 'Card on file' : 'Text link';
  return (<>
    <div className="head"><div><h1>Front desk</h1><p>Collect copays and balances at check-in. Payments land in your Aria account and show up in your forecast.</p></div>
      <a className="btn ghost" href="/hub/payments">All patient payments</a></div>
    {sp.err && <div className="banner err">{sp.err}</div>}
    {sp.done && <div className="banner ok">{sp.m === 'text' ? `Text link sent for statement ${sp.done}.` : `Collected ${usd(Number(sp.a || 0))} for statement ${sp.done}.`}{isDemo() ? ' Demo mode: no card was charged.' : ''}</div>}
    {!acct?.charges_enabled && !isDemo() && <div className="banner">Turn on patient payments first. <a href="/hub/payments">Finish setup</a></div>}
    <div className="kpis fd-k">
      <div className="kpi"><span className="lbl">Collected today</span><div className="v">{usd(paidToday)}</div></div>
      <div className="kpi"><span className="lbl">Links waiting</span><div className="v">{usd(openToday)}</div></div>
      <div className="kpi"><span className="lbl">Card reader</span><div className="v fd-rd"><i className={isDemo() ? '' : 'off'} />{isDemo() ? 'Ready' : 'Not connected'}</div><span className="foot">{locs[0]?.name || 'Main location'}</span></div>
    </div>
    <div className="g">
      <section className="card s7 fd-pos"><header><h2>Check out a patient</h2></header>
        <form action={collect} className="form">
          <div className="f2"><label>Patient name<input name="name" required placeholder="First and last name" /></label>
            <label>Mobile<input name="contact" placeholder="For the receipt or a text link" /></label></div>
          <div className="f2"><label>Copay (USD)<input name="copay" type="number" min="0" step="0.01" placeholder="40.00" /></label>
            <label>Prior balance (USD)<input name="prior" type="number" min="0" step="0.01" placeholder="0.00" /></label></div>
          <label>Location<select name="location">{locs.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label>
          <fieldset className="fd-m"><legend>How the patient pays</legend>
            {METHODS.map(([v, t], i) => <label key={v}><input type="radio" name="method" value={v} defaultChecked={i === 0} /><span>{t}</span></label>)}</fieldset>
          <button className="btn">Collect payment</button>
          <p className="note">Only the amount, the patient’s name and mobile, and a statement number are sent to the processor. Never enter visit reasons or codes.</p>
        </form></section>
      <section className="card s5"><header><h2>Today at the desk</h2></header>
        <div className="tw"><table><thead><tr><th>Patient</th><th>How</th><th>Status</th><th className="n">Amount</th></tr></thead><tbody>
          {today.map(r => <tr key={r.id}><td>{r.patient_name}<div className="note" style={{ whiteSpace: "nowrap" }}>{r.statement_ref}</div></td><td>{how(r)}</td>
            <td><span className={`chip ${r.status === 'paid' ? 'ok' : 'warn'}`}>{r.status === 'paid' ? 'Paid' : 'Link sent'}</span></td><td className="n">{usd(r.amount_cents)}</td></tr>)}
          {!today.length && <tr><td colSpan={4} className="note">No one checked out yet today.</td></tr>}
        </tbody></table></div></section>
    </div>
  </>);
}
