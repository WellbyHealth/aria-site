# Builds the static site from one layout. Run: python3 tools/build.py
# The brand name lives in BRAND so it can be changed in one place.
import os, html, json

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BRAND = 'MD CFO'
SITE = 'https://md-cfo.vercel.app'
TAG = 'Your practice’s finance team, handled.'

NAV = [('/services', 'Services'), ('/pricing', 'Pricing'), ('/how-we-work', 'How we work')]

def esc(s): return html.escape(s, quote=True)

CSS = open(os.path.join(ROOT, 'tools', 'site.css')).read()

def page(path, title, desc, body, current=None, ld=None):
    nav = ''.join(f'<a href="{h}"' + (' aria-current="page"' if h == current else '') + f'>{t}</a>' for h, t in NAV)
    ldj = ''
    if ld:
        ldj = '<script type="application/ld+json">' + json.dumps({'@context': 'https://schema.org', '@graph': ld}).replace('<', '\\u003c') + '</script>'
    out = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
<link rel="canonical" href="{SITE}{'' if path == '/' else path}">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:url" content="{SITE}{'' if path == '/' else path}">
<meta property="og:image" content="{SITE}/assets/i/og.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#abdbef">
<link rel="icon" type="image/webp" href="/assets/i/wellby-flower-96.webp">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Figtree:wght@400..800&display=swap">
<style>{CSS}</style>
{ldj}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="top"><div class="bar"><a class="logo" href="/"><img src="/assets/i/wellby-flower-96.webp" alt="" width="32" height="32"><span>{BRAND}</span></a><nav class="nav" aria-label="Main">{nav}<a class="btn btn-sm" href="/checkup">Free checkup</a></nav></div></header>
<main id="main">
{body}
</main>
<footer class="foot"><div class="wrap">
<div class="foot-grid"><div><a class="logo" href="/"><img src="/assets/i/wellby-flower-96.webp" alt="" width="28" height="28"><span>{BRAND}</span></a><p>The finance team for independent medical practices. A service of Wellby Health.</p></div>
<div><b>Service</b><a href="/services">What we handle</a><a href="/pricing">Pricing</a><a href="/how-we-work">How we work</a><a href="/checkup">Free checkup</a></div>
<div><b>Company</b><a href="/how-we-work#team">Team</a><a href="/privacy">Privacy</a><a href="mailto:hello@wellbyhealth.com">hello@wellbyhealth.com</a></div></div>
<p class="legal">{BRAND} is a finance and accounting service of Wellby Health. We are not a bank, lender, payroll company or CPA firm. Bank accounts, cards, financing and payroll are provided by licensed partners and are subject to their approval and terms. Tax filings and tax advice stay with your CPA. Examples on this site are illustrations, not client results.</p>
<p class="legal">© 2026 Wellby Health</p>
</div></footer>
<script>{open(os.path.join(ROOT, 'tools', 'site.js')).read()}</script>
</body>
</html>
'''
    f = os.path.join(ROOT, 'index.html' if path == '/' else path.strip('/') + '.html')
    open(f, 'w').write(out)
    return path

ORG = {'@type': 'ProfessionalService', '@id': SITE + '/#org', 'name': BRAND, 'url': SITE + '/', 'description': 'Outsourced finance team and fractional CFO service for independent medical practices.', 'parentOrganization': {'@type': 'Organization', 'name': 'Wellby Health'}, 'areaServed': 'US'}

SERVICES = [
    ('accounting', 'Bookkeeping and monthly close', 'Books coded and closed by day 10, with a P&L for each location.', ['Every card charge, bill and deposit coded to your chart of accounts', 'Bank and card accounts reconciled each month', 'A monthly P&L by location, ready for you and your CPA']),
    ('bill-pay', 'Bills and vendor payments', 'Vendor bills collected, approved by you in one tap, paid on time.', ['Invoices gathered from email, portals and paper', 'Duplicates and price increases caught before payment', 'Payments scheduled around your cash, never late']),
    ('see', 'Getting paid: denials, underpayments and patient balances', 'We work the money insurers and patients still owe you.', ['Denials sorted by dollars at stake and appealed with your biller', 'Insurer payments checked against your contracted rates', 'Patient balances followed up without awkward calls']),
    ('payroll', 'Payroll', 'Payroll run on time, with the cash planned for it.', ['Pay runs, new hires, raises and bonuses handled', 'Cash checked ahead of every payroll', 'Run through your payroll provider or a partner provider']),
    ('card', 'Cards and expenses', 'A card for each team member, with limits you set and receipts matched.', ['Cards with spending limits by person and category', 'Receipts collected and matched to every charge', 'No more month-end receipt hunts']),
    ('partners', 'Banking and cash', 'The right accounts in place, and enough cash ready for every bill.', ['Operating and payroll accounts set up through partner banks', 'Idle cash kept separate from bill money', 'A 13-week cash forecast so payroll never surprises you']),
    ('claims', 'Financing and factoring', 'Access to working capital when insurers are slow or you’re growing.', ['Advances on submitted claims through partner lenders', 'Lines of credit and equipment financing options compared for you', 'Every offer explained in plain terms before you sign']),
    ('cfo-hub', 'CFO advice', 'A named CFO who knows how practices get paid, on call for the big decisions.', ['A monthly review of profit, cash and what changed', 'Budgets, hiring plans and new-location numbers', 'Support for partner buy-ins, refinancing or a sale']),
]

def svc_grid(limit=None, detail=False):
    items = []
    for ic, name, line, bullets in SERVICES[:limit]:
        bl = ('<ul>' + ''.join(f'<li>{esc(b)}</li>' for b in bullets) + '</ul>') if detail else ''
        items.append(f'<li class="svc"><span class="svc-ic"><img src="/assets/i/icon-{ic}-cut.webp" alt="" width="64" height="64" loading="lazy" decoding="async"></span><h3>{esc(name)}</h3><p>{esc(line)}</p>{bl}</li>')
    return '<ul class="svc-grid">' + ''.join(items) + '</ul>'

FAQ = [
    ('Do I have to replace my bookkeeper, biller or CPA?', 'No. We can take over the work, or run it alongside the people you trust. Most practices keep their CPA for taxes; we hand them clean books every month.'),
    ('Who approves payments?', 'You do. Nothing is paid and no account is opened without your sign-off. Approvals take a few minutes a week from your phone.'),
    ('Are you a bank or a lender?', 'No. We’re a finance service. Bank accounts, cards, financing and payroll come from licensed partners, subject to their approval and terms, and we manage them for you.'),
    ('How do you handle patient information?', 'Billing follow-up touches patient data, so we sign a business associate agreement with your practice before we start and only work in systems that meet HIPAA requirements.'),
    ('What does it cost?', 'A flat monthly fee based on what you hand us, starting at $2,500 a month. Our first practices get a 90-day pilot at half price. See pricing for details.'),
    ('How long does it take to start?', 'About two weeks: a checkup, a kickoff call, access to your accounts, then we take over one area at a time.'),
]

def faq_block():
    return '<div class="faq">' + ''.join(f'<details><summary>{esc(q)}</summary><p>{esc(a)}</p></details>' for q, a in FAQ) + '</div>'

CTA = '''<section class="sec cta-band"><div class="wrap cta-in"><div><h2>Start with a free Practice Money Checkup.</h2><p>Send us three months of bank statements, insurer remittances and your P&L. In five business days you get a one-page report: where money is leaking, what it’s worth, and what we’d fix first. No cost, no commitment.</p></div><a class="btn btn-y" href="/checkup">Book a free checkup <span class="arr" aria-hidden="true">→</span></a></div></section>'''

CTA_HOME = '''<section class="sec cta-band"><div class="wrap cta-in"><div><h2>Start with a free Practice Money Checkup.</h2><ul class="cta-ticks"><li>A one-page report in five business days</li><li>Where money is leaking, in dollars</li><li>What we’d fix first, and what it would cost</li></ul></div><div class="cta-side"><a class="btn btn-y" href="/checkup">Book a free checkup <span class="arr" aria-hidden="true">→</span></a><p>No cost, no commitment. Or email <a href="mailto:hello@wellbyhealth.com">hello@wellbyhealth.com</a>.</p></div></div></section>'''

def build():
    pages = []
    # ---------- home ----------
    PAINS = [
        ('denials', 'Denials nobody appeals', 'Your biller works the claims they have time for. The rest quietly expire.'),
        ('see', 'Insurers paying below contract', 'Nobody checks each payment against your contracted rate, so short pays go unnoticed.'),
        ('bill-pay', 'Bills paid late or twice', 'Invoices arrive by email, portal and paper, and some get paid twice while others pick up late fees.'),
        ('accounting', 'Books a month behind', 'You make hiring and spending calls on numbers from six weeks ago.'),
        ('treasury', 'Cash you can’t see coming', 'Payroll lands on a Friday and you check the balance on Thursday night.'),
    ]
    pains = ''.join(f'<li class="pain"><img src="/assets/i/icon-{ic}-cut.webp" alt="" width="56" height="56" loading="lazy" decoding="async"><h3>{esc(t)}</h3><p>{esc(d)}</p></li>' for ic, t, d in PAINS)

    WEEK = [
        ('bill-pay', 'Approve 4 vendor bills', '$6,410 · due this week · all checked against last order', 'Approve'),
        ('see', 'Recovered from underpaid claims', '$3,280 across 11 claims from two insurers', 'See claims'),
        ('payroll', 'Payroll on Friday is covered', '$41,200 already set aside in the payroll account', None),
        ('cfo-hub', 'One decision for you', 'Lease or buy the new ultrasound? Our numbers and recommendation inside.', 'Review'),
    ]
    week = ''.join(f'<li><span class="wk-ic"><img src="/assets/i/icon-{ic}-cut.webp" alt="" width="40" height="40" loading="lazy" decoding="async"></span><span class="wk-t"><b>{esc(t)}</b><span>{esc(m)}</span></span>' + (f'<span class="wk-btn" aria-hidden="true">{esc(b)}</span>' if b else '<span class="wk-ok" aria-hidden="true">Ready</span>') + '</li>' for ic, t, m, b in WEEK)

    SPECS = [
        ('primary-care', 'Primary care', 'Lots of small claims and rising patient balances.',
         ['Chase denied visits and preventive claims by dollar value', 'Collect high-deductible patient balances without collection calls', 'Plan cash around payroll, your biggest cost'],
         ['Remittances by insurer', 'Patient balance aging', 'Payroll and staffing costs'],
         'A weekly list of money recovered and a payroll-ready cash forecast'),
        ('orthopedics', 'Orthopedics', 'High-dollar surgical claims where one short pay matters.',
         ['Check surgical and imaging payments against contracted rates', 'Appeal prior-authorization denials with your biller', 'Keep implant and supply bills from being paid twice'],
         ['Contracts and fee schedules', 'Surgical claim remittances', 'Supply and implant invoices'],
         'Underpayments listed claim by claim, with appeals already filed'),
        ('dermatology', 'Dermatology', 'Insurance and cash-pay revenue in the same practice.',
         ['Separate medical and cosmetic revenue on your P&L', 'Cut card processing and product costs', 'Track pathology and supply bills by location'],
         ['Card processor statements', 'Product and supply invoices', 'Medical versus cosmetic revenue'],
         'A P&L that shows which side of the practice makes the money'),
        ('dental', 'Dental', 'PPO fee schedules and lab bills that drift upward.',
         ['Check PPO payments against your fee schedules', 'Review lab and supply bills before they’re paid', 'Set up patient payment plans that actually get paid'],
         ['PPO fee schedules and EOBs', 'Lab and supply invoices', 'Patient payment plans'],
         'Fee schedule gaps in dollars, and which plans to renegotiate'),
        ('location', 'Groups with several locations', 'More sites, more accounts, and no single view.',
         ['A P&L and cash view for every location', 'Payroll and bills run across all sites', 'Numbers ready for a new location, a partner or a lender'],
         ['Every location’s bank and card accounts', 'Payroll by site', 'Leases, loans and expansion plans'],
         'One monthly package that rolls up every location'),
    ]
    tabs, panels = [], []
    for i, (k, name, sub, do, look, lands) in enumerate(SPECS):
        img = f'/assets/i/icon-{k}-cut.webp' if k == 'location' else f'/assets/i/st-{k}.webp'
        sel = 'true' if i == 0 else 'false'
        tabs.append(f'<button type="button" role="tab" id="tab-{k}" aria-controls="panel-{k}" aria-selected="{sel}" tabindex="{0 if i == 0 else -1}"><img src="{img}" alt="" width="36" height="36" loading="lazy" decoding="async"><span>{esc(name)}</span></button>')
        panels.append(f'<div class="ex-panel" role="tabpanel" id="panel-{k}" aria-labelledby="tab-{k}"' + ('' if i == 0 else ' hidden') + f'><div class="ex-head"><img src="{img}" alt="" width="72" height="72" loading="lazy" decoding="async"><div><h3>{esc(name)}</h3><p>{esc(sub)}</p></div></div><div class="ex-cols"><div><p class="ex-k">What we take on first</p><ul class="ticks">' + ''.join(f'<li>{esc(x)}</li>' for x in do) + '</ul></div><div><p class="ex-k">What we look at</p><ul class="chips">' + ''.join(f'<li>{esc(x)}</li>' for x in look) + f'</ul><p class="ex-k">What lands on your desk</p><p>{esc(lands)}</p></div></div></div>')

    CMP = [
        ('Who owns the whole picture', 'You, after clinic', 'One person, if you can find them', 'One team, with a named CFO'),
        ('What it costs', 'Several vendors, plus your evenings', 'A six-figure salary plus benefits', 'One flat fee, from $2,500 a month'),
        ('Denials and underpayments', 'Worked when someone has time', 'Overseen, not worked', 'Worked claim by claim, every month'),
        ('Books', 'Caught up monthly or quarterly', 'Depends on the team under them', 'Closed by day 10, every month'),
        ('Cash forecast', 'In your head', 'Usually', '13 weeks ahead, updated weekly'),
        ('Commitment', 'Several contracts, all different', 'An employee', 'Month to month after the pilot'),
    ]
    cmp_rows = ''.join(f'<tr><th scope="row">{esc(a)}</th><td>{esc(b)}</td><td>{esc(c)}</td><td>{esc(d)}</td></tr>' for a, b, c, d in CMP)

    AUD = [
        ('opening', 'Opening a practice', 'Get the accounts, payroll, cards and books set up right the first time, and a cash plan for the first year.'),
        ('running', 'Running one practice', 'Hand off the bills, books and billing follow-up, and get your evenings back.'),
        ('growing', 'Growing to more locations', 'See every location in one place and have the numbers ready for a partner, a lender or a sale.'),
    ]
    aud = ''.join(f'<li class="aud"><figure><img src="/assets/i/stage-{k}-480.webp" srcset="/assets/i/stage-{k}-480.webp 480w, /assets/i/stage-{k}-800.webp 800w" sizes="(max-width:980px) 100vw, 380px" width="480" height="358" alt="" loading="lazy" decoding="async"></figure><h3>{esc(t)}</h3><p>{esc(d)}</p></li>' for k, t, d in AUD)

    home = f'''
