import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { notifyScrimOptOut } from '@/lib/discord-notify';

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
  if (scrim.status !== 'confirmed')
    return NextResponse.json({ error: 'Scrim is not confirmed' }, { status: 409 });
  if (scrim.away_team !== away_team)
    return NextResponse.json({ error: 'Not the away team' }, { status: 403 });

  const result = await db.execute({
    sql: `UPDATE scrims SET away_team = NULL, status = 'pending' WHERE id = ? RETURNING *`,
    args: [params.id],
  });

  const updated = result.rows[0];
  await notifyScrimOptOut({
    id: updated.id as number,
    home_team: updated.home_team as string,
    scheduled_at: updated.scheduled_at as string,
    end_time: updated.end_time as string | null,
    note: updated.note as string,
  });

  return NextResponse.json({ scrim: updated });
}
