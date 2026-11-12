import { Big } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { Logo } from '@/components/Logo';
import { ACCOUNTS, PREVIEW_NOTE } from '@/lib/sample';

export default function Accounts() {
  const avail = ACCOUNTS.filter(a => a.cents > 0).reduce((s, a) => s + a.cents, 0);
  return (<>
    <div className="head"><div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}><h1>Accounts</h1><a className="pill" href="#"><Icon name="plus" size={16} />Create account</a><a className="pill quiet" href="/hub/banks"><Icon name="bank" size={16} />Link account</a></div><a className="pill quiet" href="#"><Icon name="transfer" size={16} />Transfer funds</a></div>
    <div className="banner">{PREVIEW_NOTE}</div>
    <div className="tabs"><a aria-current="page" href="/hub/accounts">Aria accounts</a><a href="/hub/banks">Linked accounts</a><a href="#rules">Auto-transfer rules</a></div>
    <div className="avail"><div><div className="lbl">Available</div><Big cents={avail} /></div><div><div className="lbl">Pending internal transfers</div><div className="mid num">$7,176<sup>.10</sup></div></div></div>
    <section className="card" id="rules" style={{ padding: '8px 28px' }}>
      <div className="tw"><table className="accts">
        <thead><tr><th>Account</th><th className="n">Balance</th><th style={{ paddingLeft: 48 }}>Auto-transfer rules</th></tr></thead>
        <tbody>{ACCOUNTS.map(a => <tr key={a.name}>
          <td><div className="acell"><span className="amark"><Logo size={20} /></span><div>{a.name}<small>{a.kind} ••{a.mask}</small></div></div></td>
          <td className="n"><Big cents={Math.abs(a.cents)} className="acctnum" /></td>
          <td style={{ paddingLeft: 48 }}><div className="rule"><i className={a.rule.tone}><Icon name="transfer" size={13} /></i><div>{a.rule.title}<small>{a.rule.sub}</small></div></div></td>
        </tr>)}</tbody>
      </table></div>
    </section>
  </>);
}
