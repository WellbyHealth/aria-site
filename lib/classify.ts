// Turns a raw bank transaction into a ledger kind. Plaid amounts are positive for money OUT;
// the ledger stores positive for money IN, so callers flip the sign before classifying.
const PAYERS: [RegExp, string][] = [
  [/united\s*health|uhc\b|optum/i, 'UnitedHealthcare'],
  [/aetna/i, 'Aetna'],
  [/cigna/i, 'Cigna'],
  [/humana/i, 'Humana'],
  [/anthem|blue\s*cross|bcbs|blue\s*shield/i, 'Blue Cross Blue Shield'],
  [/medicare|cms\b|noridian|novitas|palmetto|wps\b|ngs\b/i, 'Medicare'],
  [/medicaid|medi-cal/i, 'Medicaid'],
  [/tricare/i, 'TRICARE'],
  [/hcclaimpmt|claim\s*pmt|ins\s*pymt/i, 'Insurer'],
];
const PAYROLL = /gusto|adp\b|paychex|rippling|justworks|trinet|payroll/i;
const PROCESSOR = /stripe|square|clover|authorize\.net/i;
const TRANSFER = /transfer|xfer|online banking tfr/i;

export type Kind = 'insurer_deposit' | 'patient_payment' | 'processor_payout' | 'payroll' | 'vendor' | 'transfer' | 'other';

export function payerOf(text: string): string | null {
  for (const [re, name] of PAYERS) if (re.test(text)) return name;
  return null;
}

export function classify(amountCents: number, text: string): { kind: Kind; payer: string | null } {
  const payer = payerOf(text);
  if (amountCents > 0) {
    if (payer) return { kind: 'insurer_deposit', payer };
    if (PROCESSOR.test(text)) return { kind: 'processor_payout', payer: null };
    if (TRANSFER.test(text)) return { kind: 'transfer', payer: null };
    return { kind: 'other', payer: null };
  }
  if (PAYROLL.test(text)) return { kind: 'payroll', payer: null };
  if (TRANSFER.test(text)) return { kind: 'transfer', payer: null };
  return { kind: 'vendor', payer: null };
}
