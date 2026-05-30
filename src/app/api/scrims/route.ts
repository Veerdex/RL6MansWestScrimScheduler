import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const team = searchParams.get('team');

  let sql = 'SELECT * FROM scrims WHERE 1=1';
  const args: string[] = [];

  if (status) {
    sql += ' AND status = ?';
    args.push(status);
  }

  if (team) {
    sql += ' AND (home_team = ? OR away_team = ?)';
    args.push(team, team);
    if (!status) {
      sql += " AND status IN ('open','pending','confirmed')";
    }
  }

  sql += ' ORDER BY scheduled_at ASC';

  const result = await db.execute({ sql, args });
  return NextResponse.json({ scrims: result.rows });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { home_team, scheduled_at, note = '' } = body;

  if (!home_team || !scheduled_at) {
    return NextResponse.json(
      { error: 'home_team and scheduled_at are required' },
      { status: 400 }
    );
  }

  const result = await db.execute({
    sql: `INSERT INTO scrims (home_team, scheduled_at, note, status)
          VALUES (?, ?, ?, 'open') RETURNING *`,
    args: [home_team, scheduled_at, note],
  });

  return NextResponse.json({ scrim: result.rows[0] }, { status: 201 });
}
