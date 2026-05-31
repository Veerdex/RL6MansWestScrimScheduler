import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  const cutoff = Math.floor(Date.now() / 1000) - 86400;
  const result = await db.execute({
    sql: 'SELECT COUNT(*) as count FROM visits WHERE visited_at > ?',
    args: [cutoff],
  });
  const count = result.rows[0].count as number;
  return NextResponse.json({ count });
}

export async function POST() {
  await db.execute('INSERT INTO visits (visited_at) VALUES (unixepoch())');
  return NextResponse.json({ ok: true });
}
