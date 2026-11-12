// Sample data for the Aria accounts, cards, capital and bill pay previews. These products open at launch,
// so the screens show realistic example numbers instead of the practice's own data.
export const PREVIEW_NOTE = 'Preview with sample data. Aria accounts, cards and lending open at launch.';

export const ACCOUNTS = [
  { name: 'Operating', kind: 'Checking', mask: '1038', cents: 31820411, rule: { tone: 'r1', title: 'Sweep insurer deposits here', sub: 'Daily, from linked bank' } },
  { name: 'Payroll', kind: 'Checking', mask: '1794', cents: 14200000, rule: { tone: 'r2', title: 'Restore balance to $140,000', sub: 'Before each payroll run' } },
  { name: 'Supplies', kind: 'Checking', mask: '4296', cents: 16177621, rule: { tone: 'r3', title: 'Pay Aria Card in full', sub: 'Every 15th' } },
  { name: 'Tax reserve', kind: 'Savings', mask: '1109', cents: 19050000, rule: { tone: 'r4', title: 'Save 25% of net income', sub: 'Monthly, on the 1st' } },
  { name: 'Aria Card', kind: 'Credit', mask: '0001', cents: -52275000, rule: { tone: 'r1', title: 'Autopay from Supplies', sub: 'Every 15th, or under 20% of limit left' } },
];

export const CARDS = [
  { id: 'supplies', name: 'Supplies', holder: 'Maria Lopez', mask: '0001', type: 'Virtual', limit: 25000000, posted: 12815000, pending: 2124000, lock: 'Medline, Henry Schein, McKesson', status: 'Active' },
  { id: 'front', name: 'Front desk', holder: 'Jamie Chen', mask: '4207', type: 'Physical', limit: 25000000, posted: 18150000, pending: 2124000, lock: 'Office supplies', status: 'Active' },
  { id: 'surgery', name: 'Surgery center', holder: 'Dr. Ana Patel', mask: '3318', type: 'Physical', limit: 15000000, posted: 9420000, pending: 0, lock: 'Medical suppliers', status: 'Active' },
  { id: 'software', name: 'Software', holder: 'Practice admin', mask: '8820', type: 'Virtual', limit: 30000000, posted: 11890000, pending: 0, lock: 'Software only', status: 'Active' },
  { id: 'travel', name: 'CME travel', holder: 'Dr. Sam Okafor', mask: '5561', type: 'Physical', limit: 40000000, posted: 0, pending: 0, lock: 'Travel', status: 'Frozen' },
];

export const CARD_TXNS = [
  { day: 'Nov 11', who: 'Medline Industries', card: 'Supplies', cents: 41842000, cat: 'Medical supplies' },
  { day: 'Nov 10', who: 'Henry Schein', card: 'Supplies', cents: 26351500, cat: 'Medical supplies' },
  { day: 'Nov 9', who: 'McKesson', card: 'Surgery center', cents: 61200000, cat: 'Surgical supplies' },
  { day: 'Nov 8', who: 'Staples', card: 'Front desk', cents: 18940000, cat: 'Office supplies' },
  { day: 'Nov 6', who: 'athenahealth', card: 'Software', cents: 11890000, cat: 'Software' },
  { day: 'Nov 4', who: 'Medline Industries', card: 'Supplies', cents: 39921500, cat: 'Medical supplies' },
];

export const LINE = { limit: 90000000, drawn: 64640000, rate: 'Sample terms', nextRepay: 'Paid automatically from claim payments' };
export const DRAWS = [
  { day: 'Nov 3', drug: 'Eylea (aflibercept)', units: 120, cents: 22200000, payer: 'Medicare', status: 'Awaiting claim', eta: 'Dec 8' },
  { day: 'Oct 27', drug: 'Keytruda (pembrolizumab)', units: 24, cents: 26400000, payer: 'Aetna', status: 'Awaiting claim', eta: 'Dec 2' },
  { day: 'Oct 14', drug: 'Prolia (denosumab)', units: 120, cents: 19200000, payer: 'Medicare', status: 'Partly repaid', eta: 'Nov 20' },
  { day: 'Sep 30', drug: 'Eylea (aflibercept)', units: 100, cents: 18500000, payer: 'Blue Cross', status: 'Repaid', eta: 'Paid Nov 4' },
];
export const FLEX = [
  { vendor: 'McKesson', invoice: 'INV-88213', cents: 38400000, parts: 3, paid: 1, next: 'Dec 15' },
  { vendor: 'Henry Schein', invoice: 'HS-55102', cents: 12600000, parts: 2, paid: 0, next: 'Nov 28' },
];

export const BILLS = [
  { vendor: 'Henry Schein', invoice: 'HS-55187', cents: 48747500, due: 'Nov 18', gl: '5010 Medical supplies', status: 'Ready to approve', from: 'Forwarded by email' },
  { vendor: 'Quest Diagnostics', invoice: 'Q-220981', cents: 21600000, due: 'Nov 20', gl: '5200 Lab fees', status: 'Ready to approve', from: 'Uploaded' },
  { vendor: 'Stericycle', invoice: 'SC-71004', cents: 64900000, due: 'Nov 9', gl: '5400 Waste disposal', status: 'Overdue', from: 'Forwarded by email' },
  { vendor: 'Pacific Gas & Electric', invoice: '4410-22', cents: 18221100, due: 'Nov 25', gl: '6100 Utilities', status: 'Scheduled', from: 'Autopay' },
  { vendor: 'Medline Industries', invoice: 'ML-339021', cents: 91204000, due: 'Dec 1', gl: '5010 Medical supplies', status: 'Scheduled', from: 'Forwarded by email' },
  { vendor: 'Landmark Properties', invoice: 'Rent Dec', cents: 14500000, due: 'Dec 1', gl: '6000 Rent', status: 'Scheduled', from: 'Recurring' },
];
