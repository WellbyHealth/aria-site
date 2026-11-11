// Stripe Connect: one connected account per practice, direct charges with an Aria platform fee.
import Stripe from 'stripe';
import crypto from 'node:crypto';
import { db, audit } from './db';
import { assertNoPhi } from './phi';

export const stripeConfigured = () => Boolean(process.env.STRIPE_SECRET_KEY);
let client: Stripe | null = null;
export function stripe(): Stripe {
  if (!stripeConfigured()) throw new Error('Stripe keys are not set');
  if (!client) client = new Stripe(process.env.STRIPE_SECRET_KEY!, { appInfo: { name: 'Aria CFO Hub', version: '0.1.0' } });
  return client;
}
const appUrl = () => process.env.APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
export const platformFeeCents = (amount: number) => Math.round(amount * Number(process.env.PLATFORM_FEE_BPS || 0) / 10000);

// Short random reference with no five-digit runs, so it can never be mistaken for a CPT code.
export function statementRef() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const pick = () => alphabet[crypto.randomInt(alphabet.length)];
  return `ARIA-${pick()}${pick()}${crypto.randomInt(10, 99)}${pick()}${pick()}${crypto.randomInt(10, 99)}`;
}

export async function onboardingLink(practiceId: string, practiceName: string, ownerEmail: string) {
  const d = await db();
  let [row] = await d.query('select * from stripe_accounts where practice_id=$1', [practiceId]);
  if (!row) {
    assertNoPhi({ business_name: practiceName });
    const acct = await stripe().accounts.create({
      country: 'US', email: ownerEmail,
      business_profile: { name: practiceName, mcc: '8011', product_description: 'Medical practice: patient balances after insurance' },
      capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
      controller: { stripe_dashboard: { type: 'express' }, fees: { payer: 'application' }, losses: { payments: 'stripe' }, requirement_collection: 'stripe' },
      metadata: { aria_practice_id: practiceId },
    });
    [row] = await d.query('insert into stripe_accounts (practice_id, account_id) values ($1,$2) returning *', [practiceId, acct.id]);
    await audit(practiceId, null, 'stripe.account_created', { account_id: acct.id });
  }
  const link = await stripe().accountLinks.create({ account: row.account_id, type: 'account_onboarding', refresh_url: `${appUrl()}/hub/payments?onboarding=refresh`, return_url: `${appUrl()}/hub/payments?onboarding=done` });
  return link.url;
}

export async function syncAccount(accountId: string) {
  const a = await stripe().accounts.retrieve(accountId);
  const d = await db();
  await d.query('update stripe_accounts set charges_enabled=$2, payouts_enabled=$3, details_submitted=$4, updated_at=now() where account_id=$1',
    [accountId, a.charges_enabled, a.payouts_enabled, a.details_submitted]);
}

export async function createPaymentRequest(o: { practiceId: string; userId: string; practiceName: string; locationId: string | null; patientName: string; patientContact: string | null; amountCents: number }) {
  assertNoPhi({ patient_name: o.patientName, patient_contact: o.patientContact });
  const d = await db();
  const [acct] = await d.query('select * from stripe_accounts where practice_id=$1', [o.practiceId]);
  if (!acct?.charges_enabled) throw new Error('Finish Stripe setup before sending payment links');
  const ref = statementRef();
  const fee = platformFeeCents(o.amountCents);
  const session = await stripe().checkout.sessions.create({
    mode: 'payment',
    line_items: [{ quantity: 1, price_data: { currency: 'usd', unit_amount: o.amountCents, product_data: { name: `Balance due, statement ${ref}` } } }],
    payment_intent_data: { application_fee_amount: fee || undefined, description: `Statement ${ref}`, metadata: { aria_statement_ref: ref }, setup_future_usage: 'off_session' },
    customer_creation: 'always',
    metadata: { aria_statement_ref: ref, aria_practice_id: o.practiceId },
    success_url: `${appUrl()}/pay/thanks?ref=${ref}`,
    cancel_url: `${appUrl()}/pay/thanks?ref=${ref}&canceled=1`,
    expires_at: Math.floor(Date.now() / 1000) + 23 * 3600,
  }, { stripeAccount: acct.account_id });
  const [row] = await d.query(
    `insert into payment_requests (practice_id, location_id, statement_ref, patient_name, patient_contact, amount_cents, fee_cents, checkout_url, stripe_session_id)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *`,
    [o.practiceId, o.locationId, ref, o.patientName, o.patientContact, o.amountCents, fee, session.url, session.id]);
  await audit(o.practiceId, o.userId, 'payment_request.created', { ref, amount_cents: o.amountCents });
  return row;
}

export async function handleEvent(event: Stripe.Event) {
  const d = await db();
  if (event.type === 'account.updated') {
    const a = event.data.object as Stripe.Account;
    await d.query('update stripe_accounts set charges_enabled=$2, payouts_enabled=$3, details_submitted=$4, updated_at=now() where account_id=$1', [a.id, a.charges_enabled, a.payouts_enabled, a.details_submitted]);
  }
  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const s = event.data.object as Stripe.Checkout.Session;
    if (s.payment_status === 'paid') {
      const [pr] = await d.query(`update payment_requests set status='paid', paid_at=now() where stripe_session_id=$1 and status <> 'paid' returning *`, [s.id]);
      if (pr) {
        await d.query(
          `insert into ledger_entries (practice_id, source, source_id, location_id, posted_on, amount_cents, description, kind)
           values ($1,'stripe',$2,$3,current_date,$4,$5,'patient_payment') on conflict (source, source_id) do nothing`,
          [pr.practice_id, `cs:${s.id}`, pr.location_id, pr.amount_cents, `Patient payment, statement ${pr.statement_ref}`]);
      }
    }
  }
  if (event.type === 'checkout.session.expired') {
    const s = event.data.object as Stripe.Checkout.Session;
    await d.query(`update payment_requests set status='expired' where stripe_session_id=$1 and status='open'`, [s.id]);
  }
}
