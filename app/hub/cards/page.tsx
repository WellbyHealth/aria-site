import { Big } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { PayCard } from '@/components/PayCard';
import { CARDS, CARD_TXNS, PREVIEW_NOTE } from '@/lib/sample';
import { usd } from '@/lib/money';

export default async function Cards({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const c = CARDS.find(x => x.id === sp.card) || CARDS[0];
  const avail = c.limit - c.posted - c.pending;
  const spent = CARD_TXNS.filter(t => /medical|surgical/i.test(t.cat)).reduce((s, t) => s + t.cents, 0);
  return (<>
    <div className="head"><h1>Cards</h1><div style={{ display: 'flex', gap: 10 }}><a className="pill primary" href="#"><Icon name="plus" size={16} />Create card</a></div></div>
    <div className="banner">{PREVIEW_NOTE}</div>
    <div className="g">
      <section className="card s7">
        <header><h2>Team cards</h2><span className="lbl">{CARDS.length} cards</span></header>
        <div className="tw"><table>
          <thead><tr><th>Card</th><th>Cardholder</th><th className="n">Spent this month</th><th className="n">Limit</th></tr></thead>
          <tbody>{CARDS.map(x => <tr key={x.id} className={x.id === c.id ? 'sel' : ''}>
            <td><a className="cardrow" href={`/hub/cards?card=${x.id}`}><span className={'mini-card' + (x.status === 'Frozen' ? ' frozen' : '')} />{x.name}<small>{x.type} ••{x.mask}{x.status === 'Frozen' ? ' · Frozen' : ''}</small></a></td>
            <td>{x.holder}</td><td className="n">{usd(x.posted + x.pending)}</td><td className="n">{usd(x.limit)}</td></tr>)}</tbody>
        </table></div>
        <div className="rowlink"><span>2% back on medical and surgical supplies this month</span><b className="num pos">+{usd(Math.round(spent * 0.02))}</b></div>
      </section>
      <section className="card s5 cdetail">
        <header style={{ justifyContent: 'center' }}><h2 className="lbl" style={{ fontSize: 15 }}>{c.name} card</h2></header>
        <PayCard name={`${c.name} card`} mask={c.mask} status={c.status} />
        <div className="cacts"><a href="#"><Icon name="eye" size={20} />Details</a><a href="#"><Icon name="snow" size={20} />{c.status === 'Frozen' ? 'Unfreeze' : 'Freeze'}</a><a href="#"><Icon name="sliders" size={20} />Limits</a><a href="#"><Icon name="pen" size={20} />Nickname</a></div>
        <div className="climit"><span>Monthly limit</span><b className="num">{usd(c.limit)}</b></div>
        <ul className="cbal"><li><i />Posted<span className="num">−{usd(c.posted)}</span></li><li><i className="l" />Pending<span className="num">−{usd(c.pending)}</span></li><li><i className="g" />Available to spend<span className="num pos">{usd(avail)}</span></li></ul>
        <div className="cdl"><div className="lbl" style={{ fontSize: 15, color: 'var(--ink)', margin: '8px 0 6px' }}>Details</div>
          <div><span>Cardholder</span><span>{c.holder}</span></div><div><span>Card type</span><span>{c.type}</span></div><div><span>Merchant lock</span><span>{c.lock}</span></div></div>
      </section>
      <section className="card s12">
        <header><h2>Recent card activity</h2><span className="lbl">2% back on supplies, credited monthly</span></header>
        <div className="tw"><table>
          <thead><tr><th>Date</th><th>To</th><th>Card</th><th>Category</th><th className="n">Amount</th><th className="n">Cash back</th></tr></thead>
          <tbody>{CARD_TXNS.map((t, i) => { const back = /medical|surgical/i.test(t.cat); return <tr key={i}><td>{t.day}</td><td>{t.who}</td><td>{t.card}</td><td><span className="chip">{t.cat}</span></td><td className="n">−{usd(t.cents)}</td><td className="n">{back ? <span className="pos">+{usd(Math.round(t.cents * 0.02))}</span> : <span className="lbl">–</span>}</td></tr>; })}</tbody>
        </table></div>
      </section>
    </div>
  </>);
}
