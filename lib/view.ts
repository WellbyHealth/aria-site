// What every view needs: the session, filters, loaded data, KPIs and alerts.
import { requireSession } from './auth';
import { parseFilters } from './filters';
import { load, computeKpis } from './metrics';
import { buildAlerts, syncAlerts } from './alerts';

export async function view(searchParams: Promise<Record<string, string | string[] | undefined>>) {
  const s = await requireSession();
  const f = parseFilters(await searchParams);
  const D = await load(s.practiceId, f);
  const K = computeKpis(D);
  const unfiltered = !f.site && !f.payer && f.range === '30d';
  const alerts = await syncAlerts(s.practiceId, buildAlerts(D, K.kpis, K.low), unfiltered);
  const kpi = (key: string) => K.kpis.find(k => k.key === key)!;
  const scope = [f.label, f.site ? D.locations.find((l: any) => l.id === f.site)?.name : null, f.payer].filter(Boolean).join(' · ');
  return { s, f, D, K, alerts, kpi, scope };
}
export type View = Awaited<ReturnType<typeof view>>;
