import { createClient } from '@libsql/client';

if (!process.env.TURSO_DATABASE_URL) {
  throw new Error('TURSO_DATABASE_URL is not set');
}

export const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export async function removeOverlappingPending(
  confirmedId: number | bigint,
  confirmedAt: string,
  homeTeam: string,
  awayTeam: string
) {
  const confirmedStart = new Date(confirmedAt).getTime();
  const confirmedEnd = confirmedStart + 60 * 60 * 1000;

  const candidates = await db.execute({
    sql: `SELECT id, scheduled_at, end_time FROM scrims
          WHERE status = 'pending' AND home_team IN (?, ?) AND id != ?`,
    args: [homeTeam, awayTeam, confirmedId],
  });

  for (const r of candidates.rows) {
    const t = new Date(r.scheduled_at as string).getTime();
    const e = r.end_time ? new Date(r.end_time as string).getTime() : t + 60 * 60 * 1000;
    if (t < confirmedEnd && e > confirmedStart) {
      await db.execute({ sql: 'DELETE FROM scrims WHERE id = ?', args: [r.id as number] });
    }
  }
}

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
