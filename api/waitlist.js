// Records an Aria waitlist or "talk to us" sign-up from the site's forms.
// Each sign-up is saved as its own JSON file in the private "aria-leads" Blob store (leads/...), so nothing
// depends on log retention. Export them all as CSV from /api/leads?key=LEADS_ADMIN_KEY.
import { put } from '@vercel/blob';
// Every sign-up is written to the function log (Vercel > aria project > Logs, search "ARIA_WAITLIST").
// If LIGHTFIELD_API_KEY is set, the sign-up goes straight into Lightfield (see toLightfield below).
// If the LIGHTFIELD_WEBHOOK_URL (or WAITLIST_WEBHOOK_URL) environment variable is set, the sign-up is
// also forwarded there as JSON, for example to a Lightfield workflow, Zapier or a Google Sheet.
// The site posts text/plain JSON (a "simple" request), so the body may arrive as a string.

// Lightfield: find-or-create the contact by email, add them to the "Aria Website Waitlist" list and log a note
// with what they told us. Needs LIGHTFIELD_API_KEY (scopes: contacts:read/create, lists:update, notes:create).
const LF = 'https://api.lightfield.app/v1';
const LF_LIST = process.env.LIGHTFIELD_LIST_ID || 'lst_cmv5fucj603a8pvo43uae8wp0';
async function lf(method, path, body) {
  const r = await fetch(LF + path, { method, headers: { 'Authorization': 'Bearer ' + process.env.LIGHTFIELD_API_KEY, 'Lightfield-Version': '2026-03-01', 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(method + ' ' + path.split('?')[0] + ' ' + r.status + ' ' + JSON.stringify(j).slice(0, 200));
  return j;
}
async function toLightfield(e) {
  const email = e.email.toLowerCase();
  const found = await lf('GET', '/contacts?limit=1&' + encodeURIComponent('$email[contains]') + '=' + encodeURIComponent(email));
  let id = found && found.data && found.data[0] && found.data[0].id;
  if (!id) {
    const fields = { '$email': [email] };
    const parts = (e.name || '').split(/\s+/).filter(Boolean);
    if (parts.length) fields['$name'] = { firstName: parts[0], lastName: parts.slice(1).join(' ') || undefined };
    if (e.role) fields['$title'] = e.role;
    if (/^\+?[0-9 ().-]{7,}$/.test(e.phone || '')) { const d = e.phone.replace(/[^0-9+]/g, ''); fields['$phone'] = [d.startsWith('+') ? d : (d.length === 10 ? '+1' + d : '+' + d)]; }
    const memo = ['Aria website ' + (e.form || 'waitlist'), e.practice && 'Practice: ' + e.practice, e.specialty && 'Specialty: ' + e.specialty].filter(Boolean).join(' · ');
    fields['$notes'] = memo;
    try { id = (await lf('POST', '/contacts', { fields })).id; }
    catch (err) { delete fields['$phone']; id = (await lf('POST', '/contacts', { fields })).id; }
  }
  await lf('POST', '/lists/' + LF_LIST, { relationships: { '$contacts': { add: id } } });
  const lines = Object.entries(e).filter(([k, v]) => v && k !== 'email').map(([k, v]) => '- **' + k.replace(/_/g, ' ') + ':** ' + String(v).replace(/\n/g, ' '));
  await lf('POST', '/notes', { fields: { '$title': 'Website sign-up (' + (e.form || 'waitlist') + ')', '$content': lines.join('\n') }, relationships: { '$contact': id } });
  return id;
}

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
  let saved = false;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const id = entry.received_at.replace(/[:.]/g, '-') + '-' + Math.random().toString(36).slice(2, 8);
      await put(`leads/${id}.json`, JSON.stringify(entry), { access: 'private', contentType: 'application/json', addRandomSuffix: false });
      saved = true;
    } catch (e) {
      console.error('ARIA_WAITLIST_SAVE_FAILED ' + (e && e.message));
    }
  }
  const hook = process.env.LIGHTFIELD_WEBHOOK_URL || process.env.WAITLIST_WEBHOOK_URL;
  if (hook) {
    try {
      const r = await fetch(hook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry) });
      if (!r.ok) console.error('ARIA_WAITLIST_FORWARD_STATUS ' + r.status);
    } catch (e) {
      console.error('ARIA_WAITLIST_FORWARD_FAILED ' + (e && e.message));
    }
  }
  let crm = false;
  if (process.env.LIGHTFIELD_API_KEY) {
    try { await toLightfield(entry); crm = true; }
    catch (e) { console.error('ARIA_WAITLIST_LIGHTFIELD_FAILED ' + (e && e.message)); }
  }
  return res.status(200).json({ ok: true, saved, crm });
}
