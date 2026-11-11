// One query interface over real Postgres (DATABASE_URL) or an in-memory PGlite demo database.
import fs from 'node:fs';
import path from 'node:path';

type Row = Record<string, any>;
export interface Db { query<T extends Row = Row>(sql: string, params?: unknown[]): Promise<T[]>; }

let dbPromise: Promise<Db> | null = null;
export const isDemo = () => !process.env.DATABASE_URL;

async function open(): Promise<Db> {
  const schema = fs.readFileSync(path.join(process.cwd(), 'db', 'schema.sql'), 'utf8');
  if (process.env.DATABASE_URL) {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5, ssl: process.env.DATABASE_URL.includes('localhost') ? undefined : { rejectUnauthorized: false } });
    await pool.query(schema);
    return { query: async (sql, params = []) => (await pool.query(sql, params as any[])).rows };
  }
  const { PGlite } = await import('@electric-sql/pglite');
  const pg = new PGlite();
  await pg.exec(schema);
  const db: Db = { query: async (sql, params = []) => (await pg.query(sql, params as any[])).rows as any };
  const { seedDemo } = await import('./demo');
  await seedDemo(db);
  return db;
}

export function db(): Promise<Db> {
  if (!dbPromise) dbPromise = open();
  return dbPromise;
}

export async function audit(practiceId: string | null, userId: string | null, kind: string, detail: Record<string, unknown> = {}) {
  const d = await db();
  await d.query('insert into audit_events (practice_id, user_id, kind, detail) values ($1,$2,$3,$4)', [practiceId, userId, kind, JSON.stringify(detail)]);
}
