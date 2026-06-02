import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { notifyScrimCancelled, notifyScrimEdited } from '@/lib/discord-notify';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { home_team, scheduled_at, end_time = null, note } = await req.json();

  if (!scheduled_at) {
    return NextResponse.json({ error: 'scheduled_at is required' }, { status: 400 });
  }

  const existing = await db.execute({ sql: 'SELECT * FROM scrims WHERE id = ?', args: [params.id] });
  const old = existing.rows[0];
  if (!old) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (old.home_team !== home_team) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const result = await db.execute({
    sql: `UPDATE scrims SET scheduled_at = ?, end_time = ?, note = ?
          WHERE id = ? AND status IN ('pending', 'confirmed') RETURNING *`,
    args: [scheduled_at, end_time, note ?? '', params.id],
  });

  if (result.rows.length === 0) {
    return NextResponse.json({ error: 'Not found or not editable' }, { status: 404 });
  }

  const updated = result.rows[0];
  const timeChanged =
    old.scheduled_at !== updated.scheduled_at ||
    (old.end_time ?? null) !== (updated.end_time ?? null);

  if (timeChanged) {
    await notifyScrimEdited({
      id: updated.id as number,
      home_team: updated.home_team as string,
      away_team: updated.away_team as string | null,
      scheduled_at: updated.scheduled_at as string,
      end_time: updated.end_time as string | null,
      note: updated.note as string,
      status: updated.status as string,
    });
  }

  return NextResponse.json({ scrim: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { home_team } = await req.json();

  if (!home_team) {
    return NextResponse.json({ error: 'home_team is required' }, { status: 400 });
  }

  const existing = await db.execute({ sql: 'SELECT * FROM scrims WHERE id = ?', args: [params.id] });
  const scrim = existing.rows[0];
  if (!scrim) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (scrim.home_team !== home_team) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  await db.execute({ sql: 'DELETE FROM scrims WHERE id = ?', args: [params.id] });

  await notifyScrimCancelled({
    id: scrim.id as number,
    home_team: scrim.home_team as string,
    scheduled_at: scrim.scheduled_at as string,
    end_time: scrim.end_time as string | null,
  });

  return NextResponse.json({ ok: true });
}
