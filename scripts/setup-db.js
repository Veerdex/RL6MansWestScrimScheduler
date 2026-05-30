#!/usr/bin/env node
/**
 * Run once to create the scrims table in your Turso database.
 * Usage: TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... node scripts/setup-db.js
 */
const { createClient } = require('@libsql/client');

async function main() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  await client.execute(`
    CREATE TABLE IF NOT EXISTS scrims (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      home_team    TEXT    NOT NULL,
      away_team    TEXT,
      scheduled_at TEXT    NOT NULL,
      note         TEXT    NOT NULL DEFAULT '',
      status       TEXT    NOT NULL DEFAULT 'open',
      created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);

  console.log('Database table created (or already exists).');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
