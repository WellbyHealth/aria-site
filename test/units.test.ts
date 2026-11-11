import { describe, it, expect } from 'vitest';
import { assertNoPhi, PhiError } from '../lib/phi';
import { parse835 } from '../lib/era';
import { bestMatch } from '../lib/match';
import { forecast } from '../lib/forecast';
import { classify } from '../lib/classify';
import { encrypt, decrypt, sign, unsign } from '../lib/crypto';
import { statementRef } from '../lib/stripe';
import fs from 'node:fs';

describe('PHI guard', () => {
  it('allows names, contacts and statement refs', () => {
    expect(() => assertNoPhi({ patient_name: 'Maria Lopez', patient_contact: 'maria@example.com', ref: statementRef() })).not.toThrow();
    expect(() => assertNoPhi({ patient_contact: '+1 555 123 4567' })).not.toThrow();
  });
  it.each(['Visit 99213', 'J1100 injection', 'Dx E11.9', 'MRI follow up', 'colonoscopy balance', 'M54.5'])('refuses %s', (v) => {
    expect(() => assertNoPhi({ description: v })).toThrow(PhiError);
  });
  it('statement refs never contain five-digit runs', () => {
    for (let i = 0; i < 200; i++) expect(statementRef()).not.toMatch(/\d{5}/);
  });
});

describe('835 parser', () => {
  const r = parse835(fs.readFileSync(__dirname + '/fixtures-835.txt', 'utf8'));
  it('reads one remittance with payer, trace, date and total', () => {
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ payer: 'AETNA', traceNumber: '7734001122', paidOn: '2026-11-02', totalCents: 125075, method: 'ACH' });
  });
  it('reads claims, denials and adjustments', () => {
    expect(r[0].claims.map(c => [c.claimRef, c.statusCode, c.paidCents])).toEqual([['PT1001', '1', 25075], ['PT1002', '1', 100000], ['PT1003', '4', 0]]);
    expect(r[0].claims[0].adjustments).toEqual([{ group: 'CO', reason: '45', cents: 11925 }, { group: 'PR', reason: '2', cents: 3000 }]);
  });
  it('rejects files that are not X12', () => { expect(() => parse835('hello')).toThrow(); });
});

describe('deposit matching', () => {
  const remit = { id: 'r', trace_number: '7734001122', total_cents: 125075, paid_on: '2026-11-02', payer: 'AETNA' };
  it('prefers the deposit that carries the trace number', () => {
    const m = bestMatch(remit, [
      { id: 'a', posted_on: '2026-11-03', amount_cents: 125075, description: 'AETNA HCCLAIMPMT', payer: 'Aetna' },
      { id: 'b', posted_on: '2026-11-04', amount_cents: 125075, description: 'AETNA HCCLAIMPMT TRN*1*7734001122', payer: 'Aetna' },
    ]);
    expect(m?.id).toBe('b');
  });
  it('requires the exact amount and a close date', () => {
    expect(bestMatch(remit, [{ id: 'a', posted_on: '2026-11-03', amount_cents: 125000, description: 'AETNA', payer: 'Aetna' }])).toBeNull();
    expect(bestMatch(remit, [{ id: 'a', posted_on: '2026-12-20', amount_cents: 125075, description: 'AETNA', payer: 'Aetna' }])).toBeNull();
  });
});

describe('forecast', () => {
  const flows = [] as { posted_on: string; amount_cents: number; kind: string }[];
  for (let w = 0; w < 12; w++) {
    const day = (n: number) => new Date(Date.UTC(2026, 10, 10) - (w * 7 + n) * 864e5).toISOString().slice(0, 10);
    flows.push({ posted_on: day(1), amount_cents: 1_000_000, kind: 'insurer_deposit' }, { posted_on: day(2), amount_cents: -300_000, kind: 'vendor' });
    if (w % 2 === 0) flows.push({ posted_on: day(3), amount_cents: -1_000_000, kind: 'payroll' });
  }
  const weeks = forecast(5_000_000, flows, '2026-11-10');
  it('projects 13 weeks with average in and out', () => {
    expect(weeks).toHaveLength(13);
    expect(weeks[0].inCents).toBe(1_000_000);
    expect(weeks[0].outCents).toBe(300_000);
  });
  it('places payroll every other week', () => {
    expect(weeks.filter(w => w.payrollCents > 0).length).toBeGreaterThanOrEqual(6);
    expect(weeks.filter(w => w.payrollCents > 0).length).toBeLessThanOrEqual(7);
    expect(Math.max(...weeks.map(w => w.payrollCents))).toBe(1_000_000);
  });
});

describe('classifier and crypto', () => {
  it('classifies common practice transactions', () => {
    expect(classify(50000, 'UNITEDHEALTHCARE HCCLAIMPMT')).toEqual({ kind: 'insurer_deposit', payer: 'UnitedHealthcare' });
    expect(classify(-50000, 'GUSTO NET PAY').kind).toBe('payroll');
    expect(classify(30000, 'STRIPE TRANSFER').kind).toBe('processor_payout');
    expect(classify(-1000, 'MCKESSON').kind).toBe('vendor');
  });
  it('round-trips tokens and rejects tampered sessions', () => {
    const blob = encrypt('access-sandbox-123');
    expect(blob).not.toContain('access-sandbox');
    expect(decrypt(blob)).toBe('access-sandbox-123');
    const s = sign('user|123');
    expect(unsign(s)).toBe('user|123');
    expect(unsign(s.replace('user', 'admin'))).toBeNull();
  });
});
