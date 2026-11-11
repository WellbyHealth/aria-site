import { NextResponse } from 'next/server';
import { session } from '@/lib/auth';
import { exchangePublicToken } from '@/lib/plaid';
import { matchPractice } from '@/lib/match';

export async function POST(req: Request) {
  const s = await session();
  if (!s) return NextResponse.json({ error: 'Sign in first' }, { status: 401 });
  if (s.role === 'viewer') return NextResponse.json({ error: 'Only owners and managers can connect banks' }, { status: 403 });
  const { public_token, institution } = await req.json();
  if (typeof public_token !== 'string') return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  try {
    const id = await exchangePublicToken(s.practiceId, s.userId, public_token, institution ?? null);
    await matchPractice(s.practiceId);
    return NextResponse.json({ ok: true, id });
  } catch (e: any) { return NextResponse.json({ error: e?.response?.data?.error_message || e.message }, { status: 400 }); }
}
