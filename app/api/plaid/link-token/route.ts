import { NextResponse } from 'next/server';
import { session } from '@/lib/auth';
import { createLinkToken, plaidConfigured } from '@/lib/plaid';

export async function POST(req: Request) {
  const s = await session();
  if (!s) return NextResponse.json({ error: 'Sign in first' }, { status: 401 });
  if (!plaidConfigured()) return NextResponse.json({ error: 'Plaid keys are not set' }, { status: 503 });
  const { itemId } = await req.json().catch(() => ({}));
  try { return NextResponse.json({ link_token: await createLinkToken(s.practiceId, s.userId, itemId) }); }
  catch (e: any) { return NextResponse.json({ error: e?.response?.data?.error_message || e.message }, { status: 400 }); }
}