<section class="hero">
<div class="sky"><figure class="hero-art"><img src="/assets/i/hero-cleared-1584.webp" srcset="/assets/i/hero-cleared-900.webp 900w, /assets/i/hero-cleared-1584.webp 1584w" sizes="100vw" width="1584" height="672" alt="Clay illustration of a cleared doctor’s desk while a cart carries away the bills, receipts, payroll and bank paperwork."></figure></div>
<div class="band"><div class="wrap band-grid">
<div class="band-title"><p class="eyebrow on-dark"><span>Fractional CFO for independent practices</span></p>
<h1>You run the practice. <span class="pop">We run the money.</span></h1>
<p class="lede">Banking, payroll, bills, books, billing follow-up, cards and financing, handled by one team for one monthly fee. You collect more, keep more, and stop doing finance at night.</p>
<div class="cta-row"><a class="btn btn-y" href="/checkup">Book a free checkup <span class="arr" aria-hidden="true">→</span></a><a class="link on-dark" href="#how">See how it works</a></div>
<p class="fine">Built for owner-physicians with one to ten locations.</p></div>
<figure class="wk" aria-label="Example of the weekly list an owner receives"><div class="wk-top"><b>This week</b><span class="sample">Sample data</span></div><ul>{week}</ul><figcaption>An example of what an owner sees each week. Every practice’s list is its own.</figcaption></figure>
</div></div>
</section>

