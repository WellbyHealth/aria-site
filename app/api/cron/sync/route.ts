import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { plaidConfigured, syncItem, refreshBalances } from '@/lib/plaid';
import { matchPractice } from '@/lib/match';

// Daily safety net in case a webhook was missed. Vercel Cron calls this with CRON_SECRET.
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!plaidConfigured()) return NextResponse.json({ skipped: 'plaid not configured' });
  const d = await db();
  const items = await d.query(`select id, practice_id from plaid_items where status='ok'`);
  const results = [];
  for (const it of items) {
    try { const r = await syncItem(it.id); await refreshBalances(it.id); results.push({ id: it.id, ...r }); }
    catch (e: any) { results.push({ id: it.id, error: e?.response?.data?.error_code || e.message }); }
  }
  for (const p of new Set(items.map(i => i.practice_id))) await matchPractice(p);
  return NextResponse.json({ items: results.length, results });
}
