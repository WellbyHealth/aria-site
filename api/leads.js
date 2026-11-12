// Private CSV export of every saved sign-up: /api/leads?key=<LEADS_ADMIN_KEY>. Add &format=json for JSON.
import { list, get } from '@vercel/blob';

const COLS = ['received_at', 'form', 'email', 'name', 'practice', 'role', 'specialty', 'locations', 'pain', 'phone', 'ref', 'utm_source', 'utm_medium', 'utm_campaign', 'utm', 'referrer', 'landing', 'page', 'country', 'region'];
const csv = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';

export default async function handler(req, res) {
  const want = process.env.LEADS_ADMIN_KEY;
  if (!want || req.query.key !== want) return res.status(404).send('Not found');
  const rows = [];
  let cursor;
  do {
    const page = await list({ prefix: 'leads/', cursor, limit: 1000 });
    for (const b of page.blobs) {
      try {
        const r = await get(b.pathname, { access: 'private' });
        if (r && r.statusCode === 200) rows.push(JSON.parse(await new Response(r.stream).text()));
      } catch (e) { console.error('ARIA_LEADS_READ ' + b.pathname + ' ' + (e && e.message)); }
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  rows.sort((a, b) => String(b.received_at).localeCompare(String(a.received_at)));
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  if (req.query.format === 'json') return res.status(200).json(rows);
  const extra = [...new Set(rows.flatMap(r => Object.keys(r)))].filter(k => !COLS.includes(k));
  const cols = [...COLS, ...extra];
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="aria-leads.csv"');
  return res.status(200).send([cols.join(','), ...rows.map(r => cols.map(c => csv(r[c])).join(','))].join('\n'));
}
