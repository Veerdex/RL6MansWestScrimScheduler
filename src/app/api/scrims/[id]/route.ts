import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { home_team, scheduled_at, end_time = null, note } = await req.json();

  if (!scheduled_at) {
    return NextResponse.json({ error: 'scheduled_at is required' }, { status: 400 });
  }

  const existing = await db.execute({ sql: 'SELECT home_team FROM scrims WHERE id = ?', args: [params.id] });
  const scrim = existing.rows[0];
  if (!scrim) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (scrim.home_team !== home_team) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const result = await db.execute({
    sql: `UPDATE scrims SET scheduled_at = ?, end_time = ?, note = ?
          WHERE id = ? AND status IN ('pending', 'confirmed') RETURNING *`,
    args: [scheduled_at, end_time, note ?? '', params.id],
  });

  if (result.rows.length === 0) {
    return NextResponse.json({ error: 'Not found or not editable' }, { status: 404 });
  }

  return NextResponse.json({ scrim: result.rows[0] });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { home_team } = await req.json();

  if (!home_team) {
    return NextResponse.json({ error: 'home_team is required' }, { status: 400 });
  }

  const existing = await db.execute({ sql: 'SELECT home_team FROM scrims WHERE id = ?', args: [params.id] });
  const scrim = existing.rows[0];
  if (!scrim) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (scrim.home_team !== home_team) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  await db.execute({ sql: 'DELETE FROM scrims WHERE id = ?', args: [params.id] });
  return NextResponse.json({ ok: true });
}
