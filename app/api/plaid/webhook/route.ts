import { NextResponse } from 'next/server';
import { db, audit } from '@/lib/db';
import { verifyWebhook, syncItem, refreshBalances } from '@/lib/plaid';
import { matchPractice } from '@/lib/match';

export async function POST(req: Request) {
  const raw = await req.text();
  if (!(await verifyWebhook(raw, req.headers.get('plaid-verification')))) return NextResponse.json({ error: 'bad signature' }, { status: 401 });
  const body = JSON.parse(raw);
  const d = await db();
  const [item] = await d.query('select id, practice_id from plaid_items where item_id=$1', [body.item_id]);
  if (!item) return NextResponse.json({ ok: true });
  if (body.webhook_type === 'TRANSACTIONS' && body.webhook_code === 'SYNC_UPDATES_AVAILABLE') {
    await syncItem(item.id); await refreshBalances(item.id); await matchPractice(item.practice_id);
  }
  if (body.webhook_type === 'ITEM' && ['ERROR', 'PENDING_EXPIRATION', 'PENDING_DISCONNECT'].includes(body.webhook_code)) {
    await d.query(`update plaid_items set status='reconnect', error_code=$2 where id=$1`, [item.id, body.error?.error_code || body.webhook_code]);
  }
  if (body.webhook_type === 'ITEM' && body.webhook_code === 'LOGIN_REPAIRED') await d.query(`update plaid_items set status='ok', error_code=null where id=$1`, [item.id]);
  await audit(item.practice_id, null, 'plaid.webhook', { type: body.webhook_type, code: body.webhook_code });
  return NextResponse.json({ ok: true });
}