<section class="sec" id="how"><div class="wrap">
<div class="head"><p class="eyebrow"><span>How it works</span></p><h2>Ten minutes a week. We do the rest.</h2></div>
<ol class="steps">
<li><div class="step-vis"><img src="/assets/i/scene-see-900.webp" alt="" width="900" height="382" loading="lazy" decoding="async"></div><div class="step-copy"><span class="num">1</span><h3>Free checkup</h3><p>We read three months of statements, remittances and your P&L, and show you what’s leaking, in dollars.</p></div></li>
<li><div class="step-vis"><img src="/assets/i/scene-accounting-900.webp" alt="" width="900" height="382" loading="lazy" decoding="async"></div><div class="step-copy"><span class="num">2</span><h3>Two-week handoff</h3><p>We connect to your accounts, meet your biller and CPA, and take over one area at a time.</p></div></li>
<li><div class="step-vis"><img src="/assets/i/stage-running-800.webp" alt="" width="800" height="597" loading="lazy" decoding="async"></div><div class="step-copy"><span class="num">3</span><h3>Ten minutes a week</h3><p>One short list on your phone: approve, see what we recovered, make the one call that’s yours. One review a month.</p></div></li>
</ol></div></section>

<section class="sec alt"><div class="wrap">
<div class="head"><p class="eyebrow"><span>The problem</span></p><h2>Your practice’s money runs through five vendors and lands on you.</h2>
<p class="lede">A bookkeeper, a biller, a bank, a payroll company and a CPA you see at tax time. Nobody owns the whole picture, so it leaks in the same five places.</p></div>
<ul class="pains">{pains}</ul>
</div></section>

