import { describe, it, expect } from 'vitest';
import { statusFor, median, months, short, costCategory, denialRate, daysToPay, balanceAt, payerName, revenueCycle, type Claim, type Flow } from '../lib/metrics';
import { parseFilters, query } from '../lib/filters';
import { parse835 } from '../lib/era';

const claim = (o: Partial<Claim>): Claim => ({ paid: '2026-11-02', recv: '2026-10-20', payer: 'Aetna', loc: null, status: '1', billed: 10000, paidC: 6000, pr: 1000, adj: [], provider: null, ref: 'X', ...o });

describe('thresholds', () => {
  it('flags breaches as alert and the last 10% as watch', () => {
    expect(statusFor(0.09, '<=', 0.08)).toBe('alert');
    expect(statusFor(0.075, '<=', 0.08)).toBe('watch');
    expect(statusFor(0.05, '<=', 0.08)).toBe('ok');
    expect(statusFor(25, '>=', 30)).toBe('alert');
    expect(statusFor(31, '>=', 30)).toBe('watch');
    expect(statusFor(45, '>=', 30)).toBe('ok');
    expect(statusFor(null, '>=', 30)).toBe('none');
  });
});

describe('filters', () => {
  it('builds equal-length prior periods', () => {
    const f = parseFilters({ range: 'mtd' }, '2026-11-11');
    expect([f.from, f.to, f.pFrom, f.pTo]).toEqual(['2026-11-01', '2026-11-11', '2026-10-21', '2026-10-31']);
    const d = parseFilters({}, '2026-11-11');
    expect([d.range, d.from, d.pTo]).toEqual(['30d', '2026-10-13', '2026-10-12']);
    expect(parseFilters({ range: 'bogus', site: 'all', payer: 'Aetna' }, '2026-11-11')).toMatchObject({ range: '30d', site: null, payer: 'Aetna' });
    expect(query(parseFilters({ range: 'ytd', payer: 'Cigna' }, '2026-11-11'))).toBe('?range=ytd&payer=Cigna');
  });
  it('has the last twelve complete months', () => {
    const ms = months('2026-11-11');
    expect(ms).toHaveLength(12);
    expect(ms[0]).toMatchObject({ from: '2025-11-01', label: 'Nov' });
    expect(ms[11]).toMatchObject({ from: '2026-10-01', to: '2026-10-31' });
  });
});

describe('metric math', () => {
  it('rounds currency for reading', () => {
    expect(short(123_456_789)).toBe('$1.23M');
    expect(short(8_642_000)).toBe('$86.4K');
    expect(short(-1_204_000)).toBe('−$12.0K');
    expect(short(95_000)).toBe('$950');
  });
  it('computes denial rate and median days to pay, ignoring denials for speed', () => {
    const cs = [claim({}), claim({ recv: '2026-10-30' }), claim({ status: '4', paidC: 0, recv: '2026-01-01' }), claim({ recv: '2026-10-01' })];
    expect(denialRate(cs)).toBe(0.25);
    expect(daysToPay(cs)).toBe(13);
    expect(median([])).toBeNull();
  });
  it('rebuilds a past balance from today backwards, ignoring card accounts', () => {
    const fl: Flow[] = [
      { d: '2026-11-05', cents: 50_000, kind: 'insurer_deposit', payer: null, loc: null, desc: '', matched: true, credit: false },
      { d: '2026-11-06', cents: -20_000, kind: 'vendor', payer: null, loc: null, desc: '', matched: false, credit: false },
      { d: '2026-11-06', cents: -9_999, kind: 'vendor', payer: null, loc: null, desc: '', matched: false, credit: true },
    ];
    expect(balanceAt(100_000, fl, '2026-11-04')).toBe(70_000);
  });
  it('sorts spending into categories', () => {
    const f = (desc: string, kind = 'vendor') => costCategory({ d: '', cents: -1, kind, payer: null, loc: null, desc, matched: false, credit: false });
    expect(f('GUSTO NET PAY', 'payroll')).toBe('Payroll and benefits');
    expect(f('NORTHGATE PLAZA RENT')).toBe('Rent and occupancy');
    expect(f('HENRY SCHEIN INC')).toBe('Medical supplies');
    expect(f('ATHENAHEALTH SUBSCRIPTION')).toBe('Software and IT');
    expect(f('COSTCO')).toBe('Other vendors and card spend');
  });
  it('names payers the same way in banks and 835 files', () => {
    expect(payerName('MEDICARE NORIDIAN')).toBe('Medicare');
    expect(payerName('BCBS')).toBe('Blue Cross Blue Shield');
    expect(payerName('ACME HEALTH PLAN')).toBe('Acme Health Plan');
  });
  it('builds the denial Pareto by reason code', () => {
    const D: any = { f: parseFilters({}, '2026-11-11'), today: '2026-11-11', claims: [
      claim({ status: '4', paidC: 0, billed: 50_000, adj: [{ group: 'CO', reason: '197', cents: 50_000 }] }),
      claim({ status: '4', paidC: 0, billed: 20_000, adj: [{ group: 'CO', reason: '16', cents: 20_000 }] }),
      claim({ status: '4', paidC: 0, billed: 40_000, adj: [{ group: 'CO', reason: '197', cents: 40_000 }] }),
      claim({ adj: [{ group: 'CO', reason: '45', cents: 3000 }] }),
    ] };
    const r = revenueCycle(D);
    expect(r.pareto.map(p => [p.code, p.n, p.cents])).toEqual([['CO-197', 2, 90_000], ['CO-16', 1, 20_000]]);
    expect(r.pareto[0].label).toBe('No prior authorization');
    expect(r.contractual).toBe(3000);
  });
});

describe('835 v2 fields', () => {
  it('reads the received date and rendering provider for each claim', () => {
    const isa = require('node:fs').readFileSync(__dirname + '/fixtures-835.txt', 'utf8').slice(0, 106);
    const x = isa + 'ST*835*1~BPR*I*100*C*ACH~TRN*1*555~N1*PR*CIGNA~CLP*P1*1*200*100*0*12*C1~NM1*82*1*NAIR*PRIYA****XX*1234567890~DTM*050*20261015~SE*7*1~';
    const [r] = parse835(x);
    expect(r.claims[0]).toMatchObject({ receivedOn: '2026-10-15', renderingProvider: 'PRIYA NAIR' });
  });
});
