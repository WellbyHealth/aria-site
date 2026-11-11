import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireSession } from '@/lib/auth';
import { db, isDemo } from '@/lib/db';
import { stripeConfigured, onboardingLink, createPaymentRequest, syncAccount, platformFeeCents } from '@/lib/stripe';
import { PhiError } from '@/lib/phi';
import { usd, toCents } from '@/lib/money';
import { fmt } from '@/lib/weekly';

export const dynamic = 'force-dynamic';
async function startOnboarding() {
  'use server';
  const s = await requireSession();
  const url = await onboardingLink(s.practiceId, s.practiceName, s.email);
  redirect(url);
}
async function request(form: FormData) {
  'use server';
  const s = await requireSession();
  const amount = toCents(parseFloat(String(form.get('amount') || '0')));
  if (!(amount > 0)) redirect('/hub/payments?err=' + encodeURIComponent('Enter an amount above zero.'));
  let ok = '';
  try {
    if (isDemo()) throw new Error('Demo mode: connect Stripe test keys to send real links.');
    const r = await createPaymentRequest({ practiceId: s.practiceId, userId: s.userId, practiceName: s.practiceName, locationId: String(form.get('location') || '') || null,
      patientName: String(form.get('name') || '').trim(), patientContact: String(form.get('contact') || '').trim() || null, amountCents: amount });
    ok = r.statement_ref;
  } catch (e: any) {
    redirect('/hub/payments?err=' + encodeURIComponent(e instanceof PhiError ? e.message : e.message || 'Could not create the link'));
  }
  revalidatePath('/hub/payments');
  redirect('/hub/payments?created=' + ok);
}
export default async function Payments({ searchParams }: { searchParams: Promise<{ err?: string; created?: string; onboarding?: string }> }) {
  const sp = await searchParams;
  const s = await requireSession(); const d = await db();
  let [acct] = await d.query('select * from stripe_accounts where practice_id=$1', [s.practiceId]);
  if (acct && sp.onboarding && stripeConfigured() && !isDemo()) { await syncAccount(acct.account_id); [acct] = await d.query('select * from stripe_accounts where practice_id=$1', [s.practiceId]); }
  const reqs = await d.query(`select pr.*, l.name loc from payment_requests pr left join locations l on l.id=pr.location_id where pr.practice_id=$1 order by pr.created_at desc limit 50`, [s.practiceId]);
  const locs = await d.query(`select * from locations where practice_id=$1 order by name`, [s.practiceId]);
  const paid30 = reqs.filter(r => r.status === 'paid' && Date.now() - new Date(r.paid_at).getTime() < 30 * 864e5).reduce((t, r) => t + Number(r.amount_cents), 0);
  const open = reqs.filter(r => r.status === 'open').reduce((t, r) => t + Number(r.amount_cents), 0);
  return (<>
    <div className="top"><div><h1>Patient payments</h1><p>Patients pay your practice directly through Stripe. Payouts land in your bank account.</p></div>
      {acct?.charges_enabled ? <span className="chip ok">Payments on</span> : stripeConfigured() ? <form action={startOnboarding}><button className="btn">{acct ? 'Finish Stripe setup' : 'Turn on patient payments'}</button></form> : <span className="chip warn">Stripe keys not set</span>}</div>
    {sp.err && <div className="banner err">{sp.err}</div>}
    {sp.created && <div className="banner ok">Payment link created for statement {sp.created}. Copy it from the list below and text or email it to the patient.</div>}
    <div className="grid g3" style={{ marginBottom: 16 }}>
      <div className="kpi" style={{ ['--t' as any]: 'var(--mint)' }}><span>Collected, last 30 days</span><b>{usd(paid30)}</b></div>
      <div className="kpi" style={{ ['--t' as any]: 'var(--butter)' }}><span>Waiting on patients</span><b>{usd(open)}</b></div>
      <div className="kpi" style={{ ['--t' as any]: 'var(--blue)' }}><span>Aria platform fee</span><b>{(Number(process.env.PLATFORM_FEE_BPS || 0) / 100).toFixed(2)}%</b><small>Set by PLATFORM_FEE_BPS</small></div>
    </div>
    <div className="grid g2">
      <section className="card"><h2>Recent requests</h2>
        <table><thead><tr><th>Sent</th><th>Patient</th><th>Statement</th><th>Status</th><th className="n">Amount</th></tr></thead><tbody>
          {reqs.map(r => <tr key={r.id}><td>{fmt(new Date(r.created_at).toISOString().slice(0, 10))}</td><td>{r.patient_name}</td><td>{r.statement_ref}</td>
            <td><span className={`chip ${r.status === 'paid' ? 'ok' : r.status === 'open' ? 'warn' : ''}`}>{r.status}</span>{r.status === 'open' && r.checkout_url && r.checkout_url !== '#demo' && <> <a href={r.checkout_url} target="_blank" rel="noreferrer">Link</a></>}</td>
            <td className="n">{usd(r.amount_cents)}</td></tr>)}
          {!reqs.length && <tr><td colSpan={5} className="note">No payment requests yet.</td></tr>}
        </tbody></table></section>
      <section className="card"><h2>Request a payment</h2>
        <form action={request} className="form">
          <label>Patient name<input name="name" required placeholder="First and last name" /></label>
          <div className="f2"><label>Mobile or email<input name="contact" placeholder="For the receipt" /></label><label>Amount (USD)<input name="amount" type="number" min="1" step="0.01" required /></label></div>
          <label>Location<select name="location">{locs.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label>
          <button className="btn" disabled={!acct?.charges_enabled}>Create payment link</button>
          <p className="note">Never enter visit reasons, procedure or diagnosis codes. Stripe only sees the amount, the patient’s name and contact, and a statement number. The link is valid for 23 hours.</p>
        </form></section>
    </div>
  </>);
}
void platformFeeCents;
