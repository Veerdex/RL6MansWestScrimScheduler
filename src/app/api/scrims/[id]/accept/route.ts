import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { away_team } = await req.json();

  if (!away_team) {
    return NextResponse.json({ error: 'away_team is required' }, { status: 400 });
  }

  const existing = await db.execute({
    sql: 'SELECT * FROM scrims WHERE id = ?',
    args: [params.id],
  });

  const scrim = existing.rows[0];
  if (!scrim) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (scrim.status !== 'open')
    return NextResponse.json({ error: 'Scrim is not open' }, { status: 409 });
  if (scrim.home_team === away_team)
    return NextResponse.json({ error: 'Cannot play yourself' }, { status: 400 });

  const result = await db.execute({
    sql: `UPDATE scrims SET away_team = ?, status = 'pending' WHERE id = ? RETURNING *`,
    args: [away_team, params.id],
  });

  return NextResponse.json({ scrim: result.rows[0] });
}
