import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/auth';
import { db, audit } from '@/lib/db';
import { parse835 } from '@/lib/era';
import { matchPractice } from '@/lib/match';
import { usd } from '@/lib/money';
import { fmt } from '@/lib/weekly';

export const dynamic = 'force-dynamic';
async function upload(form: FormData) {
  'use server';
  const s = await requireSession(); const d = await db();
  const files = form.getAll('files').filter((f): f is File => typeof f === 'object' && 'text' in f && f.size > 0);
  let added = 0;
  try {
    for (const f of files) {
      if (f.size > 5_000_000) throw new Error(`${f.name} is larger than 5 MB`);
      for (const r of parse835(await f.text())) {
        const [row] = await d.query(`insert into remittances (practice_id, payer, trace_number, paid_on, total_cents, method, file_name) values ($1,$2,$3,$4,$5,$6,$7) on conflict (practice_id, trace_number) do nothing returning id`,
          [s.practiceId, r.payer || 'Unknown payer', r.traceNumber, r.paidOn, r.totalCents, r.method, f.name]);
        if (!row) continue;
        added++;
        for (const c of r.claims) await d.query(`insert into remittance_claims (remittance_id, claim_ref, status_code, billed_cents, paid_cents, patient_resp_cents, adjustments, received_on, rendering_provider) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [row.id, c.claimRef, c.statusCode, c.billedCents, c.paidCents, c.patientRespCents, JSON.stringify(c.adjustments), c.receivedOn, c.renderingProvider]);
      }
    }
  } catch (e: any) { redirect('/hub/remittances?err=' + encodeURIComponent(e.message)); }
  const m = await matchPractice(s.practiceId);
  await audit(s.practiceId, s.userId, 'era.uploaded', { files: files.length, added, matched: m.matched });
  revalidatePath('/hub/remittances');
  redirect(`/hub/remittances?added=${added}&matched=${m.matched}`);
}
export default async function Remittances({ searchParams }: { searchParams: Promise<{ err?: string; added?: string; matched?: string; all?: string }> }) {
  const sp = await searchParams;
  const s = await requireSession(); const d = await db();
  const rows = await d.query(`select r.*, to_char(r.paid_on,'YYYY-MM-DD') paid, (select count(*)::int from remittance_claims c where c.remittance_id=r.id) claims,
     (select count(*)::int from remittance_claims c where c.remittance_id=r.id and c.paid_cents=0 and c.status_code in ('4','22')) denied,
     (select to_char(e.posted_on,'YYYY-MM-DD') from ledger_entries e where e.id=r.matched_entry_id) deposited
     from remittances r where r.practice_id=$1 order by r.paid_on desc nulls last limit $2`, [s.practiceId, sp.all ? 1000 : 15]);
  const [tot] = await d.query(`select count(*)::int n, count(matched_entry_id)::int m from remittances where practice_id=$1`, [s.practiceId]);
  const unmatchedDeposits = await d.query(`select to_char(posted_on,'YYYY-MM-DD') d, payer, description, amount_cents from ledger_entries where practice_id=$1 and kind='insurer_deposit' and matched_remittance_id is null order by posted_on desc limit 20`, [s.practiceId]);
  const matched = tot.m;
  return (<>
    <div className="head"><div><h1>Insurer payments</h1><p>Upload ERA (835) files from your clearinghouse. We match each one to the deposit in your bank.</p></div></div>
    {sp.err && <div className="banner err">{sp.err}</div>}
    {sp.added && <div className="banner ok">Added {sp.added} remittances and matched {sp.matched} to bank deposits.</div>}
    <div className="kpis">
      <div className="kpi"><span className="lbl">Matched to a deposit</span><div className="v">{tot.n ? Math.round((matched / tot.n) * 100) : 0}%</div><span className="foot">{matched} of {tot.n} remittances</span></div>
      <div className="kpi"><span className="lbl">Deposits with no ERA</span><div className="v">{unmatchedDeposits.length}</div><span className="foot">{usd(unmatchedDeposits.reduce((t, r) => t + Number(r.amount_cents), 0))}</span></div>
      <div className="kpi"><span className="lbl">Denied claims</span><div className="v">{rows.reduce((t, r) => t + r.denied, 0)}</div><span className="foot">Paid nothing</span></div>
    </div>
    <div className="g">
      <section className="card s7"><header><h2>Remittances</h2></header>
        <div className="tw"><table><thead><tr><th>Paid</th><th>Payer</th><th>Claims</th><th>Bank</th><th className="n">Total</th></tr></thead><tbody>
          {rows.map(r => <tr key={r.id}><td>{r.paid ? fmt(r.paid) : '–'}</td><td>{r.payer}<br /><span className="note">Trace {r.trace_number}</span></td><td>{r.claims}{r.denied ? <> <span className="chip bad">{r.denied} denied</span></> : null}</td>
            <td>{r.deposited ? <span className="chip ok">Deposited {fmt(r.deposited)}</span> : <span className="chip warn">Not found yet</span>}</td><td className="n">{usd(r.total_cents)}</td></tr>)}
          {!rows.length && <tr><td colSpan={5} className="note">No ERA files yet.</td></tr>}
        </tbody></table></div>
        {!sp.all && tot.n > rows.length && <p className="note" style={{ marginTop: 12 }}>Showing the latest {rows.length} of {tot.n}. <a href="/hub/remittances?all=1">Show all</a></p>}</section>
      <div className="s5" style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
        <section className="card"><header><h2>Upload ERA files</h2></header>
          <form action={upload} className="form"><input type="file" name="files" multiple accept=".835,.txt,.edi,.x12" required /><button className="btn">Upload and match</button>
            <p className="note">Files stay in Aria’s HIPAA-covered systems. We keep payer, trace number, dates, amounts, reason codes and the rendering provider. Patient names in the file are not stored.</p></form></section>
        <section className="card"><header><h2>Deposits with no ERA</h2></header>
          <table><tbody>{unmatchedDeposits.map((r, i) => <tr key={i}><td>{fmt(r.d)}</td><td>{r.payer || r.description}</td><td className="n">{usd(r.amount_cents)}</td></tr>)}
            {!unmatchedDeposits.length && <tr><td className="note">Every insurer deposit has a remittance.</td></tr>}</tbody></table></section>
      </div>
    </div>
  </>);
}
