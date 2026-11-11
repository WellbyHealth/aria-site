import { redirect } from 'next/navigation';
import { login } from '@/lib/auth';
import { isDemo } from '@/lib/db';
import { DEMO_EMAIL, DEMO_PASSWORD } from '@/lib/demo';

export const dynamic = 'force-dynamic';
async function doLogin(form: FormData) {
  'use server';
  const ok = await login(String(form.get('email') || ''), String(form.get('password') || ''));
  redirect(ok ? '/hub' : '/login?error=1');
}
export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sp = await searchParams;
  return (
    <main className="login"><div className="card glass">
      <div className="brand" style={{ padding: "0 0 16px" }}><img src="/art/icon-128.png" alt="" />Aria CFO Hub</div>
      <h1 style={{ fontSize: 22, marginBottom: 16 }}>Sign in</h1>
      {sp.error && <div className="banner err">That email and password don’t match.</div>}
      {isDemo() && <div className="banner">Demo mode with sample data. Sign in as <b>{DEMO_EMAIL}</b>, password <b>{DEMO_PASSWORD}</b>.</div>}
      <form action={doLogin} className="form">
        <label>Email<input name="email" type="email" autoComplete="email" required defaultValue={isDemo() ? DEMO_EMAIL : undefined} /></label>
        <label>Password<input name="password" type="password" autoComplete="current-password" required defaultValue={isDemo() ? DEMO_PASSWORD : undefined} /></label>
        <button className="btn" type="submit">Sign in</button>
      </form>
    </div></main>
  );
}
