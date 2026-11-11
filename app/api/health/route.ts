import { db, isDemo } from '@/lib/db';
import { plaid, plaidConfigured } from '@/lib/plaid';
import { CountryCode } from 'plaid';
export const dynamic = 'force-dynamic';
export async function GET() {
  const t = Date.now();
  try {
    const d = await db();
    const [r] = await d.query<{ n: number }>('select count(*)::int n from practices');
    let plaidStatus = plaidConfigured() ? 'keys set' : 'not set';
    if (plaidConfigured()) {
      try { await plaid().institutionsGetById({ institution_id: 'ins_109508', country_codes: [CountryCode.Us] }); plaidStatus = `ok (${process.env.PLAID_ENV || 'sandbox'})`; }
      catch (e: any) { plaidStatus = 'error: ' + (e?.response?.data?.error_code || e?.message || 'unknown'); }
    }
    return Response.json({ ok: true, demo: isDemo(), practices: r.n, plaid: plaidStatus, ms: Date.now() - t });
  } catch (e: any) {
    return Response.json({ ok: false, error: String(e?.message || e).slice(0, 200) }, { status: 500 });
  }
}
