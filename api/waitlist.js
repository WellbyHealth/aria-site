// Records a waitlist signup. Every signup is written to the function log
// (Vercel > Project > Logs, search "KITH_WAITLIST"). If WAITLIST_WEBHOOK_URL is
// set, the signup is also forwarded there (for example a CRM or Zapier webhook).
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false });
  }
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body && typeof body === 'object' ? body : {};
  const clean = (v) => String(v ?? '').trim().slice(0, 200);
  const entry = {
    email: clean(body.email),
    name: clean(body.name),
    agency: clean(body.agency),
    role: clean(body.role),
    form: clean(body.form),
    page: clean(body.page),
    at: new Date().toISOString(),
  };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(entry.email)) {
    return res.status(400).json({ ok: false, error: 'email' });
  }
  console.log('KITH_WAITLIST ' + JSON.stringify(entry));
  const hook = process.env.WAITLIST_WEBHOOK_URL;
  if (hook) {
    try {
      await fetch(hook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry) });
    } catch (e) {
      console.error('KITH_WAITLIST_FORWARD_FAILED ' + (e && e.message));
    }
  }
  return res.status(200).json({ ok: true });
}