<section class="sec" id="handle"><div class="wrap">
<div class="head"><p class="eyebrow"><span>What we take off your plate</span></p><h2>One team for every part of your practice’s finances.</h2></div>
{svc_grid()}
<p class="center"><a class="link" href="/services">See each service in detail →</a></p>
</div></section>

<section class="sec alt"><div class="wrap">
<div class="head"><p class="eyebrow"><span>Before and after</span></p><h2>The same practice, two ways.</h2></div>
<figure class="wide-art"><img src="/assets/i/compare-split-1584.webp" srcset="/assets/i/compare-split-900.webp 900w, /assets/i/compare-split-1584.webp 1584w" sizes="(max-width:1120px) 100vw, 1080px" width="1584" height="672" alt="Clay illustration: a grey pile of bills, receipts and a calculator on one side, and a bright practice with money and mail flowing in on the other." loading="lazy" decoding="async"></figure>
<div class="ba">
<div class="ba-col ba-before"><p class="ba-k">Your month today</p><ul><li>Statements in five places, and none of them agree</li><li>Denials pile up until they expire</li><li>Books closed weeks late, if at all</li><li>Payroll checked against the balance the night before</li><li>Finance questions answered after clinic</li></ul></div>
<div class="ba-col ba-after"><p class="ba-k">Your month with {BRAND}</p><ul class="ticks"><li>Closed books and a P&L for each location by day 10</li><li>Money recovered from denials and underpayments, listed claim by claim</li><li>A 13-week cash forecast, with payroll and big bills marked</li><li>Bills paid, cards reviewed, and anything unusual flagged</li><li>Three decisions for you, with our recommendation on each</li></ul></div>
</div>
</div></section>

