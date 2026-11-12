import { Icon } from '@/components/Icon';
import { BILLS, PREVIEW_NOTE } from '@/lib/sample';
import { usd } from '@/lib/money';

export default function Bills() {
  const out = BILLS.filter(b => b.status !== 'Paid');
  const overdue = BILLS.filter(b => b.status === 'Overdue');
  const ready = BILLS.filter(b => b.status === 'Ready to approve');
  return (<>
    <div className="head"><h1>Bill pay</h1><div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}><a className="pill primary" href="#"><Icon name="upload" size={16} />Upload bill</a><a className="pill" href="#"><Icon name="send" size={16} />Forward to bills@aria</a></div></div>
    <div className="banner">{PREVIEW_NOTE}</div>
    <div className="kpis" style={{ gridTemplateColumns: 'repeat(4,minmax(0,1fr))' }}>
      <div className="kpi"><span className="lbl">Outstanding</span><div className="v">{out.length}</div><span className="meta">{usd(out.reduce((s, b) => s + b.cents, 0))}</span></div>
      <div className="kpi"><span className="lbl">Ready to approve</span><div className="v">{ready.length}</div><span className="meta">{usd(ready.reduce((s, b) => s + b.cents, 0))}</span></div>
      <div className="kpi"><span className="lbl">Overdue</span><div className="v bad">{overdue.length}</div><span className="meta">{usd(overdue.reduce((s, b) => s + b.cents, 0))}</span></div>
      <div className="kpi"><span className="lbl">Due in 7 days</span><div className="v">2</div><span className="meta">$703,475.00</span></div>
    </div>
    <section className="card">
      <header><h2>Bills</h2><span className="lbl"><Icon name="spark" size={14} /> Read and coded by Aria. Check before you approve.</span></header>
      <div className="tw"><table>
        <thead><tr><th>Vendor</th><th>Invoice</th><th>Account</th><th>Due</th><th className="n">Amount</th><th>Status</th><th /></tr></thead>
        <tbody>{BILLS.map((b, i) => <tr key={i}><td>{b.vendor}<small className="sub">{b.from}</small></td><td>{b.invoice}</td><td><span className="chip">{b.gl}</span></td><td className={b.status === 'Overdue' ? 'bad' : ''}>{b.due}</td><td className="n">{usd(b.cents)}</td><td><span className={'chip ' + (b.status === 'Overdue' ? 'bad' : b.status === 'Scheduled' ? 'ok' : 'info')}>{b.status}</span></td><td className="n">{b.status === 'Ready to approve' || b.status === 'Overdue' ? <a className="btn" style={{ height: 34, padding: '0 14px', fontSize: 14 }} href="#">{b.status === 'Overdue' ? 'Pay now' : 'Approve'}</a> : null}</td></tr>)}</tbody>
      </table></div>
    </section>
  </>);
}
