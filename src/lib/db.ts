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
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  // migrate any legacy 'open' rows to 'pending'
  await db.execute(`UPDATE scrims SET status = 'pending' WHERE status = 'open'`);
  try {
    await db.execute(`ALTER TABLE scrims ADD COLUMN discord_user_id TEXT`);
  } catch { /* column already exists */ }
  try {
    await db.execute(`ALTER TABLE scrims ADD COLUMN end_time TEXT`);
  } catch { /* column already exists */ }
  await db.execute(`
    CREATE TABLE IF NOT EXISTS visits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      visited_at INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `);
}
