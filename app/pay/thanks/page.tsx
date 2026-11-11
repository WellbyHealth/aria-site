export default async function Thanks({ searchParams }: { searchParams: Promise<{ ref?: string; canceled?: string }> }) {
  const sp = await searchParams;
  return (<main className="login"><div className="card" style={{ textAlign: 'center' }}>
    <h1 style={{ fontSize: '1.6rem' }}>{sp.canceled ? 'Payment not completed' : 'Thank you, your payment is in'}</h1>
    <p>{sp.canceled ? 'No charge was made. You can use the same link again within 23 hours.' : `Statement ${sp.ref || ''} is paid. You can close this page.`}</p>
  </div></main>);
}
