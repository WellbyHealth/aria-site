// Matches insurer remittances (835) to bank deposits from Plaid.
import { db, type Db } from './db';

const DAY = 864e5;
export interface Candidate { id: string; posted_on: string; amount_cents: number; description: string; payer: string | null }
export interface RemitLite { id: string; trace_number: string; total_cents: number; paid_on: string | null; payer: string }

// Pure scoring, unit tested: exact amount is required; trace number in the description wins; then payer and date distance.
export function bestMatch(r: RemitLite, cands: Candidate[]): Candidate | null {
  let best: Candidate | null = null, bestScore = -1;
  for (const c of cands) {
    if (Number(c.amount_cents) !== Number(r.total_cents)) continue;
    let score = 1;
    if (r.trace_number && c.description.replace(/\s/g, '').includes(r.trace_number)) score += 100;
    if (c.payer && r.payer && r.payer.toUpperCase().includes(c.payer.split(' ')[0].toUpperCase())) score += 10;
    if (r.paid_on) {
      const days = Math.abs(Date.parse(c.posted_on) - Date.parse(r.paid_on)) / DAY;
      if (days > 7 && score < 100) continue;
      score += Math.max(0, 7 - days);
    }
    if (score > bestScore) { best = c; bestScore = score; }
  }
  return best;
}

export async function matchPractice(practiceId: string, given?: Db) {
  const d = given ?? await db();
  const remits = await d.query<RemitLite>(`select id, trace_number, total_cents, to_char(paid_on,'YYYY-MM-DD') paid_on, payer from remittances where practice_id=$1 and matched_entry_id is null`, [practiceId]);
  let matched = 0;
  for (const r of remits) {
    const cands = await d.query<Candidate>(
      `select id, to_char(posted_on,'YYYY-MM-DD') posted_on, amount_cents, description, payer from ledger_entries
       where practice_id=$1 and source='plaid' and amount_cents=$2 and matched_remittance_id is null and kind in ('insurer_deposit','other')`, [practiceId, r.total_cents]);
    const m = bestMatch(r, cands);
    if (m) {
      await d.query('update remittances set matched_entry_id=$2 where id=$1', [r.id, m.id]);
      await d.query(`update ledger_entries set matched_remittance_id=$2, kind='insurer_deposit', payer=coalesce(payer,$3) where id=$1`, [m.id, r.id, r.payer]);
      matched++;
    }
  }
  return { checked: remits.length, matched };
}
