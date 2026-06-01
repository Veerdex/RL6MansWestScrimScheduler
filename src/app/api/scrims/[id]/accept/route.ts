import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { away_team, time } = await req.json();

  if (!away_team) {
    return NextResponse.json({ error: 'away_team is required' }, { status: 400 });
  }

  const existing = await db.execute({
    sql: 'SELECT * FROM scrims WHERE id = ?',
    args: [params.id],
  });

  const scrim = existing.rows[0];
  if (!scrim) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (scrim.status !== 'pending')
    return NextResponse.json({ error: 'Scrim is not available' }, { status: 409 });
  if (scrim.home_team === away_team)
    return NextResponse.json({ error: 'Cannot play yourself' }, { status: 400 });

  // Range scrim: require a specific time within the window
  if (scrim.end_time) {
    if (!time) {
      return NextResponse.json({ error: 'This scrim has a time range — provide a specific time' }, { status: 400 });
    }
    const t = new Date(time).getTime();
    const start = new Date(scrim.scheduled_at as string).getTime();
    const end = new Date(scrim.end_time as string).getTime();
    if (t < start || t > end) {
      return NextResponse.json({ error: 'Time must be within the available range' }, { status: 400 });
    }
    const result = await db.execute({
      sql: `UPDATE scrims SET away_team = ?, status = 'confirmed', scheduled_at = ?, end_time = NULL
            WHERE id = ? RETURNING *`,
      args: [away_team, time, params.id],
    });
    return NextResponse.json({ scrim: result.rows[0] });
  }

  // Specific-time scrim: accept as-is
  const result = await db.execute({
    sql: `UPDATE scrims SET away_team = ?, status = 'confirmed' WHERE id = ? RETURNING *`,
    args: [away_team, params.id],
  });
  return NextResponse.json({ scrim: result.rows[0] });
}
