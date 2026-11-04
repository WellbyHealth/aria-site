// Records an Aria waitlist or "talk to us" sign-up from the site's forms.
// Every sign-up is written to the function log (Vercel > aria project > Logs, search "ARIA_WAITLIST").
// If the LIGHTFIELD_WEBHOOK_URL (or WAITLIST_WEBHOOK_URL) environment variable is set, the sign-up is
// also forwarded there as JSON, for example to a Lightfield workflow, Zapier or a Google Sheet.
// The site posts text/plain JSON (a "simple" request), so the body may arrive as a string.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false });
  }
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
  const entry = {};
  for (const [k, v] of Object.entries(body).slice(0, 30)) {
    if (/^[a-z_]{1,40}$/i.test(k)) entry[k] = String(v ?? '').trim().slice(0, 500);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(entry.email || '')) {
    return res.status(400).json({ ok: false, error: 'email' });
  }
  entry.received_at = new Date().toISOString();
  entry.country = String(req.headers['x-vercel-ip-country'] || '');
  entry.region = String(req.headers['x-vercel-ip-country-region'] || '');
  console.log('ARIA_WAITLIST ' + JSON.stringify(entry));
  const hook = process.env.LIGHTFIELD_WEBHOOK_URL || process.env.WAITLIST_WEBHOOK_URL;
  if (hook) {
    try {
      const r = await fetch(hook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry) });
      if (!r.ok) console.error('ARIA_WAITLIST_FORWARD_STATUS ' + r.status);
    } catch (e) {
      console.error('ARIA_WAITLIST_FORWARD_FAILED ' + (e && e.message));
    }
  }
  return res.status(200).json({ ok: true });
}