<section class="sec" id="examples"><div class="wrap">
<div class="head"><p class="eyebrow"><span>For your specialty</span></p><h2>What we’d work on first in a practice like yours.</h2></div>
<div data-tabs><div class="ex-tabs" role="tablist" aria-label="Practice types">{''.join(tabs)}</div>{''.join(panels)}</div>
<p class="fine center">Example plans. Every practice’s checkup sets its own priorities.</p>
</div></section>

<section class="sec alt"><div class="wrap">
<div class="head"><p class="eyebrow"><span>Your options</span></p><h2>Three ways to run a practice’s finances.</h2></div>
<div class="cmp-wrap"><table class="cmp"><thead><tr><th scope="col"><span class="sr">Question</span></th><th scope="col">Doing it yourself<small>Bookkeeper, biller, bank, payroll and CPA</small></th><th scope="col">Hiring a CFO<small>A full-time finance leader</small></th><th scope="col" class="us">{BRAND}<small>One team, one monthly fee</small></th></tr></thead><tbody>{cmp_rows}</tbody></table></div>
</div></section>

<section class="sec"><div class="wrap">
<div class="head"><p class="eyebrow"><span>Who it’s for</span></p><h2>Wherever your practice is today.</h2></div>
<ul class="auds">{aud}</ul>
</div></section>

<section class="sec alt"><div class="wrap">
<div class="head"><p class="eyebrow"><span>You stay in control</span></p><h2>A finance team you can trust with the keys.</h2></div>
<ul class="trust">
<li><img src="/assets/i/icon-roles-cut.webp" alt="" width="64" height="64" loading="lazy" decoding="async"><b>You approve every dollar</b><span>Nothing is paid, opened or borrowed without your sign-off, from your phone.</span></li>
<li><img src="/assets/i/icon-patient-cut.webp" alt="" width="64" height="64" loading="lazy" decoding="async"><b>Patient data, protected</b><span>We sign a business associate agreement before we see any patient information.</span></li>
<li><img src="/assets/i/icon-partners-cut.webp" alt="" width="64" height="64" loading="lazy" decoding="async"><b>Licensed partners</b><span>Banking, cards, payroll and financing come from licensed partners, with their terms shown first.</span></li>
</ul>
<p class="center"><a class="link" href="/how-we-work">How we work <span class="arr" aria-hidden="true">→</span></a></p>
</div></section>

<section class="sec"><div class="wrap">
<div class="head"><p class="eyebrow"><span>Pricing</span></p><h2>A flat monthly fee. No long contract.</h2></div>
<div class="tiers mini">
<a class="tier" href="/pricing#essentials"><b>Essentials</b><span class="price">$2,500<small>/month</small></span><span>Books, bills and a monthly CFO review</span></a>
<a class="tier pick" href="/pricing#full"><span class="badge">Most practices</span><b>Full CFO</b><span class="price">$5,000<small>/month</small></span><span>Everything in Essentials, plus getting paid, payroll, cards and cash planning</span></a>
<a class="tier" href="/pricing#growth"><b>Growth</b><span class="price">From $8,000<small>/month</small></span><span>For groups adding locations, partners or financing</span></a>
</div>
<p class="center fine">Our first five practices get a 90-day pilot at half price.</p>
</div></section>

