# Builds the static site from one layout. Run: python3 tools/build.py
# The brand name lives in BRAND so it can be changed in one place.
import os, html, json

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BRAND = 'Ledgerwell'
SITE = 'https://ledgerwell-lemon.vercel.app'
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

CTA = '''<section class="sec cta-band"><div class="wrap cta-in"><div><h2>Start with a free Practice Money Checkup.</h2><p>Send us three months of bank statements, insurer remittances and your P&L. In five business days you get a one-page report: where money is leaking, what it’s worth, and what we’d fix first. No cost, no commitment.</p></div><a class="btn" href="/checkup">Book a free checkup</a></div></section>'''

def build():
    pages = []
    # ---------- home ----------
    home = f'''
<section class="hero"><div class="wrap hero-in">
<div class="hero-copy"><p class="eyebrow">Fractional CFO and finance team for independent practices</p>
<h1>You run the practice. <span class="hl">We run the money.</span></h1>
<p class="lede">Banking, payroll, bills, books, billing follow-up, cards and financing, handled by one team for one monthly fee. You collect more, keep more, and stop doing finance at night.</p>
<div class="cta-row"><a class="btn" href="/checkup">Book a free checkup</a><a class="link" href="/services">See what we handle →</a></div>
<p class="fine">Built for owner-physicians with one to ten locations.</p></div>
<figure class="hero-art"><img src="/assets/i/hero-cleared-1584.webp" srcset="/assets/i/hero-cleared-900.webp 900w, /assets/i/hero-cleared-1584.webp 1584w" sizes="(max-width:900px) 100vw, 1100px" width="1584" height="672" alt="Clay illustration of a cleared doctor’s desk while a cart carries away the bills, receipts, payroll and bank paperwork."></figure>
</div></section>

<section class="sec"><div class="wrap split">
<div><p class="eyebrow">The problem</p><h2>Your practice’s money runs through five vendors and lands on you.</h2></div>
<div class="prose"><p>A bookkeeper who catches up once a month. A biller who works the claims they have time for. A bank, a payroll company, a card, and a CPA you see at tax time. Nobody owns the whole picture, so you do, after clinic.</p><p>That gap costs real money: denials nobody appeals, insurer payments below your contract, bills paid late or twice, cash sitting idle while you worry about payroll.</p></div>
</div>
<div class="wrap"><figure class="wide-art"><img src="/assets/i/problem-scatter-1584.webp" srcset="/assets/i/problem-scatter-900.webp 900w, /assets/i/problem-scatter-1584.webp 1584w" sizes="(max-width:1120px) 100vw, 1080px" width="1584" height="672" alt="Clay illustration of a practice’s finances scattered across a table: bills, receipts, cards, a calculator and loose coins." loading="lazy" decoding="async"></figure></div>
</section>

<section class="sec alt" id="handle"><div class="wrap">
<p class="eyebrow">What we take off your plate</p><h2>One team for every part of your practice’s finances.</h2>
{svc_grid()}
<p class="center"><a class="link" href="/services">See each service in detail →</a></p>
</div></section>

<section class="sec"><div class="wrap">
<p class="eyebrow">How it works</p><h2>Three steps, and finance is off your desk.</h2>
<ol class="steps">
<li><b>Free checkup.</b><span>We review three months of statements, remittances and your P&L, then show you what’s leaking and what it’s worth.</span></li>
<li><b>Two-week handoff.</b><span>We connect to your accounts, meet your biller and CPA, and take over one area at a time.</span></li>
<li><b>Ten minutes a week.</b><span>You approve payments from your phone and get one monthly review. We handle everything else.</span></li>
</ol></div></section>

<section class="sec alt"><div class="wrap split">
<div><p class="eyebrow">Every month</p><h2>What lands in your inbox.</h2><p class="prose">One package, one review call, and a named person to text.</p></div>
<ul class="ticks">
<li>Closed books and a P&L for each location by day 10</li>
<li>A 13-week cash forecast, with payroll and big bills marked</li>
<li>Money recovered from denials and underpayments, listed claim by claim</li>
<li>Bills paid, cards reviewed, and anything unusual flagged</li>
<li>Three decisions for you, with our recommendation on each</li>
</ul></div></section>

<section class="sec"><div class="wrap">
<p class="eyebrow">Pricing</p><h2>A flat monthly fee. No long contract.</h2>
<div class="tiers mini">
<a class="tier" href="/pricing#essentials"><b>Essentials</b><span class="price">$2,500<small>/month</small></span><span>Books, bills and a monthly CFO review</span></a>
<a class="tier pick" href="/pricing#full"><b>Full CFO</b><span class="price">$5,000<small>/month</small></span><span>Everything in Essentials, plus getting paid, payroll, cards and cash planning</span></a>
<a class="tier" href="/pricing#growth"><b>Growth</b><span class="price">From $8,000<small>/month</small></span><span>For groups adding locations, partners or financing</span></a>
</div>
<p class="center fine">Our first five practices get a 90-day pilot at half price.</p>
</div></section>

<section class="sec alt"><div class="wrap split">
<div><p class="eyebrow">Questions</p><h2>What owners ask us.</h2></div>
{faq_block()}
</div></section>
{CTA}'''
    pages.append(page('/', f'{BRAND} | Fractional CFO and finance team for medical practices', 'We run your practice’s finances: books, bills, payroll, billing follow-up, cards, banking and financing, for one monthly fee. Book a free Practice Money Checkup.', home, ld=[ORG, {'@type': 'FAQPage', 'mainEntity': [{'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a}} for q, a in FAQ]}]))

    # ---------- services ----------
    blocks = []
    for i, (ic, name, line, bullets) in enumerate(SERVICES):
        who = {'payroll': 'Run through your payroll provider or a licensed partner provider.', 'card': 'Cards are issued by a partner bank and subject to approval.', 'partners': 'Accounts are held at partner banks. We are not a bank.', 'claims': 'Financing comes from partner lenders and is subject to their approval and terms.', 'see': 'We work alongside your current biller or billing company.'}.get(ic, 'Done by our team, in your accounting system.')
        blocks.append(f'<article class="svc-row" id="{ic}"><span class="svc-ic big"><img src="/assets/i/icon-{ic}-cut.webp" alt="" width="96" height="96" loading="lazy" decoding="async"></span><div><h2>{esc(name)}</h2><p class="lede-sm">{esc(line)}</p><ul class="ticks">' + ''.join(f'<li>{esc(b)}</li>' for b in bullets) + f'</ul><p class="who"><b>You still decide:</b> every payment, account and offer. <b>Who provides it:</b> {esc(who)}</p></div></article>')
    services = f'''
<section class="sec page-top"><div class="wrap"><p class="eyebrow">What we handle</p><h1>Everything finance, handled by one team.</h1><p class="lede">Hand us one area or all eight. We start where the money is leaking and take over the rest at your pace.</p></div></section>
<section class="sec tight"><div class="wrap svc-list">{''.join(blocks)}</div></section>
<section class="sec"><div class="wrap"><figure class="wide-art"><img src="/assets/i/scene-accounting-1584.webp" srcset="/assets/i/scene-accounting-900.webp 900w, /assets/i/scene-accounting-1584.webp 1584w" sizes="(max-width:1120px) 100vw, 1080px" width="1584" height="672" alt="Clay illustration of a tidy bookkeeping desk with binders and an open ledger." loading="lazy" decoding="async"></figure></div></section>
{CTA}'''
    pages.append(page('/services', f'Services: books, bills, payroll, billing and banking | {BRAND}', 'Bookkeeping, bill pay, denials and underpayments, payroll, cards, banking and financing for independent medical practices, run by one finance team.', services, '/services', ld=[ORG]))

    # ---------- pricing ----------
    pricing = f'''
<section class="sec page-top"><div class="wrap"><p class="eyebrow">Pricing</p><h1>One flat monthly fee for your whole finance function.</h1><p class="lede">Priced by what you hand us, not by the hour. Month to month after the pilot.</p></div></section>
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
<section class="sec page-top"><div class="wrap"><p class="eyebrow">How we work</p><h1>A finance team you can trust with the keys.</h1><p class="lede">Clear access, clear approvals, and a named person who answers.</p></div></section>
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
<div><p class="eyebrow">Team</p><h2>Who you work with</h2></div>
<div class="prose"><p><b>Yaniv Sadka, CFO lead.</b> Healthcare venture investor and operator. During our founding pilots, Yaniv leads every practice personally.</p><p>He’s supported by healthcare bookkeeping and billing specialists, and by licensed partners for banking, cards, payroll and financing.</p></div>
</div></section>
<section class="sec alt"><div class="wrap split">
<div><p class="eyebrow">Our systems</p><h2>Why we can do this for a flat fee</h2></div>
<div class="prose"><p>We run your finances on our own systems for bill pay, bookkeeping, payment checks and cash forecasting. That keeps our team small and focused on judgment calls, which is why the fee is a fraction of hiring a controller and a CFO.</p></div>
</div></section>
{CTA}'''
    pages.append(page('/how-we-work', f'How we work: approvals, access and HIPAA | {BRAND}', 'How our finance team works with your practice: the first 30 days, approvals, access, HIPAA and the people you work with.', how, '/how-we-work', ld=[ORG]))

    # ---------- checkup ----------
    sel = lambda name, label, opts, req=True: f'<div class="field"><label for="f-{name}">{label}</label><select id="f-{name}" name="{name}"' + (' required' if req else '') + '><option value="">Choose one</option>' + ''.join(f'<option>{esc(o)}</option>' for o in opts) + '</select></div>'
    inp = lambda name, label, typ='text', req=True, ac='': f'<div class="field"><label for="f-{name}">{label}</label><input id="f-{name}" name="{name}" type="{typ}"' + (f' autocomplete="{ac}"' if ac else '') + (' required' if req else '') + '></div>'
    checkup = f'''
<section class="sec page-top"><div class="wrap split checkup">
<div><p class="eyebrow">Free Practice Money Checkup</p><h1>See where your practice’s money is leaking.</h1><p class="lede">A one-page report in five business days. No cost and no commitment.</p>
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
