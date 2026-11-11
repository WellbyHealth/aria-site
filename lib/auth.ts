import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import { db } from './db';
import { sign, unsign } from './crypto';

const COOKIE = 'cfohub_session';
export interface Session { userId: string; practiceId: string; practiceName: string; name: string; email: string; role: string }

export async function login(email: string, password: string): Promise<boolean> {
  const d = await db();
  const [u] = await d.query('select id, password_hash from users where lower(email)=lower($1)', [email.trim()]);
  if (!u || !bcrypt.compareSync(password, u.password_hash)) return false;
  const exp = Date.now() + 12 * 3600 * 1000;
  (await cookies()).set(COOKIE, sign(`${u.id}|${exp}`), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 12 * 3600 });
  return true;
}

export async function logout() { (await cookies()).delete(COOKIE); }

export async function session(): Promise<Session | null> {
  const v = unsign((await cookies()).get(COOKIE)?.value);
  if (!v) return null;
  const [id, exp] = v.split('|');
  if (Number(exp) < Date.now()) return null;
  const d = await db();
  const [u] = await d.query('select u.id, u.practice_id, u.name, u.email, u.role, p.name practice_name from users u join practices p on p.id=u.practice_id where u.id=$1', [id]);
  return u ? { userId: u.id, practiceId: u.practice_id, practiceName: u.practice_name, name: u.name, email: u.email, role: u.role } : null;
}

export async function requireSession(): Promise<Session> {
  const s = await session();
  if (!s) redirect('/login');
  return s;
}
