---
title: How to Read an ERA (835) and Spot a Short Payment
description: How to read an ERA (835) line by line, what the adjustment codes mean, and how to tell when an insurer paid you less than your contract says.
slug: how-to-read-an-era-835
category: Getting paid
date: 2026-11-05
number: 1
---
If you know how to read an ERA, you can catch short payments that most practices never notice. An ERA (electronic remittance advice, technically the ASC X12 835 transaction) is the insurer's explanation of what it paid on your claims and why.

Most offices post ERAs and move on, which is how short payments slip by.

## What is an ERA (835) remittance?

An ERA is the payer's record of what it decided about your claims. One ERA can cover dozens of claims for different patients, all paid in a single deposit. For each claim, and for each service line on that claim, it shows what you billed, what the payer allowed, what it paid, and the reasons for every difference.

Every dollar between your charge and the payment has to be explained by an adjustment. Your practice management system turns the raw 835 file into something readable, and while layouts differ, the building blocks are the same.

## How do you read an ERA line by line?

### Start with the payment header

At the top you'll see the payer, the payment date, the total amount, and a trace number. For an electronic funds transfer, the trace number is how you match the ERA to the deposit in your bank account.

### Then the claim level

Each claim shows the patient, your claim number, the payer's claim number, total billed, total paid, and patient responsibility. You'll also see a status, such as processed as primary, processed as secondary, or denied.

### Then the service lines

Under each claim are the individual services: procedure code, modifiers, units, billed amount, allowed amount, and paid amount. This is where short payments live, one line at a time.

## What do CO, PR, and CARC codes mean on an ERA?

Each adjustment carries two codes. The **group code** says who's responsible for the difference:

- **CO** (Contractual Obligation) is the amount you agreed to write off under your contract. You can't bill the patient for it.
- **PR** (Patient Responsibility) covers deductible, coinsurance, and copay. You can bill the patient.
- **OA** (Other Adjustment) is used when neither of those fits.
- **PI** (Payer Initiated Reduction) is a reduction the payer made that isn't a contractual write-off and isn't the patient's to pay.

The **Claim Adjustment Reason Code (CARC)** says why. You'll see a handful constantly. Code 1 is deductible, 2 is coinsurance, 3 is copay, and 45 means the charge exceeds the fee schedule or contracted amount. So "CO-45" reads as "this is the gap between your charge and your contracted rate, and you write it off." "PR-2" is the patient's coinsurance.

Many lines also carry a **Remittance Advice Remark Code (RARC)**, which adds detail, like which piece of information was missing or which policy the payer applied.

Both code lists are public and updated on a regular schedule. If you see a code you don't recognize, look it up on the official lists at [x12.org](https://x12.org) instead of guessing.

### Don't skip provider-level adjustments

Some adjustments aren't tied to any one claim. A payer might take back an overpayment from months ago, or add interest on a late claim. These show up separately from the claims, and they're the usual reason a deposit doesn't equal the sum of the claims on the ERA. A recoupment you don't recognize deserves a phone call.

## How to spot a short payment on an ERA

A short payment happens when the payer allowed less than your contract says it should. The CO-45 adjustment hides it, because CO-45 simply absorbs whatever the difference happens to be.

Here's an illustrative example. Say you bill $250 for a service. Your contract with this payer sets the allowed amount for that code at $142, and the patient owes 20% coinsurance. The ERA shows:

- Billed: $250.00
- CO-45: $118.00
- PR-2 (coinsurance): $26.40
- Paid: $105.60

The line balances. $250.00 minus $118.00 minus $26.40 is $105.60. Nothing looks off.

Now work out the allowed amount. Billed minus the CO-45 write-off is $132.00. Your contract says $142.00, so the payer allowed $10.00 too little.

At the right rate, coinsurance would've been $28.40 and the payer would've paid $113.60. You're $8.00 short from the payer and $2.00 short on what you can collect from the patient.

Eight dollars is easy to miss. Bill that code to that payer 50 times a month and it's $400 a month, or $4,800 a year, from one code and one payer.

## A monthly ERA review routine

You don't need to audit every line by hand. Start small:

1. List the 10 or 20 procedure codes that bring in most of your revenue.
2. Write down the contracted allowed amount for each one, for each of your main payers.
3. Check the allowed amount on the ERA, not the paid amount. Patient responsibility doesn't change what was allowed.
4. Flag any line where allowed is below contract, then look for a pattern: same code, same payer, same modifier.
5. Read the remark codes on flagged lines. Sometimes there's a legitimate reason, like a multiple procedure reduction. Sometimes there isn't.
6. Reconcile the deposit. Match the ERA total and any provider-level adjustments to what actually hit your bank.

## What to do when the ERA doesn't add up

If you find a pattern, call the payer's provider services line first. Have claim numbers, dates of service, codes, and your contracted rate in front of you, and ask whether the payer has your current fee schedule loaded. If that doesn't resolve it, use the payer's written reconsideration or appeal process. Deadlines vary by payer and by contract, so check yours before the clock runs out.

Checking every ERA line against your contracts is the kind of work Aria is built to do for you, through [underpayment checks](https://ariapractice.com/underpayments) and [denial management](https://ariapractice.com/denials) for the claims that come back at zero. Join the waitlist at [ariapractice.com](https://ariapractice.com).
