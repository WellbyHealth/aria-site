// Plaid: Link, token exchange, transactions sync with cursors, balances, webhook verification.
import crypto from 'node:crypto';
import { Configuration, CountryCode, PlaidApi, PlaidEnvironments, Products, type Transaction } from 'plaid';
import { db, audit } from './db';
import { encrypt, decrypt } from './crypto';
import { classify } from './classify';

export const plaidConfigured = () => Boolean(process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET);

let client: PlaidApi | null = null;
export function plaid(): PlaidApi {
  if (!plaidConfigured()) throw new Error('Plaid keys are not set');
  if (!client) {
    const env = (process.env.PLAID_ENV || 'sandbox') as keyof typeof PlaidEnvironments;
    client = new PlaidApi(new Configuration({
      basePath: PlaidEnvironments[env],
      baseOptions: { headers: { 'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID!, 'PLAID-SECRET': process.env.PLAID_SECRET!, 'Plaid-Version': '2020-09-14' } },
    }));
  }
  return client;
}

const appUrl = () => process.env.APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

export async function createLinkToken(practiceId: string, userId: string, itemRowId?: string) {
  const base = {
    user: { client_user_id: `${practiceId}:${userId}` },
    client_name: 'Aria CFO Hub',
    language: 'en',
    country_codes: [CountryCode.Us],
    webhook: `${appUrl()}/api/plaid/webhook`,
  };
  if (itemRowId) {
    const d = await db();
    const [item] = await d.query('select access_token_enc from plaid_items where id=$1 and practice_id=$2', [itemRowId, practiceId]);
    if (!item) throw new Error('No such bank connection');
    const r = await plaid().linkTokenCreate({ ...base, access_token: decrypt(item.access_token_enc) });
    return r.data.link_token;
  }
  const r = await plaid().linkTokenCreate({ ...base, products: [Products.Transactions], optional_products: [Products.Auth], transactions: { days_requested: 730 } });
  return r.data.link_token;
}

export async function exchangePublicToken(practiceId: string, userId: string, publicToken: string, institutionName: string | null) {
  const r = await plaid().itemPublicTokenExchange({ public_token: publicToken });
  const d = await db();
  const [item] = await d.query(
    `insert into plaid_items (practice_id, item_id, institution_name, access_token_enc) values ($1,$2,$3,$4)
     on conflict (item_id) do update set access_token_enc = excluded.access_token_enc, status = 'ok', error_code = null
     returning id`,
    [practiceId, r.data.item_id, institutionName, encrypt(r.data.access_token)]);
  await audit(practiceId, userId, 'plaid.item_linked', { item_id: r.data.item_id, institution: institutionName });
  await refreshBalances(item.id);
  await syncItem(item.id);
  return item.id as string;
}

export async function refreshBalances(itemRowId: string) {
  const d = await db();
  const [item] = await d.query('select * from plaid_items where id=$1', [itemRowId]);
  if (!item) return;
  const r = await plaid().accountsBalanceGet({ access_token: decrypt(item.access_token_enc) });
  for (const a of r.data.accounts) {
    await d.query(
      `insert into bank_accounts (practice_id, plaid_item_id, account_id, name, mask, type, subtype, current_cents, available_cents, balance_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9, now())
       on conflict (account_id) do update set name=excluded.name, current_cents=excluded.current_cents, available_cents=excluded.available_cents, balance_at=now()`,
      [item.practice_id, item.id, a.account_id, a.official_name || a.name, a.mask, a.type, a.subtype,
       a.balances.current == null ? null : Math.round(a.balances.current * 100),
       a.balances.available == null ? null : Math.round(a.balances.available * 100)]);
  }
}

export function toLedger(t: Transaction) {
  const amount = -Math.round(t.amount * 100); // Plaid: positive = money out
  const text = [t.merchant_name, t.name, t.original_description].filter(Boolean).join(' ');
  const { kind, payer } = classify(amount, text);
  return { source_id: t.transaction_id, account_id: t.account_id, posted_on: t.date, amount_cents: amount, description: t.name, merchant: t.merchant_name ?? null,
           category: t.personal_finance_category?.primary ?? null, kind, payer, pending: t.pending };
}

export async function syncItem(itemRowId: string) {
  const d = await db();
  const [item] = await d.query('select * from plaid_items where id=$1', [itemRowId]);
  if (!item || item.status === 'removed') return { added: 0, modified: 0, removed: 0 };
  const token = decrypt(item.access_token_enc);
  const startCursor: string | undefined = item.cursor || undefined;
  let cursor = startCursor, added = 0, modified = 0, removed = 0;
  for (let restart = 0; restart < 3; restart++) {
    const batch: { added: Transaction[]; modified: Transaction[]; removed: string[] } = { added: [], modified: [], removed: [] };
    cursor = startCursor;
    try {
      let more = true;
      while (more) {
        const r = await plaid().transactionsSync({ access_token: token, cursor, count: 500 });
        batch.added.push(...r.data.added); batch.modified.push(...r.data.modified); batch.removed.push(...r.data.removed.map(x => x.transaction_id));
        cursor = r.data.next_cursor; more = r.data.has_more;
      }
    } catch (e: any) {
      const code = e?.response?.data?.error_code;
      if (code === 'TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION') continue; // restart from the saved cursor
      if (code === 'ITEM_LOGIN_REQUIRED') { await d.query(`update plaid_items set status='reconnect', error_code=$2 where id=$1`, [item.id, code]); return { added, modified, removed }; }
      throw e;
    }
    for (const t of [...batch.added, ...batch.modified]) {
      const e = toLedger(t);
      await d.query(
        `insert into ledger_entries (practice_id, source, source_id, bank_account_id, location_id, posted_on, amount_cents, description, merchant, category, kind, payer, pending)
         select $1,'plaid',$2, ba.id, ba.location_id, $4,$5,$6,$7,$8,$9,$10,$11 from bank_accounts ba where ba.account_id = $3
         on conflict (source, source_id) do update set posted_on=excluded.posted_on, amount_cents=excluded.amount_cents, description=excluded.description,
           merchant=excluded.merchant, category=excluded.category, kind=excluded.kind, payer=excluded.payer, pending=excluded.pending`,
        [item.practice_id, e.source_id, e.account_id, e.posted_on, e.amount_cents, e.description, e.merchant, e.category, e.kind, e.payer, e.pending]);
    }
    for (const id of batch.removed) await d.query(`delete from ledger_entries where source='plaid' and source_id=$1`, [id]);
    added = batch.added.length; modified = batch.modified.length; removed = batch.removed.length;
    break;
  }
  await d.query(`update plaid_items set cursor=$2, last_synced_at=now(), status='ok', error_code=null where id=$1`, [item.id, cursor]);
  return { added, modified, removed };
}

// Webhook verification: Plaid signs each webhook with an ES256 JWT in the Plaid-Verification header.
const keyCache = new Map<string, crypto.KeyObject>();
export async function verifyWebhook(rawBody: string, jwt: string | null): Promise<boolean> {
  if (!jwt) return false;
  const [h64, p64, s64] = jwt.split('.');
  if (!h64 || !p64 || !s64) return false;
  const header = JSON.parse(Buffer.from(h64, 'base64url').toString());
  if (header.alg !== 'ES256' || !header.kid) return false;
  let key = keyCache.get(header.kid);
  if (!key) {
    const r = await plaid().webhookVerificationKeyGet({ key_id: header.kid });
    key = crypto.createPublicKey({ key: r.data.key as any, format: 'jwk' });
    keyCache.set(header.kid, key);
  }
  const ok = crypto.verify('sha256', Buffer.from(`${h64}.${p64}`), { key, dsaEncoding: 'ieee-p1363' }, Buffer.from(s64, 'base64url'));
  if (!ok) return false;
  const payload = JSON.parse(Buffer.from(p64, 'base64url').toString());
  if (Date.now() / 1000 - payload.iat > 300) return false;
  const hash = crypto.createHash('sha256').update(rawBody).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(String(payload.request_body_sha256)));
}
