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
    custom_text: { submit: { message: `${o.practiceName} will keep this card on file to pay future balances after insurance. You can ask the practice to remove it at any time.` } },
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
      if (pr && s.payment_intent && event.account) await saveCardFromIntent(pr, String(s.payment_intent), event.account).catch(() => {});
      if (pr) {
        await d.query(
          `insert into ledger_entries (practice_id, source, source_id, location_id, posted_on, amount_cents, description, kind)
           values ($1,'stripe',$2,$3,current_date,$4,$5,'patient_payment') on conflict (source, source_id) do nothing`,
          [pr.practice_id, `cs:${s.id}`, pr.location_id, pr.amount_cents, `Patient payment, statement ${pr.statement_ref}`]);
      }
    }
  }
  if (event.type === 'payment_intent.succeeded' || event.type === 'payment_intent.payment_failed') {
    const pi = event.data.object as Stripe.PaymentIntent;
    await settleIntent(pi);
  }
  if (event.type === 'terminal.reader.action_failed') {
    const r = event.data.object as Stripe.Terminal.Reader;
    const pi = r.action?.process_payment_intent?.payment_intent;
    if (pi) await d.query(`update payment_requests set status='canceled', failure=$2 where stripe_payment_intent_id=$1 and status='open'`, [String(pi), r.action?.failure_message || 'Declined on the reader']);
  }
  if (event.type === 'checkout.session.expired') {
    const s = event.data.object as Stripe.Checkout.Session;
    await d.query(`update payment_requests set status='expired' where stripe_session_id=$1 and status='open'`, [s.id]);
  }
  // Payouts on a connected account arrive as Connect events (event.account names the practice's account).
  if (event.type === 'payout.paid' || event.type === 'payout.failed' || event.type === 'payout.updated') {
    const po = event.data.object as Stripe.Payout;
    const [acct] = await d.query(`select practice_id from stripe_accounts where account_id=$1`, [event.account]);
    if (acct) {
      await d.query(`insert into stripe_payouts (payout_id, practice_id, amount_cents, arrival_date, status) values ($1,$2,$3,to_timestamp($4)::date,$5)
        on conflict (payout_id) do update set status=excluded.status, amount_cents=excluded.amount_cents, arrival_date=excluded.arrival_date`,
        [po.id, acct.practice_id, po.amount, po.arrival_date, po.status]);
      const { matchPayouts } = await import('./match');
      await matchPayouts(acct.practice_id);
    }
  }
}

// ---------------------------------------------------------------- front desk: Terminal readers and saved cards
async function account(practiceId: string) {
  const d = await db();
  const [acct] = await d.query('select * from stripe_accounts where practice_id=$1', [practiceId]);
  if (!acct?.charges_enabled) throw new Error('Finish Stripe setup before taking payments');
  return acct.account_id as string;
}

// A Terminal Location per practice location, created on first use. Stripe needs a street address for it.
async function terminalLocation(practiceId: string, locationId: string, address: Stripe.AddressParam, acct: string) {
  const d = await db();
  const [loc] = await d.query('select * from locations where id=$1 and practice_id=$2', [locationId, practiceId]);
  if (!loc) throw new Error('Pick a location');
  if (loc.stripe_terminal_location_id) return loc.stripe_terminal_location_id as string;
  const tl = await stripe().terminal.locations.create({ display_name: loc.name, address: { country: 'US', ...address } }, { stripeAccount: acct });
  await d.query('update locations set stripe_terminal_location_id=$2 where id=$1', [locationId, tl.id]);
  return tl.id;
}

export async function registerReader(o: { practiceId: string; userId: string; locationId: string; code: string; label: string; address: Stripe.AddressParam }) {
  const acct = await account(o.practiceId);
  const location = await terminalLocation(o.practiceId, o.locationId, o.address, acct);
  const r = await stripe().terminal.readers.create({ registration_code: o.code, label: o.label, location }, { stripeAccount: acct });
  const d = await db();
  await d.query(`insert into terminal_readers (reader_id, practice_id, location_id, label, device_type, status) values ($1,$2,$3,$4,$5,$6)
    on conflict (reader_id) do update set label=excluded.label, status=excluded.status`, [r.id, o.practiceId, o.locationId, o.label, r.device_type, r.status]);
  await audit(o.practiceId, o.userId, 'terminal.reader_registered', { reader_id: r.id });
  return r;
}

// Server-driven Terminal: create a card_present PaymentIntent and hand it to the reader. The webhook settles it.
export async function chargeOnReader(o: { practiceId: string; userId: string; readerId: string; locationId: string | null; patientName: string; patientContact: string | null; amountCents: number }) {
  assertNoPhi({ patient_name: o.patientName, patient_contact: o.patientContact });
  const acct = await account(o.practiceId);
  const d = await db();
  const [reader] = await d.query('select * from terminal_readers where reader_id=$1 and practice_id=$2', [o.readerId, o.practiceId]);
  if (!reader) throw new Error('Pick a card reader');
  const ref = statementRef(); const fee = platformFeeCents(o.amountCents);
  const pi = await stripe().paymentIntents.create({
    amount: o.amountCents, currency: 'usd', payment_method_types: ['card_present'], capture_method: 'automatic',
    application_fee_amount: fee || undefined, description: `Statement ${ref}`, metadata: { aria_statement_ref: ref, aria_practice_id: o.practiceId },
  }, { stripeAccount: acct });
  await stripe().terminal.readers.processPaymentIntent(o.readerId, { payment_intent: pi.id }, { stripeAccount: acct });
  const [row] = await d.query(`insert into payment_requests (practice_id, location_id, statement_ref, patient_name, patient_contact, amount_cents, fee_cents, method, stripe_payment_intent_id, reader_id)
    values ($1,$2,$3,$4,$5,$6,$7,'reader',$8,$9) returning *`, [o.practiceId, o.locationId, ref, o.patientName, o.patientContact, o.amountCents, fee, pi.id, o.readerId]);
  await audit(o.practiceId, o.userId, 'terminal.payment_started', { ref, amount_cents: o.amountCents });
  return row;
}

