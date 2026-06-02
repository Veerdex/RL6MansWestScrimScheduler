import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { notifyScrimPosted } from '@/lib/discord-notify';

export async function GET(req: NextRequest) {
  const now = Date.now();
  const ONE_HOUR = 60 * 60 * 1000;
  const cutoff = new Date(now - ONE_HOUR).toISOString();

  const nowIso = new Date(now).toISOString();

  await db.execute({
    sql: `DELETE FROM scrims WHERE (status = 'confirmed' AND scheduled_at < ?) OR (status = 'pending' AND scheduled_at < ?)`,
    args: [cutoff, nowIso],
  });

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
  }

  sql += ' ORDER BY scheduled_at ASC';

  const result = await db.execute({ sql, args });

  return NextResponse.json({ scrims: result.rows });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { home_team, scheduled_at, end_time = null, note = '' } = body;

  if (!home_team || !scheduled_at) {
    return NextResponse.json(
      { error: 'home_team and scheduled_at are required' },
      { status: 400 }
    );
  }

  const result = await db.execute({
    sql: `INSERT INTO scrims (home_team, scheduled_at, end_time, note, status)
          VALUES (?, ?, ?, ?, 'pending') RETURNING *`,
    args: [home_team, scheduled_at, end_time, note],
  });

  const posted = result.rows[0];
  await notifyScrimPosted({
    id: posted.id as number,
    home_team: posted.home_team as string,
    scheduled_at: posted.scheduled_at as string,
    end_time: posted.end_time as string | null,
    note: posted.note as string,
  });
  return NextResponse.json({ scrim: posted }, { status: 201 });
}
