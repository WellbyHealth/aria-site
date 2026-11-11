// AES-256-GCM for Plaid access tokens, HMAC for session cookies.
import crypto from 'node:crypto';

function key(name: string): Buffer {
  const raw = process.env[name];
  if (raw) return crypto.createHash('sha256').update(raw).digest();
  if (process.env.NODE_ENV === 'production' && process.env.DATABASE_URL) throw new Error(`${name} must be set`);
  return crypto.createHash('sha256').update(`dev-only-${name}`).digest();
}

export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key('TOKEN_ENC_KEY'), iv);
  const body = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
  return ['v1', iv.toString('base64'), c.getAuthTag().toString('base64'), body.toString('base64')].join('.');
}

export function decrypt(blob: string): string {
  const [v, iv, tag, body] = blob.split('.');
  if (v !== 'v1') throw new Error('unknown token format');
  const d = crypto.createDecipheriv('aes-256-gcm', key('TOKEN_ENC_KEY'), Buffer.from(iv, 'base64'));
  d.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([d.update(Buffer.from(body, 'base64')), d.final()]).toString('utf8');
}

export function sign(value: string): string {
  const mac = crypto.createHmac('sha256', key('SESSION_SECRET')).update(value).digest('base64url');
  return `${value}.${mac}`;
}

export function unsign(signed: string | undefined): string | null {
  if (!signed) return null;
  const i = signed.lastIndexOf('.');
  if (i < 0) return null;
  const value = signed.slice(0, i);
  const expected = sign(value);
  const a = Buffer.from(expected), b = Buffer.from(signed);
  return a.length === b.length && crypto.timingSafeEqual(a, b) ? value : null;
}
