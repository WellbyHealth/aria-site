// Minimal X12 835 (ERA) parser: one remittance per BPR/TRN pair, with claim-level totals.
export interface EraClaim { claimRef: string; statusCode: string; billedCents: number; paidCents: number; patientRespCents: number; adjustments: { group: string; reason: string; cents: number }[]; receivedOn: string | null; renderingProvider: string | null }
export interface EraRemit { payer: string; traceNumber: string; paidOn: string | null; totalCents: number; method: string; claims: EraClaim[] }

const cents = (s: string | undefined) => Math.round(parseFloat(s || '0') * 100);
const isoDate = (s: string | undefined) => (s && /^\d{8}$/.test(s) ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}` : null);

export function parse835(text: string): EraRemit[] {
  const raw = text.replace(/\r?\n/g, '');
  if (!raw.startsWith('ISA')) throw new Error('Not an X12 file: it should start with ISA');
  const elem = raw[3];
  const term = raw[105] || '~';
  const segs = raw.split(term).map(s => s.trim()).filter(Boolean).map(s => s.split(elem));
  const out: EraRemit[] = [];
  let cur: EraRemit | null = null, claim: EraClaim | null = null, inPayer = false;
  for (const s of segs) {
    const id = s[0];
    if (id === 'ST' && s[1] === '835') { cur = { payer: '', traceNumber: '', paidOn: null, totalCents: 0, method: '', claims: [] }; out.push(cur); claim = null; }
    if (!cur) continue;
    if (id === 'BPR') { cur.totalCents = cents(s[2]); cur.method = s[4] || ''; cur.paidOn = isoDate(s[16]); }
    if (id === 'TRN') cur.traceNumber = s[2] || '';
    if (id === 'N1') inPayer = s[1] === 'PR';
    if (id === 'N1' && s[1] === 'PR') cur.payer = s[2] || '';
    if (id === 'CLP') { claim = { claimRef: s[1], statusCode: s[2], billedCents: cents(s[3]), paidCents: cents(s[4]), patientRespCents: cents(s[5]), adjustments: [], receivedOn: null, renderingProvider: null }; cur.claims.push(claim); inPayer = false; }
    if (id === 'CAS' && claim) for (let i = 2; i + 1 < s.length; i += 3) if (s[i]) claim.adjustments.push({ group: s[1], reason: s[i], cents: cents(s[i + 1]) });
    // DTM*050 = date the payer received the claim; NM1*82 = rendering provider (last, first).
    if (id === 'DTM' && s[1] === '050' && claim) claim.receivedOn = isoDate(s[2]);
    if (id === 'NM1' && s[1] === '82' && claim) claim.renderingProvider = [s[4], s[3]].filter(Boolean).join(' ') || null;
    if (id === 'SE') { claim = null; }
    void inPayer;
  }
  return out.filter(r => r.traceNumber);
}
