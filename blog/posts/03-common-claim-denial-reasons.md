---
title: Common Claim Denial Reasons and How to Fix Them
description: The most common claim denial reasons, what the codes usually mean, and how to fix each one so the resubmitted claim gets paid.
slug: common-claim-denial-reasons
category: Getting paid
date: 2026-11-11
number: 3
---
Most claim denial reasons fall into a handful of buckets, and once you know them, fixing a denied claim gets a lot faster. The trick is to figure out *why* a claim was denied before you touch it. A blind resubmission usually just earns a second denial.

## How to find the real denial reason

Start with the ERA or paper remittance. Each denied line carries a group code, a Claim Adjustment Reason Code (CARC), and often a Remittance Advice Remark Code (RARC). The CARC tells you the category. The RARC usually tells you the specific problem, like which field was missing or which policy applied.

Read both. "Missing information" plus a remark pointing to the referring provider's ID tells you exactly what to fix. If you don't recognize a code, check the official lists at [x12.org](https://x12.org).

## Common claim denial reasons (and how to fix each)

### Eligibility and coverage problems

The patient wasn't covered on the date of service, or the plan on file was wrong. CARC 27 (expenses incurred after coverage terminated) is a familiar one here.

**How to fix it:** Re-verify eligibility for the exact date of service and ask the patient whether they changed plans. If you find the right coverage, bill that payer. If there truly was none, the balance moves to the patient under your financial policy.

**How to prevent it:** Verify eligibility before every visit, not just the first one.

### Missing or incorrect information

CARC 16 covers claims that lack information or have submission or billing errors. The remark code usually narrows it down: a wrong subscriber ID, a missing NPI, a bad date of birth, a missing referring provider, an invalid place of service.

**How to fix it:** Correct the field the remark code points to, then check the rest of the claim. If one field was wrong, others might be too.

### Prior authorization missing or not matched

The payer required authorization and didn't find one on file (CARC 197 is common). Sometimes an authorization existed but covered a different code, unit count, or date range.

**How to fix it:** If you had a valid authorization, resubmit with its number and make sure codes and dates match. If not, ask whether the payer allows retroactive authorization. A few do, in limited cases.

### Medical necessity

The payer decided the service wasn't medically necessary based on the diagnosis codes submitted (CARC 50). Sometimes the care was appropriate but the claim didn't show why.

**How to fix it:** Check that diagnosis codes are as specific as the documentation supports and linked to the right service lines. If the coding was right and the payer still disagrees, it's usually an appeal with clinical notes, not a corrected claim. For Medicare, coverage policies published on [cms.gov](https://www.cms.gov) spell out which diagnoses support which services.

### Duplicate claims

CARC 18 means the payer thinks it already received this exact claim. It often happens when someone resubmits a claim that was still processing, or sends a fix as a brand-new claim.

**How to fix it:** Check claim status first. If the original is still pending or was paid, there's nothing to fix. If you're correcting a prior claim, send it as a replacement claim (not a new one) and reference the original claim number.

### Coordination of benefits

The payer believes another insurer should pay first (CARC 22), often when a patient has more than one plan.

**How to fix it:** Confirm the order of benefits with the patient and both payers. Bill the primary first, then send the secondary claim with the primary's payment details. Sometimes the patient has to update their COB information with the payer before it'll reprocess.

### Coding and bundling issues

A code was denied as part of another service billed the same day, or a modifier was missing or wrong. For Medicare, the National Correct Coding Initiative (NCCI) edits define many of these pairs. Commercial payers often use similar edits, though their rules can differ.

**How to fix it:** Review the documentation. If the services were truly separate, a modifier may be appropriate, but only if the record supports it. Adding modifiers just to get past an edit creates compliance risk.

### Timely filing

The claim, or the corrected claim, arrived after the payer's deadline (CARC 29). Filing limits vary a lot by payer and by contract.

**How to fix it:** This one's hard to reverse. If you have proof of timely submission, like a clearinghouse acceptance report, appeal with it attached. Otherwise it's usually a write-off, so keep every payer's filing limit where your team can see it.

## Should you send a corrected claim or an appeal?

- **Corrected (replacement) claim:** Use this when *you* made the error, like a wrong code, a missing modifier, or a bad ID. Many payers expect a specific claim frequency code (often 7 for a replacement) and the original claim number. Check each payer's requirements.
- **Appeal or reconsideration:** Use this when the claim was right and you disagree with the payer's decision, such as a medical necessity denial. Include a short letter, the records, and any supporting policy or contract language.
- **New claim:** Only when the original was rejected at the clearinghouse or payer front end and never actually entered adjudication.

Medicare has its own multi-level appeals process with set timeframes, described on [cms.gov](https://www.cms.gov). Commercial payers set their own deadlines in your contract or provider manual.

## Track denials so they stop repeating

Fixing a denial gets you paid once. Fixing the cause gets you paid every time after. Log each denial with the payer, reason code, and root cause (front desk, coding, authorization, or payer error), and review it monthly. If the same reason keeps showing up, the fix belongs upstream.

Aria's [denial management](https://ariapractice.com/denials) is built to help your team work denials and get claims back out the door, and [claims advance](https://ariapractice.com/claims-advance) is designed to help with cash while claims work their way through. Join the waitlist at [ariapractice.com](https://ariapractice.com).
