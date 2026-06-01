import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getTeamFromRoles, resolveScheduledAt, DAYS_OF_WEEK } from '@/lib/discord-teams';

const PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY!;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!;
const CHANNEL_ID = process.env.DISCORD_CHANNEL_ID!;
const SCRIM_ROLE_ID = process.env.DISCORD_SCRIM_ROLE_ID!;

function hexToBytes(hex: string): ArrayBuffer {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    arr[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return arr.buffer as ArrayBuffer;
}

// --- Discord API helpers ---

async function sendChannelMessage(content: string, embeds?: object[]) {
  await fetch(`https://discord.com/api/v10/channels/${CHANNEL_ID}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content, embeds }),
  });
}

function ephemeral(content: string) {
  return NextResponse.json({ type: 4, data: { content, flags: 64 } });
}

function reply(content: string, embeds?: object[]) {
  return NextResponse.json({ type: 4, data: { content, embeds } });
}

// --- Scrim embed builder ---

function scrimEmbed(scrim: Record<string, unknown>) {
  const time = new Date(scrim.scheduled_at as string);
  const ts = Math.floor(time.getTime() / 1000);
  const isConfirmed = scrim.status === 'confirmed';
  return {
    color: isConfirmed ? 0x22c55e : 0xf97316,
    fields: [
      { name: 'Home', value: scrim.home_team as string, inline: true },
      { name: 'Away', value: (scrim.away_team as string) ?? 'TBD', inline: true },
      { name: 'Time', value: `<t:${ts}:F>`, inline: false },
      ...(scrim.note ? [{ name: 'Note', value: scrim.note as string }] : []),
    ],
    footer: { text: `ID ${scrim.id} • ${isConfirmed ? 'Confirmed' : 'Pending'}` },
  };
}

// --- Command handlers ---

async function handleSchedule(options: Record<string, unknown>, memberRoles: string[]) {
  const team = getTeamFromRoles(memberRoles);
  if (!team) return ephemeral("You don't have a team role assigned.");

  const day = options.day as string | undefined;
  const hour = options.hour as number;
  const minute = (options.minute as number) ?? 0;
  const ampm = (options.am_pm as 'AM' | 'PM') ?? 'PM';
  const note = (options.note as string) ?? '';

  const scheduledAt = resolveScheduledAt(hour, minute, ampm, day);
  if (scheduledAt < new Date()) return ephemeral('That time is in the past.');

  const result = await db.execute({
    sql: `INSERT INTO scrims (home_team, scheduled_at, note, status)
          VALUES (?, ?, ?, 'pending') RETURNING *`,
    args: [team, scheduledAt.toISOString(), note],
  });

  const scrim = result.rows[0];
  const ts = Math.floor(scheduledAt.getTime() / 1000);
  const embed = scrimEmbed(scrim as Record<string, unknown>);

  await sendChannelMessage(
    `<@&${SCRIM_ROLE_ID}> **${team}** is looking for a scrim!`,
    [embed]
  );

  return ephemeral(`Scrim posted! ID: **${scrim.id}** — <t:${ts}:F>`);
}

async function handleScrims() {
  const now = Math.floor(Date.now() / 1000);
  const result = await db.execute(
    "SELECT * FROM scrims WHERE status = 'pending' ORDER BY scheduled_at ASC"
  );

  const active = result.rows.filter(
    (r) => new Date(r.scheduled_at as string).getTime() > Date.now()
  );

  if (active.length === 0) return reply('No open scrims right now.');

  const embeds = active.slice(0, 10).map((s) => scrimEmbed(s as Record<string, unknown>));
  return reply(`**${active.length} open scrim${active.length !== 1 ? 's' : ''}**`, embeds);
}

async function handleAccept(options: Record<string, unknown>, memberRoles: string[]) {
  const team = getTeamFromRoles(memberRoles);
  if (!team) return ephemeral("You don't have a team role assigned.");

  const id = options.id as number;
  const existing = await db.execute({ sql: 'SELECT * FROM scrims WHERE id = ?', args: [id] });
  const scrim = existing.rows[0];

  if (!scrim) return ephemeral(`No scrim found with ID ${id}.`);
  if (scrim.status !== 'pending') return ephemeral('That scrim is already confirmed.');
  if (scrim.home_team === team) return ephemeral("You can't accept your own scrim.");
  if (new Date(scrim.scheduled_at as string) < new Date()) return ephemeral('That scrim has already passed.');

  const result = await db.execute({
    sql: `UPDATE scrims SET away_team = ?, status = 'confirmed' WHERE id = ? RETURNING *`,
    args: [team, id],
  });

  const updated = result.rows[0];
  const ts = Math.floor(new Date(updated.scheduled_at as string).getTime() / 1000);
  const embed = scrimEmbed(updated as Record<string, unknown>);

  await sendChannelMessage(
    `**${updated.home_team}** vs **${updated.away_team}** is confirmed!`,
    [embed]
  );

  return ephemeral(`Accepted! **${updated.home_team}** vs **${team}** — <t:${ts}:F>`);
}

async function handleCancel(options: Record<string, unknown>, memberRoles: string[]) {
  const team = getTeamFromRoles(memberRoles);
  if (!team) return ephemeral("You don't have a team role assigned.");

  const id = options.id as number;
  const existing = await db.execute({ sql: 'SELECT * FROM scrims WHERE id = ?', args: [id] });
  const scrim = existing.rows[0];

  if (!scrim) return ephemeral(`No scrim found with ID ${id}.`);
  if (scrim.home_team !== team) return ephemeral("You can only cancel scrims you posted.");

  await db.execute({ sql: 'DELETE FROM scrims WHERE id = ?', args: [id] });
  return ephemeral(`Scrim #${id} cancelled.`);
}

async function handleOptOut(options: Record<string, unknown>, memberRoles: string[]) {
  const team = getTeamFromRoles(memberRoles);
  if (!team) return ephemeral("You don't have a team role assigned.");

  const id = options.id as number;
  const existing = await db.execute({ sql: 'SELECT * FROM scrims WHERE id = ?', args: [id] });
  const scrim = existing.rows[0];

  if (!scrim) return ephemeral(`No scrim found with ID ${id}.`);
  if (scrim.away_team !== team) return ephemeral("You're not the away team on that scrim.");
  if (scrim.status !== 'confirmed') return ephemeral('That scrim is not confirmed.');

  await db.execute({
    sql: `UPDATE scrims SET away_team = NULL, status = 'pending' WHERE id = ?`,
    args: [id],
  });

  return ephemeral(`You've opted out of scrim #${id}. It's back on the board.`);
}

async function handleMyScrims(memberRoles: string[]) {
  const team = getTeamFromRoles(memberRoles);
  if (!team) return ephemeral("You don't have a team role assigned.");

  const result = await db.execute({
    sql: `SELECT * FROM scrims WHERE (home_team = ? OR away_team = ?) ORDER BY scheduled_at ASC`,
    args: [team, team],
  });

  const now = Date.now();
  const ONE_HOUR = 60 * 60 * 1000;
  const active = result.rows.filter((r) => {
    const t = new Date(r.scheduled_at as string).getTime();
    return r.status === 'confirmed' ? t + ONE_HOUR > now : t > now;
  });

  if (active.length === 0) return ephemeral(`**${team}** has no upcoming scrims.`);

  const embeds = active.slice(0, 10).map((s) => scrimEmbed(s as Record<string, unknown>));
  return reply(`**${team}'s scrims** (${active.length} upcoming)`, embeds);
}

// --- Main route handler ---

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-signature-ed25519');
  const timestamp = req.headers.get('x-signature-timestamp');

  if (!signature || !timestamp) {
    return new NextResponse('Missing headers', { status: 401 });
  }

  // Verify signature using raw body
  const encoder = new TextEncoder();
  const keyBytes = hexToBytes(PUBLIC_KEY);
  let cryptoKey: CryptoKey;
  try {
    cryptoKey = await crypto.subtle.importKey(
      'raw', keyBytes, { name: 'Ed25519' }, false, ['verify']
    );
  } catch {
    return new NextResponse('Invalid public key', { status: 500 });
  }

  const isValid = await crypto.subtle.verify(
    'Ed25519',
    cryptoKey,
    hexToBytes(signature),
    encoder.encode(timestamp + rawBody).buffer as ArrayBuffer
  );

  if (!isValid) return new NextResponse('Invalid signature', { status: 401 });

  const body = JSON.parse(rawBody);

  // Discord PING
  if (body.type === 1) return NextResponse.json({ type: 1 });

  // Slash command
  if (body.type === 2) {
    const commandName: string = body.data.name;
    const memberRoles: string[] = body.member?.roles ?? [];
    const rawOptions: { name: string; value: unknown }[] = body.data.options ?? [];
    const options = Object.fromEntries(rawOptions.map((o) => [o.name, o.value]));

    try {
      switch (commandName) {
        case 'schedule':   return await handleSchedule(options, memberRoles);
        case 'scrims':     return await handleScrims();
        case 'accept':     return await handleAccept(options, memberRoles);
        case 'cancel':     return await handleCancel(options, memberRoles);
        case 'optout':     return await handleOptOut(options, memberRoles);
        case 'myscrims':   return await handleMyScrims(memberRoles);
        default:           return ephemeral('Unknown command.');
      }
    } catch (err) {
      console.error('Discord command error:', err);
      return ephemeral('Something went wrong. Try again.');
    }
  }

  return new NextResponse('Unhandled interaction type', { status: 400 });
}
