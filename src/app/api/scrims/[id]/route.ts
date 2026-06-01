import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { scheduled_at, end_time = null, note } = await req.json();

  if (!scheduled_at) {
    return NextResponse.json({ error: 'scheduled_at is required' }, { status: 400 });
  }

  const result = await db.execute({
    sql: `UPDATE scrims SET scheduled_at = ?, end_time = ?, note = ?
          WHERE id = ? AND status IN ('pending', 'confirmed') RETURNING *`,
    args: [scheduled_at, end_time, note ?? '', params.id],
  });

  if (result.rows.length === 0) {
    return NextResponse.json({ error: 'Not found or not pending' }, { status: 404 });
  }

  return NextResponse.json({ scrim: result.rows[0] });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  await db.execute({
    sql: 'DELETE FROM scrims WHERE id = ?',
    args: [params.id],
  });
  return NextResponse.json({ ok: true });
}
