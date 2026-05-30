import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

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
