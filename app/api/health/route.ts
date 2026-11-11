import { db, isDemo } from '@/lib/db';
export const dynamic = 'force-dynamic';
export async function GET() {
  const t = Date.now();
  try {
    const d = await db();
    const [r] = await d.query<{ n: number }>('select count(*)::int n from practices');
    return Response.json({ ok: true, demo: isDemo(), practices: r.n, ms: Date.now() - t });
  } catch (e: any) {
    return Response.json({ ok: false, error: String(e?.message || e).slice(0, 200) }, { status: 500 });
  }
}
