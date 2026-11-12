import { view } from '@/lib/view';
import { Big, Area, Money } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { fmtDay, fmtValue, cashToday } from '@/lib/metrics';
import { usd } from '@/lib/money';
import { CARDS, BILLS, LINE } from '@/lib/sample';

const first = (n: string) => n.replace(/^Dr\.?\s+/i, '').split(/\s+/)[0];

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const { s, D, K, alerts, kpi, f } = await view(searchParams);
  const cash = cashToday(D.allAccounts);
  const weeks = K.weeks;
  const inflow = weeks.reduce((a, w) => a + w.inCents, 0), outflow = weeks.reduce((a, w) => a + w.outCents + w.payrollCents, 0);
  const pts = [cash, ...weeks.map(w => w.endCents)];
  const labels = pts.map((_, i) => (i === 0 ? 'Today' : i % 3 === 0 ? fmtDay(weeks[i - 1].weekStart) : ''));
  const nextPayroll = weeks.find(w => w.payrollCents > 0);
  const low = K.low;
  const cardBal = CARDS.reduce((a, c) => a + c.posted + c.pending, 0), cardLim = CARDS.reduce((a, c) => a + c.limit, 0);
  const accts = D.allAccounts.filter((a: any) => a.type === 'depository' || a.type === 'credit');
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
  </>);
}
