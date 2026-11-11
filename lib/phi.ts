// Stripe signs no BAA. Every string we send to Stripe passes through here first.
// It refuses procedure and diagnosis codes and common clinical words, so payment data
// stays inside HIPAA's payment-processing exemption.
const CPT = /\b\d{4}[0-9FTU]\b/;                       // CPT and HCPCS Level I style codes, e.g. 99213, 0001F
const HCPCS = /\b[A-V]\d{4}\b/i;                       // HCPCS Level II, e.g. J1100
const ICD10 = /\b[A-TV-Z]\d[0-9A-Z](\.[0-9A-Z]{1,4})?\b/;  // ICD-10-CM, e.g. E11.9, M54.5
const WORDS = /\b(diagnos\w*|procedure|surgery|biopsy|mri|ct scan|x-?ray|colonoscopy|endoscopy|injection|infusion|therapy|prescription|rx|lab(?:s)?|pathology|visit reason|chief complaint|pregnan\w*|hiv|std|sti|mental health|psychiatr\w*|counseling|cancer|oncology|dermatitis|fracture)\b/i;

export class PhiError extends Error { constructor(public field: string) { super(`Refused: "${field}" looks like it contains health information. Use the statement reference only.`); } }

export function assertNoPhi(fields: Record<string, string | null | undefined>) {
  for (const [name, value] of Object.entries(fields)) {
    if (!value) continue;
    if (CPT.test(value) || HCPCS.test(value) || ICD10.test(value) || WORDS.test(value)) throw new PhiError(name);
  }
}
