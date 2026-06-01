import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getTeamFromRoles, resolveScheduledAt, DAYS_OF_WEEK, TEAM_NAME_TO_ROLE } from '@/lib/discord-teams';
import { removeOverlappingPending } from '@/lib/db';

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
      {
        name: 'Time',
        value: scrim.end_time
          ? `<t:${ts}:t> – <t:${Math.floor(new Date(scrim.end_time as string).getTime() / 1000)}:t> on <t:${ts}:D>`
          : `<t:${ts}:F>`,
        inline: false,
      },
      ...(scrim.note ? [{ name: 'Note', value: scrim.note as string }] : []),
    ],
    footer: { text: `ID ${scrim.id} • ${isConfirmed ? 'Confirmed' : 'Pending'}` },
  };
}

// --- Command handlers ---

async function dmUser(userId: string, content: string) {
  const dmRes = await fetch('https://discord.com/api/v10/users/@me/channels', {
    method: 'POST',
    headers: { Authorization: `Bot ${BOT_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipient_id: userId }),
  });
  const dm = await dmRes.json() as { id: string };
  if (!dm.id) return;
  await fetch(`https://discord.com/api/v10/channels/${dm.id}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bot ${BOT_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
}

async function handleSchedule(options: Record<string, unknown>, memberRoles: string[], userId: string) {
  const team = getTeamFromRoles(memberRoles);
  if (!team) return ephemeral("You don't have a team role assigned.");

  const day = options.day as string | undefined;
  const hour = options.hour as number;
  const minute = (options.minute as number) ?? 0;
  const ampm = (options.am_pm as 'AM' | 'PM') ?? 'PM';
  const duration = options.duration as number | undefined;
  const note = (options.note as string) ?? '';

  const scheduledAt = resolveScheduledAt(hour, minute, ampm, day);
  const endAt = duration ? new Date(scheduledAt.getTime() + duration * 60 * 60 * 1000) : null;
  if (scheduledAt < new Date()) return ephemeral('That time is in the past.');

  const result = await db.execute({
    sql: `INSERT INTO scrims (home_team, scheduled_at, end_time, note, status, discord_user_id)
          VALUES (?, ?, ?, ?, 'pending', ?) RETURNING *`,
    args: [team, scheduledAt.toISOString(), endAt?.toISOString() ?? null, note, userId],
  });

  const scrim = result.rows[0];
  const ts = Math.floor(scheduledAt.getTime() / 1000);
  const embed = scrimEmbed(scrim as Record<string, unknown>);
  const timeStr = endAt
    ? `<t:${ts}:t> – <t:${Math.floor(endAt.getTime() / 1000)}:t>`
    : `<t:${ts}:F>`;

  await sendChannelMessage(
    `<@&${SCRIM_ROLE_ID}> **${team}** is looking for a scrim!`,
    [embed]
  );

  // Check for overlapping scrims
  const existing = await db.execute({
    sql: `SELECT * FROM scrims WHERE status IN ('pending','confirmed') AND id != ? ORDER BY scheduled_at ASC`,
    args: [scrim.id as number],
  });
  const newStart = scheduledAt.getTime();
  const newEnd = endAt ? endAt.getTime() : newStart + 60 * 60 * 1000;
  const conflicts = existing.rows.filter((r) => {
    const t = new Date(r.scheduled_at as string).getTime();
    const e = r.end_time ? new Date(r.end_time as string).getTime() : t + 60 * 60 * 1000;
    return t < newEnd && e > newStart;
  });

  let reply = `Scrim posted! ID: **${scrim.id}** — ${timeStr}`;
  if (conflicts.length > 0) {
    reply += `\n\n⚠️ **Other scrims at this time:**`;
    for (const c of conflicts) {
      const ct = Math.floor(new Date(c.scheduled_at as string).getTime() / 1000);
      const timeLabel = c.end_time
        ? `<t:${ct}:t> – <t:${Math.floor(new Date(c.end_time as string).getTime() / 1000)}:t>`
        : `<t:${ct}:t>`;
      reply += `\n• ID ${c.id} — **${c.home_team}** ${timeLabel}`;
    }
  }

  return ephemeral(reply);
}

async function handleScrims() {
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

  // Range scrim — require a specific time
  if (scrim.end_time) {
    const hour = options.hour as number | undefined;
    if (!hour) {
      const startTs = Math.floor(new Date(scrim.scheduled_at as string).getTime() / 1000);
      const endTs = Math.floor(new Date(scrim.end_time as string).getTime() / 1000);
      return ephemeral(`This scrim has a time range: <t:${startTs}:t> – <t:${endTs}:t>. Use \`/accept id:${id} hour:X\` to specify your time.`);
    }
    const minute = (options.minute as number) ?? 0;
    const ampm = (options.am_pm as 'AM' | 'PM') ?? 'PM';
    // Build chosen time directly from the scrim's date to avoid day-rollover issues
    let h = hour % 12;
    if (ampm === 'PM') h += 12;
    const chosenTime = new Date(scrim.scheduled_at as string);
    chosenTime.setHours(h, minute, 0, 0);
    const start = new Date(scrim.scheduled_at as string).getTime();
    const end = new Date(scrim.end_time as string).getTime();
    if (chosenTime.getTime() < start || chosenTime.getTime() > end) {
      return ephemeral('That time is outside the available range.');
    }
    const result = await db.execute({
      sql: `UPDATE scrims SET away_team = ?, status = 'confirmed', scheduled_at = ?, end_time = NULL WHERE id = ? RETURNING *`,
      args: [team, chosenTime.toISOString(), id],
    });

    const updated = result.rows[0];
    await removeOverlappingPending(updated.id as number, updated.scheduled_at as string, scrim.home_team as string, team);
    const ts = Math.floor(new Date(updated.scheduled_at as string).getTime() / 1000);
    const embed = scrimEmbed(updated as Record<string, unknown>);
    const homeRoleId = TEAM_NAME_TO_ROLE[updated.home_team as string];
    const homeMention = homeRoleId ? `<@&${homeRoleId}>` : `**${updated.home_team}**`;
    await sendChannelMessage(`${homeMention} your scrim has been accepted by **${updated.away_team}**!`, [embed]);
    if (updated.discord_user_id) {
      await dmUser(updated.discord_user_id as string, `Your scrim has been accepted! **${updated.home_team}** vs **${updated.away_team}** — <t:${ts}:F>`);
    }
    return ephemeral(`Accepted! **${updated.home_team}** vs **${team}** — <t:${ts}:F>`);
  }

  // Specific-time scrim
  const result = await db.execute({
    sql: `UPDATE scrims SET away_team = ?, status = 'confirmed' WHERE id = ? RETURNING *`,
    args: [team, id],
  });

  const updated = result.rows[0];
  await removeOverlappingPending(updated.id as number, updated.scheduled_at as string, scrim.home_team as string, team);
  const ts = Math.floor(new Date(updated.scheduled_at as string).getTime() / 1000);
  const embed = scrimEmbed(updated as Record<string, unknown>);
  const homeRoleId = TEAM_NAME_TO_ROLE[updated.home_team as string];
  const homeMention = homeRoleId ? `<@&${homeRoleId}>` : `**${updated.home_team}**`;

  await sendChannelMessage(
    `${homeMention} your scrim has been accepted by **${updated.away_team}**!`,
    [embed]
  );

  if (updated.discord_user_id) {
    await dmUser(
      updated.discord_user_id as string,
      `Your scrim has been accepted! **${updated.home_team}** vs **${updated.away_team}** — <t:${ts}:F>`
    );
  }

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

function handleSite() {
  return ephemeral('View and manage scrims on the web: **https://easyqueue.xyz**');
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
    const userId: string = body.member?.user?.id ?? '';
    const rawOptions: { name: string; value: unknown }[] = body.data.options ?? [];
    const options = Object.fromEntries(rawOptions.map((o) => [o.name, o.value]));

    try {
      switch (commandName) {
        case 'schedule':   return await handleSchedule(options, memberRoles, userId);
        case 'scrims':     return await handleScrims();
        case 'accept':     return await handleAccept(options, memberRoles);
        case 'cancel':     return await handleCancel(options, memberRoles);
        case 'optout':     return await handleOptOut(options, memberRoles);
        case 'myscrims':   return await handleMyScrims(memberRoles);
        case 'site':       return handleSite();
        default:           return ephemeral('Unknown command.');
      }
    } catch (err) {
      console.error('Discord command error:', err);
      return ephemeral('Something went wrong. Try again.');
    }
  }

  return new NextResponse('Unhandled interaction type', { status: 400 });
}