<section class="sec alt"><div class="wrap faq-grid">
<div><div class="head"><p class="eyebrow"><span>Questions</span></p><h2>What owners ask us.</h2></div><figure class="faq-art"><img src="/assets/i/scene-see-900.webp" alt="" width="900" height="382" loading="lazy" decoding="async"></figure><p class="faq-more">Still curious? <a href="mailto:hello@wellbyhealth.com">Email us</a> and you’ll hear back from a person.</p></div>
{faq_block()}
</div></section>
{CTA_HOME}'''
    pages.append(page('/', f'{BRAND} | Fractional CFO and finance team for medical practices', 'We run your practice’s finances: books, bills, payroll, billing follow-up, cards, banking and financing, for one monthly fee. Book a free Practice Money Checkup.', home, ld=[ORG, {'@type': 'FAQPage', 'mainEntity': [{'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a}} for q, a in FAQ]}]))

    # ---------- services ----------
    blocks = []
    for i, (ic, name, line, bullets) in enumerate(SERVICES):
        who = {'payroll': 'Run through your payroll provider or a licensed partner provider.', 'card': 'Cards are issued by a partner bank and subject to approval.', 'partners': 'Accounts are held at partner banks. We are not a bank.', 'claims': 'Financing comes from partner lenders and is subject to their approval and terms.', 'see': 'We work alongside your current biller or billing company.'}.get(ic, 'Done by our team, in your accounting system.')
        blocks.append(f'<article class="svc-row" id="{ic}"><span class="svc-ic big"><img src="/assets/i/icon-{ic}-cut.webp" alt="" width="96" height="96" loading="lazy" decoding="async"></span><div><h2>{esc(name)}</h2><p class="lede-sm">{esc(line)}</p><ul class="ticks">' + ''.join(f'<li>{esc(b)}</li>' for b in bullets) + f'</ul><p class="who"><b>You still decide:</b> every payment, account and offer. <b>Who provides it:</b> {esc(who)}</p></div></article>')
    services = f'''
<section class="sec page-top"><div class="wrap"><p class="eyebrow"><span>What we handle</span></p><h1>Everything finance, handled by one team.</h1><p class="lede">Hand us one area or all eight. We start where the money is leaking and take over the rest at your pace.</p></div></section>
<section class="sec tight"><div class="wrap svc-list">{''.join(blocks)}</div></section>
<section class="sec"><div class="wrap"><figure class="wide-art"><img src="/assets/i/scene-accounting-1584.webp" srcset="/assets/i/scene-accounting-900.webp 900w, /assets/i/scene-accounting-1584.webp 1584w" sizes="(max-width:1120px) 100vw, 1080px" width="1584" height="672" alt="Clay illustration of a tidy bookkeeping desk with binders and an open ledger." loading="lazy" decoding="async"></figure></div></section>
{CTA}'''
    pages.append(page('/services', f'Services: books, bills, payroll, billing and banking | {BRAND}', 'Bookkeeping, bill pay, denials and underpayments, payroll, cards, banking and financing for independent medical practices, run by one finance team.', services, '/services', ld=[ORG]))

    # ---------- pricing ----------
    pricing = f'''
