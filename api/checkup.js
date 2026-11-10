// Records a Practice Money Checkup request. Every request is written to the function log
// (Vercel > project > Logs, search "CFO_CHECKUP"). If CHECKUP_WEBHOOK_URL is set (for example
// a Lightfield workflow or Zapier webhook), the request is also forwarded there as JSON.
export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ ok: false }); }
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
  const entry = {};
  for (const [k, v] of Object.entries(body).slice(0, 30)) if (/^[a-z_]{1,40}$/i.test(k)) entry[k] = String(v ?? '').trim().slice(0, 1000);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(entry.email || '')) return res.status(400).json({ ok: false, error: 'email' });
  entry.received_at = new Date().toISOString();
  console.log('CFO_CHECKUP ' + JSON.stringify(entry));
  const hook = process.env.CHECKUP_WEBHOOK_URL;
  if (hook) { try { await fetch(hook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry) }); } catch (e) { console.error('CFO_CHECKUP_FORWARD_FAILED ' + (e && e.message)); } }
  return res.status(200).json({ ok: true });
}
