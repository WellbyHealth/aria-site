import { Big } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { LINE, DRAWS, FLEX, PREVIEW_NOTE } from '@/lib/sample';
import { usd } from '@/lib/money';

export default function Capital() {
  const pct = Math.round(LINE.drawn / LINE.limit * 100);
  return (<>
    <div className="head"><div><h1>Capital</h1><p>Buy-and-bill lending and Flex Pay, repaid from the payments they finance.</p></div><a className="pill primary" href="#"><Icon name="plus" size={16} />Request a draw</a></div>
    <div className="banner">{PREVIEW_NOTE} Terms shown are examples, not an offer.</div>
    <div className="g">
      <section className="card s7">
        <header><h2>Buy-and-bill line</h2><span className="chip info">Sample terms</span></header>
        <div className="lbl">Available</div>
        <Big cents={LINE.limit - LINE.drawn} />
        <div className="cap-bar" style={{ marginTop: 18 }}><i style={{ width: pct + '%' }} /></div>
        <div className="legend" style={{ marginTop: 12 }}><span><b className="dotk" />Drawn {usd(LINE.drawn)}</span><span><b className="dotk l" />Line {usd(LINE.limit)}</span></div>
        <div className="rowlink"><span>{LINE.nextRepay}</span><a href="/hub/revenue">See claim payments</a></div>
      </section>
      <section className="card s5">
        <header><h2>How repayment works</h2></header>
        <ol className="steps">
          <li><b>You order the drug</b><span>Aria pays the distributor the day you order.</span></li>
          <li><b>You bill the claim</b><span>We match the J-code claim to the draw.</span></li>
          <li><b>The payer pays</b><span>The draw is repaid from that payment. You keep the margin.</span></li>
        </ol>
      </section>
      <section className="card s12">
        <header><h2>Draws</h2></header>
        <div className="tw"><table>
          <thead><tr><th>Ordered</th><th>Drug</th><th className="n">Units</th><th>Payer</th><th className="n">Amount</th><th>Status</th><th>Expected</th></tr></thead>
          <tbody>{DRAWS.map((d, i) => <tr key={i}><td>{d.day}</td><td>{d.drug}</td><td className="n">{d.units}</td><td>{d.payer}</td><td className="n">{usd(d.cents)}</td><td><span className={'chip ' + (d.status === 'Repaid' ? 'ok' : d.status === 'Partly repaid' ? 'info' : '')}>{d.status}</span></td><td>{d.eta}</td></tr>)}</tbody>
        </table></div>
      </section>
      <section className="card s12">
        <header><h2>Flex Pay</h2><span className="lbl">Supplier invoices paid over time</span></header>
        <div className="tw"><table>
          <thead><tr><th>Supplier</th><th>Invoice</th><th className="n">Amount</th><th>Progress</th><th>Next payment</th></tr></thead>
          <tbody>{FLEX.map((f, i) => <tr key={i}><td>{f.vendor}</td><td>{f.invoice}</td><td className="n">{usd(f.cents)}</td><td><div className="parts">{Array.from({ length: f.parts }, (_, k) => <i key={k} className={k < f.paid ? 'on' : ''} />)}<span className="lbl">{f.paid} of {f.parts} paid</span></div></td><td>{f.next}</td></tr>)}</tbody>
        </table></div>
      </section>
    </div>
  </>);
}
