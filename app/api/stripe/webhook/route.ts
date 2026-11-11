import { NextResponse } from 'next/server';
import { stripe, handleEvent } from '@/lib/stripe';

// Connect webhook: subscribe the endpoint to events on connected accounts.
export async function POST(req: Request) {
  const raw = await req.text();
  const sig = req.headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) return NextResponse.json({ error: 'not configured' }, { status: 400 });
  let event;
  try { event = stripe().webhooks.constructEvent(raw, sig, secret); }
  catch { return NextResponse.json({ error: 'bad signature' }, { status: 400 }); }
  await handleEvent(event);
  return NextResponse.json({ received: true });
}
