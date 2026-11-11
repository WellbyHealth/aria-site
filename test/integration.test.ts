import { describe, it, expect, vi, beforeAll } from 'vitest';
import crypto from 'node:crypto';
import { PlaidApi } from 'plaid';

const create = vi.fn().mockResolvedValue({ id: 'cs_test_1', url: 'https://checkout.stripe.com/c/pay/cs_test_1' });
vi.mock('stripe', () => ({ default: class { checkout = { sessions: { create } }; } }));

process.env.PLAID_CLIENT_ID = 'test'; process.env.PLAID_SECRET = 'test';
process.env.STRIPE_SECRET_KEY = 'sk_test_x'; process.env.PLATFORM_FEE_BPS = '100';

const { db } = await import('../lib/db');
const plaidLib = await import('../lib/plaid');
const stripeLib = await import('../lib/stripe');
const { hubData } = await import('../lib/weekly');

describe('demo database and weekly list', () => {
  it('seeds a practice, matches most deposits and builds the list', async () => {
    const d = await db();
    const [p] = await d.query(`select id from practices`);
    const [{ total, matched }] = await d.query(`select count(*)::int total, count(matched_entry_id)::int matched from remittances where practice_id=$1`, [p.id]);
    expect(total).toBeGreaterThan(50);
    expect(matched / total).toBeGreaterThan(0.95);
    const h = await hubData(p.id);
    expect(h.weeks).toHaveLength(13);
    expect(h.cash).toBe(8_642_000 + 2_315_000);
    expect(h.items.some(i => /denied claims/.test(i.title))).toBe(true);
    expect(h.items.some(i => /without a remittance/.test(i.title))).toBe(true);
  });
});

describe('Plaid sync', () => {
  let practiceId = '';
  beforeAll(async () => {
    const d = await db();
    [{ id: practiceId }] = await d.query(`insert into practices (name) values ('Sync Test') returning id`);
  });
  it('exchanges a token, stores it encrypted, imports and reclassifies transactions', async () => {
    vi.spyOn(PlaidApi.prototype, 'itemPublicTokenExchange').mockResolvedValue({ data: { access_token: 'access-sandbox-abc', item_id: 'item-1' } } as any);
    vi.spyOn(PlaidApi.prototype, 'accountsBalanceGet').mockResolvedValue({ data: { accounts: [{ account_id: 'acc-1', name: 'Checking', mask: '0000', type: 'depository', subtype: 'checking', balances: { current: 12345.67, available: 12000 } }] } } as any);
    const sync = vi.spyOn(PlaidApi.prototype, 'transactionsSync')
      .mockResolvedValueOnce({ data: { added: [{ transaction_id: 't1', account_id: 'acc-1', amount: -812.5, date: '2026-11-03', name: 'CIGNA HCCLAIMPMT', merchant_name: null, pending: false }], modified: [], removed: [], next_cursor: 'c1', has_more: true } } as any)
      .mockResolvedValueOnce({ data: { added: [{ transaction_id: 't2', account_id: 'acc-1', amount: 4610, date: '2026-11-04', name: 'GUSTO NET PAY', merchant_name: 'Gusto', pending: false }], modified: [], removed: [], next_cursor: 'c2', has_more: false } } as any);
    const id = await plaidLib.exchangePublicToken(practiceId, null as any, 'public-sandbox', 'Test Bank');
    const d = await db();
    const [item] = await d.query(`select * from plaid_items where id=$1`, [id]);
    expect(item.access_token_enc).not.toContain('access-sandbox');
    expect(item.cursor).toBe('c2');
    expect(sync).toHaveBeenCalledTimes(2);
    const rows = await d.query(`select source_id, amount_cents, kind, payer from ledger_entries where practice_id=$1 order by source_id`, [practiceId]);
    expect(rows).toEqual([{ source_id: 't1', amount_cents: 81250, kind: 'insurer_deposit', payer: 'Cigna' }, { source_id: 't2', amount_cents: -461000, kind: 'payroll', payer: null }]);
    const [acct] = await d.query(`select current_cents from bank_accounts where account_id='acc-1'`);
    expect(Number(acct.current_cents)).toBe(1234567);
  });
  it('handles removed transactions and marks items that need sign-in', async () => {
    const d = await db();
    const [item] = await d.query(`select id from plaid_items where item_id='item-1'`);
    vi.spyOn(PlaidApi.prototype, 'transactionsSync').mockResolvedValueOnce({ data: { added: [], modified: [], removed: [{ transaction_id: 't1' }], next_cursor: 'c3', has_more: false } } as any);
    await plaidLib.syncItem(item.id);
    expect((await d.query(`select count(*)::int n from ledger_entries where source_id='t1'`))[0].n).toBe(0);
    vi.spyOn(PlaidApi.prototype, 'transactionsSync').mockRejectedValueOnce({ response: { data: { error_code: 'ITEM_LOGIN_REQUIRED' } } });
    await plaidLib.syncItem(item.id);
    expect((await d.query(`select status from plaid_items where id=$1`, [item.id]))[0].status).toBe('reconnect');
  });
  it('verifies webhook signatures and rejects tampered bodies', async () => {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
    vi.spyOn(PlaidApi.prototype, 'webhookVerificationKeyGet').mockResolvedValue({ data: { key: { ...publicKey.export({ format: 'jwk' }), kid: 'k1', alg: 'ES256', use: 'sig' } } } as any);
    const body = JSON.stringify({ webhook_type: 'TRANSACTIONS', webhook_code: 'SYNC_UPDATES_AVAILABLE', item_id: 'item-1' });
    const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const h = b64({ alg: 'ES256', kid: 'k1', typ: 'JWT' });
    const p = b64({ iat: Math.floor(Date.now() / 1000), request_body_sha256: crypto.createHash('sha256').update(body).digest('hex') });
    const sig = crypto.sign('sha256', Buffer.from(`${h}.${p}`), { key: privateKey, dsaEncoding: 'ieee-p1363' }).toString('base64url');
    expect(await plaidLib.verifyWebhook(body, `${h}.${p}.${sig}`)).toBe(true);
    expect(await plaidLib.verifyWebhook(body.replace('item-1', 'item-2'), `${h}.${p}.${sig}`)).toBe(false);
    expect(await plaidLib.verifyWebhook(body, null)).toBe(false);
  });
});

