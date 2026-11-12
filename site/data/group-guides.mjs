// Group-level guidance for specialty and group pages: how these practices get paid, and what to look for in a bank.
// Plain facts only. No rates, prices or promises that depend on terms we have not published.
export const GUIDES = {
  'primary-care': {
    paid: [
      'Primary care revenue arrives in many small payments: office visits, annual wellness visits, vaccines, chronic care management and, more and more, value-based or capitation checks. A busy clinic can post hundreds of insurer deposits a month, each tied to a remittance file that has to be matched to the right visits.',
      'Medicare generally pays clean electronic claims in about two to four weeks. Commercial payers set their own timelines, often 30 to 45 days, and state prompt-pay laws vary. Vaccines are bought weeks before they are given and billed, so flu and back-to-school seasons can tie up a lot of cash at once.',
    ],
    look: ['Matching each insurer deposit to its remittance, so short pays are caught', 'A way to fund vaccine and supply orders before the season’s claims pay', 'Cards for front desk and clinical staff with their own limits', 'Reporting by location and provider if you run more than one site', 'Exports that drop cleanly into QuickBooks or Xero'],
  },
  specialists: {
    paid: [
      'Specialist practices bill higher-value visits, procedures and in-office tests, so each claim carries more money and each denial hurts more. Prior authorizations, modifiers and payer-specific rules decide whether a claim pays in full, partly or not at all.',
      'Payment timing follows the payer: Medicare often within about a month for clean claims, commercial plans on their own schedule. Practices that buy drugs or devices for in-office use carry that cost until the claim pays, which is where cash gets tight.',
    ],
    look: ['Checking each payment against your contracted rate', 'Financing for drugs and devices that waits for the claim to pay', 'Spending controls by provider, location and vendor', 'A forecast that shows payroll weeks before it is due', 'Clean data you can hand your accountant at month end'],
  },
  infusion: {
    paid: [
      'Infusion and oncology practices run on buy and bill: the practice buys an expensive drug, gives it to the patient, then bills the payer and waits. Medicare Part B pays most physician-administered drugs at a rate tied to the drug’s average sales price, and commercial payers set their own rates in each contract.',
      'Between the distributor’s invoice and the claim payment, the practice is carrying the full cost of the drug. One week of chair time can mean six figures of drug orders, so the gap between paying and getting paid is often the biggest number on the balance sheet.',
    ],
    look: ['Lending that pays the distributor now and is repaid from the claim', 'Drug payments checked against ASP-based or contracted rates', 'Distributor terms you can stretch when claims run slow', 'Daily cash visibility across every infusion site', 'Cash back on drug and supply orders where the distributor allows card payment'],
  },
  surgical: {
    paid: [
      'Surgical practices are paid per case, often with a professional fee from the surgeon’s claim and, where they own a facility, a separate facility fee. Implants, devices and disposables are bought ahead of the case and recovered through the claim.',
      'High-dollar cases draw more payer scrutiny: prior authorization, medical necessity reviews and implant invoices requested before payment. A few delayed cases can swing a month’s cash flow, so knowing what is owed and when matters as much as the case volume.',
    ],
    look: ['A clear view of what each case cost against what it paid', 'Cards for implant and device orders with vendor locks', 'Financing that bridges large case costs to payment', 'Alerts when a payer pays below the contract', 'Bill pay that keeps device reps and vendors on schedule'],
  },
  'surgery-centers': {
    paid: [
      'Ambulatory surgery centers are paid a facility fee for each case, separate from the surgeon’s professional fee. Medicare publishes its own ASC payment rates each year, and commercial contracts set the rest. Implants and high-cost supplies may be carved out and paid separately, depending on the contract.',
      'Every case is bought before it is billed: packs, implants, anesthesia supplies and staff time. Centers with several surgeons and specialties juggle dozens of vendors, so the monthly close and the payable run take real time.',
    ],
    look: ['Supply spend tracked by case, surgeon and specialty', 'Bill pay with approvals, since vendor bills are large and frequent', 'Cash back on surgical supplies you already buy', 'A forecast that accounts for case volume and payer timing', 'Separate accounts for operating, payroll and distributions to owners'],
  },
  dental: {
    paid: [
      'Dental practices collect from three places: dental insurance, patients and, for many, membership or in-house plans. Insurance usually covers a share of each procedure up to an annual maximum, so a large part of revenue comes straight from patients, often at the time of service.',
      'Dental supplies, lab fees and equipment are steady costs. Lab cases for crowns and implants are paid before the final procedure is billed, and equipment like scanners and chairs is often financed.',
    ],
    look: ['Easy ways to take patient payments and plan balances', 'Cash back on dental supplies and lab spend', 'Cards for hygienists and office managers with limits', 'Reporting by location for multi-office practices', 'Simple bookkeeping exports for your CPA'],
  },
  'eye-care': {
    paid: [
      'Eye care practices mix medical claims, vision plans and retail. Retina and medical ophthalmology rely on buy and bill for anti-VEGF injections, which Medicare Part B pays at a rate tied to average sales price. Cataract surgery adds lenses and packs bought before the case.',
      'Optical and premium lens sales are paid by the patient, often the same day, while vision plans and medical payers pay on their own timelines. A retina practice can carry a large balance of drug costs waiting on claims at any moment.',
    ],
    look: ['Buy-and-bill lending sized to your injection volume', 'Each drug payment checked against the allowed amount', 'Cards for lens and pack orders with surgical limits', 'Separate reporting for medical, optical and surgery', 'Cash back on drugs and supplies where card payment is accepted'],
  },
  'aesthetics-rehab': {
    paid: [
      'Aesthetics, physical therapy and rehab practices see high patient volume. Aesthetics is mostly self-pay, with neurotoxins, fillers and devices bought ahead. Therapy practices bill insurers per visit, often under per-visit caps, prior authorization and visit limits.',
      'Inventory for injectables needs careful tracking, since product is expensive and has expiry dates. Therapy clinics live on visit volume and clean claims, where small denials across many visits add up.',
    ],
    look: ['Cash back on injectables and clinic supplies', 'Card limits by provider and location', 'Patient payments, packages and memberships in one place', 'Visit-level reporting of what insurers paid', 'A forecast that reflects seasonal demand'],
  },
  'post-acute': {
    paid: [
      'Home health, hospice, skilled nursing and related providers are paid largely by Medicare and Medicaid under their own payment systems, with episodes or per-diem rates instead of per-visit fees. Payroll is the largest cost by far, and it comes due every week or two regardless of when payers pay.',
      'Claims can be held for documentation, eligibility checks or reviews, which delays cash for weeks. Supplies, mileage and staffing agencies add steady costs across many staff in the field.',
    ],
    look: ['A payroll-first cash forecast', 'Cards for field staff with mileage and supply limits', 'Matching of Medicare and Medicaid payments to claims', 'Fast visibility when a payer holds payments', 'Bill pay for staffing agencies and suppliers'],
  },
};
