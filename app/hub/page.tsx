import { view } from '@/lib/view';
import { Big, Area, Money } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { fmtDay, fmtValue, cashToday, payerName, type Flow } from '@/lib/metrics';
import { usd } from '@/lib/money';
import { CARDS, BILLS, LINE } from '@/lib/sample';

const first = (n: string) => n.replace(/^Dr\.?\s+/i, '').split(/\s+/)[0];
// Money movement and transactions: who paid the practice and where the money went.
const title = (w: string) => w.charAt(0) + w.slice(1).toLowerCase();
const who = (x: Flow) => {
  if (x.kind === 'insurer_deposit') return payerName(x.payer || x.desc.split(' ')[0]);
  if (/GUSTO/.test(x.desc)) return 'Gusto (payroll)';
  if (/STRIPE/.test(x.desc)) return 'Patient payments (Stripe)';
  if (/TRANSFER TO RESERVE/.test(x.desc)) return 'Tax reserve';
  if (/PARTNER DISTRIBUTION/.test(x.desc)) return 'Partner distribution';
  return x.desc.split(/\s+/).filter(w => !/^(SUBSCRIPTION|SERVICES|SUPPLIES|INS|RENT|LAB|MEDICAL|SURGICAL|BUSINESS)$/.test(w)).slice(0, 2).map(title).join(' ').replace('Mckesson', 'McKesson').replace('Medpro', 'MedPro');
};
const METHOD: Record<string, string> = { insurer_deposit: 'Insurer ACH', processor_payout: 'Stripe payout', payroll: 'Payroll', vendor: 'Vendor payment', transfer: 'Transfer', other: 'ACH' };
const monthOf = (d: string) => d.slice(0, 7);
const shiftMonth = (m: string, n: number) => { const [y, mo] = m.split('-').map(Number); const t = new Date(Date.UTC(y, mo - 1 + n, 1)); return t.toISOString().slice(0, 7); };
const monthName = (m: string) => new Date(m + '-01T00:00:00Z').toLocaleString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
const isIn = (x: Flow) => x.cents > 0 && x.kind !== 'transfer' && !x.credit;
const isOut = (x: Flow) => x.cents < 0 && x.kind !== 'transfer';
function top(fs: Flow[]) {
  const m = new Map<string, number>();
  for (const x of fs) m.set(who(x), (m.get(who(x)) || 0) + x.cents);
  return [...m.entries()].sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 4);
}
const initials = (n: string) => n.replace(/\(.*\)/, '').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
function MiniBars({ vals }: { vals: number[] }) {
  const max = Math.max(1, ...vals.map(Math.abs));
  return <svg className="mbars" viewBox="0 0 120 40" aria-hidden="true">{vals.map((v, i) => { const h = Math.max(2, Math.abs(v) / max * 36); return <rect key={i} x={i * 30 + 2} y={40 - h} width="26" height={h} rx="2" className={i === vals.length - 1 ? 'cur' : ''} />; })}</svg>;
}
const TX_TABS: [string, string, (x: Flow) => boolean][] = [['recent', 'Recent', () => true], ['in', 'Money in', isIn], ['out', 'Money out', isOut], ['insurer', 'Insurer payments', x => x.kind === 'insurer_deposit'], ['payroll', 'Payroll', x => x.kind === 'payroll']];

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const { s, D, K, alerts, kpi, f } = await view(Promise.resolve(sp));
  const cash = cashToday(D.allAccounts);
  const weeks = K.weeks;
  const inflow = weeks.reduce((a, w) => a + w.inCents, 0), outflow = weeks.reduce((a, w) => a + w.outCents + w.payrollCents, 0);
  const pts = [cash, ...weeks.map(w => w.endCents)];
  const labels = pts.map((_, i) => (i === 0 ? 'Today' : i % 3 === 0 ? fmtDay(weeks[i - 1].weekStart) : ''));
  const nextPayroll = weeks.find(w => w.payrollCents > 0);
  const low = K.low;
  const cardBal = CARDS.reduce((a, c) => a + c.posted + c.pending, 0), cardLim = CARDS.reduce((a, c) => a + c.limit, 0);
  const accts = D.allAccounts.filter((a: any) => a.type === 'depository' || a.type === 'credit');
  const thisMonth = monthOf(D.today), mm = /^\d{4}-\d{2}$/.test(sp.mm || '') && sp.mm <= thisMonth ? sp.mm : thisMonth;
  const inMonth = (m: string) => D.flows.filter((x: Flow) => monthOf(x.d) === m);
  const mIn = inMonth(mm).filter(isIn), mOut = inMonth(mm).filter(isOut);
  const sumC = (fs: Flow[]) => fs.reduce((a, x) => a + x.cents, 0);
  const prev3 = [3, 2, 1].map(n => shiftMonth(mm, -n));
  const avgIn = Math.round(prev3.reduce((a, m) => a + sumC(inMonth(m).filter(isIn)), 0) / 3), avgOut = Math.round(prev3.reduce((a, m) => a + sumC(inMonth(m).filter(isOut)), 0) / 3);
  const k = (n: number) => (n < 0 ? '−' : '') + '$' + Math.round(Math.abs(n) / 100000) + 'K';
  const qs = (o: Record<string, string>) => '?' + new URLSearchParams({ ...Object.fromEntries(Object.entries(sp).filter(([, v]) => typeof v === 'string')), ...o }).toString();
  const tab = TX_TABS.find(t => t[0] === sp.tx) || TX_TABS[0];
  const locName = (id: string | null) => D.locations.find((l: any) => l.id === id)?.name || 'Main';
  const txs = [...D.flows].filter((x: Flow) => x.d <= D.today && tab[2](x)).sort((a, b) => (a.d < b.d ? 1 : -1)).slice(0, 8);
  return (<>
    <div className="head"><h1>Welcome, {first(s.name)}</h1></div>
    <div className="actions">
      <a className="pill primary" href="/hub/bills"><Icon name="send" size={16} />Send</a>
      <a className="pill" href="/hub/accounts"><Icon name="transfer" size={16} />Transfer</a>
      <a className="pill" href="/hub/remittances"><Icon name="deposit" size={16} />Deposit</a>
      <a className="pill" href="/hub/payments"><Icon name="request" size={16} />Request</a>
      <a className="pill" href="/hub/bills"><Icon name="upload" size={16} />Upload bill</a>
    </div>
    <div className="g">
      <section className="card s7">
        <div className="lbl">Cash on hand</div>
        <div style={{ margin: '6px 0 10px' }}><Big cents={cash} /></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <span className="lbl">Next 13 weeks</span>
          <span className="flow num"><span className="in"><Icon name="arrowup" size={14} /> {usd(inflow).replace('.00', '')}</span><span className="out"><Icon name="arrowdown" size={14} /> −{usd(outflow).replace('.00', '')}</span></span>
        </div>
        <div style={{ marginTop: 14 }}><Area points={pts} labels={labels} /></div>
      </section>
      <section className="card s5">
        <header><h2>Accounts</h2><a className="iconbtn" href="/hub/banks" aria-label="Connect a bank" style={{ background: 'var(--hover)' }}><Icon name="plus" size={16} /></a></header>
        <ul className="acct">
          {accts.slice(0, 5).map((a: any) => <li key={a.id}><span className="ic"><Icon name={a.type === 'credit' ? 'card' : 'bank'} size={16} /></span><span>{a.name}<small>{[a.institution_name, a.mask && '••' + a.mask, a.location_name].filter(Boolean).join(' · ')}</small></span><b className="num"><Big cents={Math.abs(Number(a.current_cents || 0))} className="acctnum" /></b></li>)}
          {!accts.length && <li><span>No bank connected yet. <a href="/hub/banks">Connect one</a> to see cash and the forecast.</span></li>}
        </ul>
        {accts.length > 5 && <div className="rowlink"><span>{accts.length - 5} more</span><a href="/hub/banks">View all accounts</a></div>}
      </section>

      <section className="card s4">
        <header><h2>Aria Card <span className="chip info" style={{ marginLeft: 6, verticalAlign: 2 }}>Preview</span></h2><a href="/hub/cards">View</a></header>
        <Big cents={cardBal} className="mid" />
        <div className="ccbar"><i style={{ width: Math.round(cardBal / cardLim * 100) + '%' }} /></div>
        <div className="lbl">{usd(cardLim - cardBal)} available · <span className="pos">+{usd(Math.round(cardBal * 0.02 * 0.8))} back this month</span></div>
        <div className="rowlink"><span>Autopay from Supplies</span><span className="lbl">Nov 15</span></div>
      </section>
      <section className="card s4">
        <header><h2>Bill pay <span className="chip info" style={{ marginLeft: 6, verticalAlign: 2 }}>Preview</span></h2><a href="/hub/bills">View</a></header>
        <div className="stat2"><div><div className="lbl">Outstanding</div><div>{BILLS.length}</div></div><div><div className="lbl">Overdue</div><div className="bad">{BILLS.filter(b => b.status === 'Overdue').length}</div></div><div><div className="lbl">To approve</div><div>{BILLS.filter(b => b.status === 'Ready to approve').length}</div></div></div>
        <div className="rowlink"><span>Inbox · {BILLS.length} items · {usd(BILLS.reduce((a, b) => a + b.cents, 0)).replace(/\.\d\d$/, '')}</span><a href="/hub/bills">Review</a></div>
      </section>
      <section className="card s4">
        <header><h2>Buy-and-bill line <span className="chip info" style={{ marginLeft: 6, verticalAlign: 2 }}>Preview</span></h2><a href="/hub/capital">View</a></header>
        <Big cents={LINE.limit - LINE.drawn} className="mid" />
        <div className="ccbar"><i style={{ width: Math.round(LINE.drawn / LINE.limit * 100) + '%' }} /></div>
        <div className="lbl">Available of {usd(LINE.limit).replace('.00', '')} · repaid from claims</div>
        <div className="rowlink"><span>2 draws awaiting claims</span><a href="/hub/capital">Details</a></div>
      </section>

      <section className="card s4">
        <header><h2>Insurer payments</h2><a href="/hub/revenue">View</a></header>
        <Big cents={kpi('insurer').value} className="mid" />
        <div className="lbl" style={{ marginTop: 2 }}>Collected, {f.label.toLowerCase()}</div>
        <div className="stat3" style={{ marginTop: 18 }}>
          <div><div className="lbl">Denial rate</div><div>{fmtValue(kpi('denial_rate').value, 'pct')}</div></div>
          <div><div className="lbl">Days to pay</div><div>{fmtValue(kpi('days_to_pay').value, 'days')}</div></div>
          <div><div className="lbl">Unmatched</div><div><Money cents={kpi('unmatched').value} /></div></div>
        </div>
      </section>
      <section className="card s4">
        <header><h2>Payroll</h2><a href="/hub/cash">View</a></header>
        {nextPayroll ? <><Big cents={nextPayroll.payrollCents} className="mid" /><div className="lbl" style={{ marginTop: 2 }}>Next payroll, week of {fmtDay(nextPayroll.weekStart)}</div></> : <p className="note">No payroll found in bank activity yet.</p>}
        <div className="stat3" style={{ marginTop: 18 }}>
          <div><div className="lbl">Lowest point</div><div>{low ? <Money cents={low.endCents} /> : '–'}</div></div>
          <div><div className="lbl">Week of</div><div>{low ? fmtDay(low.weekStart) : '–'}</div></div>
          <div><div className="lbl">Days cash</div><div>{fmtValue(kpi('days_cash').value, 'days')}</div></div>
        </div>
      </section>
      <section className="card s4">
        <header><h2>Needs you</h2><a href="/hub/risk">View all</a></header>
        <div className="mid">{alerts.length}<span className="lbl" style={{ fontSize: 15, marginLeft: 8 }}>open {alerts.length === 1 ? 'item' : 'items'}</span></div>
        <ul className="mini">{alerts.slice(0, 3).map(a => <li key={a.key}><a href={a.href}><Icon name={a.tone === 'alert' ? 'alert' : 'watch'} size={15} />{a.title}</a><span className="num">{a.value}</span></li>)}</ul>
      </section>
    </div>
    <div className="head2"><h2>Money movement</h2><a className="iconbtn" href={qs({ mm: shiftMonth(mm, -1) })} aria-label="Previous month"><span style={{ display: "grid", transform: "rotate(180deg)" }}><Icon name="chev" size={16} /></span></a><span>{monthName(mm)}</span>{mm < thisMonth ? <a className="iconbtn" href={qs({ mm: shiftMonth(mm, 1) })} aria-label="Next month"><Icon name="chev" size={16} /></a> : <span className="iconbtn off"><Icon name="chev" size={16} /></span>}</div>
    <div className="g">
      {([['Money in', mIn, avgIn, 'Top sources'], ['Money out', mOut, avgOut, 'Top spend']] as const).map(([t, fs, avg, sub]) => (
        <section className="card s6 mm" key={t}>
          <div className="lbl">{t}</div>
          <div className={'mm-big ' + (t === 'Money in' ? 'pos' : '')}><Big cents={sumC(fs as Flow[])} /></div>
          <div className="mm-sub">{sub}</div>
          <ul className="acct">{top(fs as Flow[]).map(([n, c]) => <li key={n}><span className="ic av">{initials(n)}</span><span>{n}</span><b className="num">{usd(c)}</b></li>)}
            {!(fs as Flow[]).length && <li><span className="lbl">Nothing yet this month.</span></li>}</ul>
          <div className="mm-foot"><div><div className="lbl">Last 3 months average</div><div className="num">{k(avg)}</div></div><MiniBars vals={[...prev3.map(m => sumC(inMonth(m).filter(t === 'Money in' ? isIn : isOut))), sumC(fs as Flow[])]} /></div>
        </section>))}
    </div>
    <div className="head2"><h2>Transactions</h2><a href="/hub/accounts">View all</a></div>
    <div className="tabs2">{TX_TABS.map(([id, label]) => <a key={id} href={qs({ tx: id })} className={tab[0] === id ? 'on' : ''}>{label}</a>)}</div>
    <section className="card"><div className="tw"><table>
      <thead><tr><th>Date</th><th>To / from</th><th className="n">Amount</th><th>Location</th><th>Method</th></tr></thead>
      <tbody>{txs.map((x, i) => <tr key={i}><td>{fmtDay(x.d)}</td><td><span className="who"><span className="ic av">{initials(who(x))}</span>{who(x)}</span></td><td className={'n ' + (x.cents > 0 ? 'pos' : '')}>{usd(x.cents)}</td><td>{locName(x.loc)}</td><td className="lbl">{x.credit ? 'Card' : METHOD[x.kind] || 'ACH'}</td></tr>)}
        {!txs.length && <tr><td colSpan={5} className="lbl">No transactions yet.</td></tr>}</tbody>
    </table></div></section>
  </>);
}
