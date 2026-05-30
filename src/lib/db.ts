import { createClient } from '@libsql/client';

if (!process.env.TURSO_DATABASE_URL) {
  throw new Error('TURSO_DATABASE_URL is not set');
}

export const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export async function initDb() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS scrims (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      home_team TEXT NOT NULL,
      away_team TEXT,
      scheduled_at TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
}
