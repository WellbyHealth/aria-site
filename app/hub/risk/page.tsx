import { revalidatePath } from 'next/cache';
import { view } from '@/lib/view';
import { requireSession } from '@/lib/auth';
import { db, audit } from '@/lib/db';
import { Card, AlertList, NeedsSource } from '@/components/ui';

async function saveThresholds(form: FormData) {
  'use server';
  const s = await requireSession();
  if (s.role === 'viewer') return;
  const num = (k: string, lo: number, hi: number, dflt: number) => { const v = Number(form.get(k)); return Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : dflt; };
  const v = { denial: Math.round(num('denial', 0, 100, 8) * 100), dtp: Math.round(num('dtp', 1, 365, 30)), staff: Math.round(num('staff', 0, 100, 60) * 100), unmatched: Math.round(num('unmatched', 1, 60, 5)) };
  const d = await db();
  await d.query(`insert into practice_settings (practice_id, denial_rate_max_bps, days_to_pay_max, staff_cost_max_bps, unmatched_days) values ($1,$2,$3,$4,$5)
    on conflict (practice_id) do update set denial_rate_max_bps=$2, days_to_pay_max=$3, staff_cost_max_bps=$4, unmatched_days=$5, updated_at=now()`, [s.practiceId, v.denial, v.dtp, v.staff, v.unmatched]);
  await audit(s.practiceId, s.userId, 'settings.thresholds', v);
  revalidatePath('/hub/risk');
}

export default async function Risk({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const { s, D, alerts, scope } = await view(searchParams);
  const S = D.settings;
  const off = s.role === 'viewer';
  return (<>
    <div className="head"><div><h1>Operations and risk</h1><p>Every open alert, and the thresholds behind them · {scope}</p></div></div>
    <div className="g">
      <Card span={8} title="Open alerts" foot={`${alerts.filter(a => a.tone === 'alert').length} off target · ${alerts.filter(a => a.tone === 'watch').length} near a limit`}>
        <AlertList alerts={alerts} owner={D.owner} />
      </Card>
      <Card span={4} title="Thresholds" foot="A breach raises an alert; within 10% shows as near limit">
        <form action={saveThresholds} className="form">
          <label>Denial rate above (%)<input name="denial" type="number" step="0.5" min={0} max={100} defaultValue={S.denial_rate_max_bps / 100} disabled={off} /></label>
          <label>Days to pay above<input name="dtp" type="number" min={1} max={365} defaultValue={S.days_to_pay_max} disabled={off} /></label>
          <label>Payroll above (% of collections)<input name="staff" type="number" step="0.5" min={0} max={100} defaultValue={S.staff_cost_max_bps / 100} disabled={off} /></label>
          <label>Flag unexplained insurer deposits after (days)<input name="unmatched" type="number" min={1} max={60} defaultValue={S.unmatched_days} disabled={off} /></label>
          <button className="btn" disabled={off}>Save thresholds</button>
          <p className="foot">Cash floor and days cash target are set on <a href="/hub/cash">Cash and forecast</a>.</p>
        </form>
      </Card>
      <NeedsSource system="Practice management system, credentialing and HR records" examples="EHR scheduling, your credentialing tracker, insurance renewals" unlocks={['Appointments booked for the next 2–4 weeks vs last year', 'No-show and same-day cancellation rate', 'Days to third-next-available appointment', 'Referrals in and leakage out of network', 'E/M coding outliers vs peers and CMS norms', 'Credit balances and overpayments older than 60 days', 'Credentialing and payer enrollment expiring in 90 days', 'Payer audits, recoupments and open appeals', 'Malpractice claims and insurance renewal dates']} />
    </div>
  </>);
}