describe('Stripe patient payments', () => {
  it('creates a direct-charge checkout on the connected account with the platform fee', async () => {
    const d = await db();
    const [p] = await d.query(`select id from practices where name='Riverside Family Medicine'`);
    const row: any = await stripeLib.createPaymentRequest({ practiceId: p.id, userId: null as any, practiceName: 'Riverside', locationId: null, patientName: 'Ana Ruiz', patientContact: 'ana@example.com', amountCents: 25000 });
    const [params, opts] = create.mock.calls[0];
    expect(opts).toEqual({ stripeAccount: 'acct_demo' });
    expect(params.payment_intent_data.application_fee_amount).toBe(250);
    expect(params.line_items[0].price_data.unit_amount).toBe(25000);
    expect(JSON.stringify(params)).not.toMatch(/Ana Ruiz|ana@example/);
    expect(row.statement_ref ?? row.statementRef).toMatch(/^ARIA-/);
    await expect(stripeLib.createPaymentRequest({ practiceId: p.id, userId: null as any, practiceName: 'Riverside', locationId: null, patientName: 'Ana Ruiz', patientContact: 'Follow-up for 99213', amountCents: 25000 })).rejects.toThrow(/health information/);
  });
  it('marks a request paid and adds it to the ledger once', async () => {
    const d = await db();
    const [p] = await d.query(`select id from practices where name='Riverside Family Medicine'`);
    await d.query(`insert into payment_requests (practice_id, statement_ref, patient_name, amount_cents, stripe_session_id) values ($1,'ARIA-TEST01','Ana Ruiz',25000,'cs_paid_1')`, [p.id]);
    const ev = { type: 'checkout.session.completed', data: { object: { id: 'cs_paid_1', payment_status: 'paid' } } } as any;
    await stripeLib.handleEvent(ev); await stripeLib.handleEvent(ev);
    const [pr] = await d.query(`select status from payment_requests where stripe_session_id='cs_paid_1'`);
    expect(pr.status).toBe('paid');
    expect((await d.query(`select count(*)::int n from ledger_entries where source='stripe' and source_id='cs:cs_paid_1'`))[0].n).toBe(1);
  });
});