<section class="sec page-top"><div class="wrap"><p class="eyebrow"><span>Pricing</span></p><h1>One flat monthly fee for your whole finance function.</h1><p class="lede">Priced by what you hand us, not by the hour. Month to month after the pilot.</p></div></section>
<section class="sec tight"><div class="wrap"><div class="tiers">
<div class="tier" id="essentials"><b>Essentials</b><span class="price">$2,500<small>/month</small></span><p>For practices that want clean books and bills off their plate.</p><ul class="ticks"><li>Bookkeeping and monthly close</li><li>Bill collection, approval and payment</li><li>Monthly P&L and CFO review call</li></ul><a class="btn ghost" href="/checkup">Start with a checkup</a></div>
<div class="tier pick" id="full"><span class="badge">Most practices</span><b>Full CFO</b><span class="price">$5,000<small>/month</small></span><p>For owners who want the whole function handled.</p><ul class="ticks"><li>Everything in Essentials</li><li>Denials, underpayments and patient balances</li><li>Payroll management</li><li>Cards and expense management</li><li>13-week cash forecast and banking set-up</li></ul><a class="btn" href="/checkup">Start with a checkup</a></div>
<div class="tier" id="growth"><b>Growth</b><span class="price">From $8,000<small>/month</small></span><p>For groups adding locations, partners or financing.</p><ul class="ticks"><li>Everything in Full CFO</li><li>Reporting for every location</li><li>Financing and banking strategy</li><li>Budgets, hiring and expansion plans</li><li>Partner buy-in, refinancing or sale readiness</li></ul><a class="btn ghost" href="/checkup">Start with a checkup</a></div>
</div>
<div class="pilot"><h2>Founding practice pilot</h2><p>Our first five practices get 90 days at half price. If it works, we ask for an honest testimonial and an introduction to a colleague. If it doesn’t, you walk away with clean books.</p></div>
<div class="split notincl"><div><h3>Not included</h3><p>Tax returns and tax advice (your CPA keeps that), legal work, and the cost of partner products such as card fees or loan charges, which are always shown to you before you choose them.</p></div><div><h3>Already have a bookkeeper or biller?</h3><p>Keep them. We price down for the work they keep and run everything around them.</p></div></div>
</div></section>
{CTA}'''
    pages.append(page('/pricing', f'Pricing: flat monthly fee from $2,500 | {BRAND}', 'Fractional CFO and finance team pricing for medical practices: Essentials $2,500, Full CFO $5,000, Growth from $8,000 a month. Founding pilot at half price.', pricing, '/pricing', ld=[ORG]))

    # ---------- how we work ----------
    how = f'''
<section class="sec page-top"><div class="wrap"><p class="eyebrow"><span>How we work</span></p><h1>A finance team you can trust with the keys.</h1><p class="lede">Clear access, clear approvals, and a named person who answers.</p></div></section>
<section class="sec tight"><div class="wrap">
<h2>Your first 30 days</h2>
<ol class="steps">
<li><b>Days 1 to 5: Checkup.</b><span>We read your statements, remittances and P&L and show you what we found.</span></li>
<li><b>Days 6 to 10: Kickoff.</b><span>We sign a business associate agreement, get read-only access first, and meet your biller and CPA.</span></li>
<li><b>Days 11 to 20: Handoff.</b><span>We take over books and bills first, then billing follow-up and payroll.</span></li>
<li><b>Day 30: First review.</b><span>Closed books, a cash forecast, and the first money recovered or saved.</span></li>
</ol>
<figure class="wide-art"><img src="/assets/i/scene-cfo-hub-1584.webp" srcset="/assets/i/scene-cfo-hub-900.webp 900w, /assets/i/scene-cfo-hub-1584.webp 1584w" sizes="(max-width:1120px) 100vw, 1080px" width="1584" height="672" alt="Clay illustration of a calm practice owner’s office with a dashboard on the monitor." loading="lazy" decoding="async"></figure>
</div></section>
<section class="sec alt"><div class="wrap split">
<div><h2>You stay in control</h2></div>
<ul class="ticks"><li>You approve every payment, account and financing offer</li><li>Access is role-based and can be removed at any time</li><li>Patient data stays in HIPAA-compliant systems, under a signed agreement</li><li>Partners are named and their terms shown before you choose anything</li><li>Month to month: if we stop earning our fee, you can leave</li></ul>
</div></section>
<section class="sec" id="team"><div class="wrap split">
<div><div class="head"><p class="eyebrow"><span>Team</span></p><h2>Who you work with</h2></div></div>
<div class="prose"><p><b>Yaniv Sadka, CFO lead.</b> Healthcare venture investor and operator. During our founding pilots, Yaniv leads every practice personally.</p><p>He’s supported by healthcare bookkeeping and billing specialists, and by licensed partners for banking, cards, payroll and financing.</p></div>
</div></section>
<section class="sec alt"><div class="wrap split">
<div><div class="head"><p class="eyebrow"><span>Our systems</span></p><h2>Why we can do this for a flat fee</h2></div></div>
<div class="prose"><p>We run your finances on our own systems for bill pay, bookkeeping, payment checks and cash forecasting. That keeps our team small and focused on judgment calls, which is why the fee is a fraction of hiring a controller and a CFO.</p></div>
</div></section>
{CTA}'''
    pages.append(page('/how-we-work', f'How we work: approvals, access and HIPAA | {BRAND}', 'How our finance team works with your practice: the first 30 days, approvals, access, HIPAA and the people you work with.', how, '/how-we-work', ld=[ORG]))

    # ---------- checkup ----------
    sel = lambda name, label, opts, req=True: f'<div class="field"><label for="f-{name}">{label}</label><select id="f-{name}" name="{name}"' + (' required' if req else '') + '><option value="">Choose one</option>' + ''.join(f'<option>{esc(o)}</option>' for o in opts) + '</select></div>'
    inp = lambda name, label, typ='text', req=True, ac='': f'<div class="field"><label for="f-{name}">{label}</label><input id="f-{name}" name="{name}" type="{typ}"' + (f' autocomplete="{ac}"' if ac else '') + (' required' if req else '') + '></div>'
    checkup = f'''