export async function cancelReader(practiceId: string, readerId: string) {
  const acct = await account(practiceId);
  await stripe().terminal.readers.cancelAction(readerId, {}, { stripeAccount: acct });
  const d = await db();
  await d.query(`update payment_requests set status='canceled', failure='Canceled at the desk' where reader_id=$1 and practice_id=$2 and status='open' and method='reader'`, [readerId, practiceId]);
}

// Charge a card the patient agreed to keep on file (saved from an earlier text-link payment).
export async function chargeSavedCard(o: { practiceId: string; userId: string; cardId: string; locationId: string | null; amountCents: number }) {
  const acct = await account(o.practiceId);
  const d = await db();
  const [card] = await d.query('select * from saved_cards where id=$1 and practice_id=$2 and removed_at is null', [o.cardId, o.practiceId]);
  if (!card) throw new Error('Pick a saved card');
  const ref = statementRef(); const fee = platformFeeCents(o.amountCents);
  let pi: Stripe.PaymentIntent;
  try {
    pi = await stripe().paymentIntents.create({
      amount: o.amountCents, currency: 'usd', customer: card.stripe_customer_id, payment_method: card.payment_method_id, off_session: true, confirm: true,
      application_fee_amount: fee || undefined, description: `Statement ${ref}`, metadata: { aria_statement_ref: ref, aria_practice_id: o.practiceId },
    }, { stripeAccount: acct });
  } catch (e: any) {
    throw new Error(e?.code === 'authentication_required' ? 'The bank wants the patient to confirm this charge. Send a text link instead.' : e?.message || 'The card was declined');
  }
  const [row] = await d.query(`insert into payment_requests (practice_id, location_id, statement_ref, patient_name, patient_contact, amount_cents, fee_cents, method, stripe_payment_intent_id)
    values ($1,$2,$3,$4,$5,$6,$7,'file',$8) returning *`, [o.practiceId, o.locationId, ref, card.patient_name, card.patient_contact, o.amountCents, fee, pi.id]);
  await audit(o.practiceId, o.userId, 'saved_card.charged', { ref, amount_cents: o.amountCents });
  await settleIntent(pi);
  return row;
}

// Mark a reader or saved-card payment paid (or failed) and post it to the ledger once.
export async function settleIntent(pi: Stripe.PaymentIntent) {
  const d = await db();
  if (pi.status === 'succeeded') {
    const [pr] = await d.query(`update payment_requests set status='paid', paid_at=now() where stripe_payment_intent_id=$1 and status <> 'paid' returning *`, [pi.id]);
    if (pr) await d.query(`insert into ledger_entries (practice_id, source, source_id, location_id, posted_on, amount_cents, description, kind)
      values ($1,'stripe',$2,$3,current_date,$4,$5,'patient_payment') on conflict (source, source_id) do nothing`,
      [pr.practice_id, `pi:${pi.id}`, pr.location_id, pr.amount_cents, `Patient payment, statement ${pr.statement_ref}`]);
  } else if (pi.status === 'requires_payment_method' && pi.last_payment_error) {
    await d.query(`update payment_requests set status='canceled', failure=$2 where stripe_payment_intent_id=$1 and status='open'`, [pi.id, pi.last_payment_error.message || 'Declined']);
  }
}

// Status check from the desk when a webhook has not landed yet.
export async function refreshIntent(practiceId: string, id: string) {
  const acct = await account(practiceId);
  const d = await db();
  const [pr] = await d.query('select * from payment_requests where id=$1 and practice_id=$2', [id, practiceId]);
  if (!pr?.stripe_payment_intent_id) return;
  await settleIntent(await stripe().paymentIntents.retrieve(pr.stripe_payment_intent_id, {}, { stripeAccount: acct }));
}

async function saveCardFromIntent(pr: any, intentId: string, acct: string) {
  const pi = await stripe().paymentIntents.retrieve(intentId, { expand: ['payment_method'] }, { stripeAccount: acct });
  const pm = pi.payment_method as Stripe.PaymentMethod | null;
  if (!pm || !pi.customer || pm.type !== 'card') return;
  const d = await db();
  await d.query(`insert into saved_cards (practice_id, patient_name, patient_contact, stripe_customer_id, payment_method_id, brand, last4, exp_month, exp_year)
    values ($1,$2,$3,$4,$5,$6,$7,$8,$9) on conflict (payment_method_id) do nothing`,
    [pr.practice_id, pr.patient_name, pr.patient_contact, String(pi.customer), pm.id, pm.card?.brand, pm.card?.last4, pm.card?.exp_month, pm.card?.exp_year]);
}
