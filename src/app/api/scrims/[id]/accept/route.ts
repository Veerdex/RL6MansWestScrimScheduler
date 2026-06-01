import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

async function removeOverlappingPending(
  confirmedId: number | bigint,
  confirmedAt: string,
  homeTeam: string,
  awayTeam: string
) {
  const confirmedStart = new Date(confirmedAt).getTime();
  const confirmedEnd = confirmedStart + 60 * 60 * 1000; // treat as 1-hour block

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
    const confirmed = result.rows[0];
    await removeOverlappingPending(confirmed.id as number, confirmed.scheduled_at as string, scrim.home_team as string, away_team);
    return NextResponse.json({ scrim: confirmed });
  }

  // Specific-time scrim: accept as-is
  const result = await db.execute({
    sql: `UPDATE scrims SET away_team = ?, status = 'confirmed' WHERE id = ? RETURNING *`,
    args: [away_team, params.id],
  });
  const confirmed = result.rows[0];
  await removeOverlappingPending(confirmed.id as number, confirmed.scheduled_at as string, scrim.home_team as string, away_team);
  return NextResponse.json({ scrim: confirmed });
}