<section class="sec page-top"><div class="wrap split checkup">
<div><p class="eyebrow"><span>Free Practice Money Checkup</span></p><h1>See where your practice’s money is leaking.</h1><p class="lede">A one-page report in five business days. No cost and no commitment.</p>
<h3>What we look at</h3><ul class="ticks"><li>Three months of bank and card statements</li><li>Insurer remittances (ERAs or EOBs)</li><li>Your latest P&L</li></ul>
<h3>What you get back</h3><ul class="ticks"><li>Money leaking from denials, underpayments and late or duplicate bills, in dollars</li><li>Where cash will be tight over the next 13 weeks</li><li>What we’d fix first, and what it would cost to hand it to us</li></ul>
<p class="fine">We sign a confidentiality agreement before you share anything, and a business associate agreement before we see patient data.</p></div>
<div><form class="card-form" id="checkup-form" novalidate><h2>Book your checkup</h2>
<div class="f2">{inp('name', 'Your name', ac='name')}{inp('practice', 'Practice name', ac='organization')}</div>
<div class="f2">{inp('email', 'Work email', 'email', ac='email')}{inp('phone', 'Mobile (optional)', 'tel', False, 'tel')}</div>
<div class="f2">{sel('specialty', 'Specialty', ['Primary care', 'Pediatrics', 'OB-GYN', 'Dermatology', 'Orthopedics', 'Cardiology', 'Gastroenterology', 'Ophthalmology or optometry', 'Dental', 'Physical therapy', 'Behavioral health', 'Surgery center', 'Other specialty'])}{sel('locations', 'Locations', ['1', '2 to 3', '4 to 10', 'More than 10'])}</div>
<div class="f2">{sel('revenue', 'Annual revenue', ['Under $1M', '$1M to $3M', '$3M to $10M', 'Over $10M', 'Prefer not to say'], False)}{sel('headache', 'Biggest money headache', ['Getting paid by insurers', 'Denials and underpayments', 'Bookkeeping is behind', 'Cash flow and payroll', 'Bills and vendors', 'Too many vendors to manage', 'Planning growth or a sale'], False)}</div>
<div class="field"><label for="f-note">Anything we should know? (optional)</label><textarea id="f-note" name="note" rows="3"></textarea></div>
<input type="text" name="company_site" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
<p class="form-err" role="alert" hidden></p>
<button class="btn wide" type="submit">Book my free checkup</button>
<p class="fine">We’ll reply within one business day to set a time. We only use your details to contact you about the checkup.</p></form>
<div class="card-form done" id="checkup-done" hidden tabindex="-1"><h2>Thanks, you’re booked in.</h2><p>We’ll email you within one business day to pick a time and send a secure link for your documents.</p></div></div>
</div></section>'''
    pages.append(page('/checkup', f'Free Practice Money Checkup | {BRAND}', 'Book a free Practice Money Checkup: a one-page report on where your practice’s money is leaking, in five business days.', checkup, '/checkup', ld=[ORG]))

    # ---------- privacy ----------
    privacy = '''<section class="sec page-top"><div class="wrap prose narrow"><h1>Privacy</h1><p>When you book a checkup we collect the details you enter in the form: your name, practice, contact details and the answers you choose. We use them only to contact you about the checkup and our service. We don’t sell them or share them with advertisers.</p><p>Documents you send for a checkup are covered by a confidentiality agreement, and patient information only by a signed business associate agreement. To ask us to delete your details, email hello@wellbyhealth.com.</p><p>This is a summary; a full privacy policy will be published before the service launches widely.</p></div></section>'''
    pages.append(page('/privacy', f'Privacy | {BRAND}', f'How {BRAND} uses the details you share with us.', privacy))

    sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + ''.join(f'  <url><loc>{SITE}{"" if p == "/" else p}</loc></url>\n' for p in pages) + '</urlset>\n'
    open(os.path.join(ROOT, 'sitemap.xml'), 'w').write(sm)
    open(os.path.join(ROOT, 'robots.txt'), 'w').write(f'User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: {SITE}/sitemap.xml\n')
    print('built', pages)

build()
