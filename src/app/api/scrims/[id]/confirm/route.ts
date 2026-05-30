import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const result = await db.execute({
    sql: `UPDATE scrims SET status = 'confirmed'
          WHERE id = ? AND status = 'pending' RETURNING *`,
    args: [params.id],
  });

  if (result.rows.length === 0) {
    return NextResponse.json(
      { error: 'Scrim not found or not pending' },
      { status: 404 }
    );
  }

  return NextResponse.json({ scrim: result.rows[0] });
}
