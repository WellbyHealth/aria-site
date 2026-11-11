'use client';
import { useCallback, useEffect, useState } from 'react';
import { usePlaidLink } from 'react-plaid-link';

export default function PlaidLink({ itemId, label = 'Connect a bank or card' }: { itemId?: string; label?: string }) {
  const [token, setToken] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    fetch('/api/plaid/link-token', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ itemId }) })
      .then(r => r.json()).then(j => (j.link_token ? setToken(j.link_token) : setMsg(j.error || 'Could not start Plaid')));
  }, [itemId]);
  const onSuccess = useCallback(async (public_token: string, meta: any) => {
    if (itemId) { location.reload(); return; }
    setMsg('Connecting and importing transactions…');
    const r = await fetch('/api/plaid/exchange', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ public_token, institution: meta?.institution?.name || null }) });
    const j = await r.json();
    if (r.ok) location.reload(); else setMsg(j.error || 'Something went wrong');
  }, [itemId]);
  const { open, ready } = usePlaidLink({ token, onSuccess });
  return <div><button className="btn" disabled={!ready} onClick={() => open()}>{label}</button>{msg && <p className="note">{msg}</p>}</div>;
}
