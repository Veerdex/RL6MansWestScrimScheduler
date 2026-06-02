import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getTeamFromRoles, resolveScheduledAt, DAYS_OF_WEEK, TEAM_NAME_TO_ROLE, LEAGUE_TZ_LABEL } from '@/lib/discord-teams';
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

function reply(content: string, embeds?: object[], ephemeralFlag = false) {
  return NextResponse.json({ type: 4, data: { content, embeds, ...(ephemeralFlag && { flags: 64 }) } });
}

// --- Scrim embed builder ---

function scrimEmbed(scrim: Record<string, unknown>) {
  const time = new Date(scrim.scheduled_at as string);
  const ts = Math.floor(time.getTime() / 1000);
  const isConfirmed = scrim.status === 'confirmed';
  return {
    title: `Scrim #${scrim.id}`,
    color: isConfirmed ? 0x22c55e : 0xf97316,
    fields: [
      { name: 'Home', value: scrim.home_team as string, inline: true },
      { name: 'Away', value: (scrim.away_team as string) ?? 'TBD', inline: true },
      {
        name: 'Time',
        value: scrim.end_time
          ? `<t:${ts}:t> – <t:${Math.floor(new Date(scrim.end_time as string).getTime() / 1000)}:t> **${LEAGUE_TZ_LABEL}** on <t:${ts}:D>`
          : `<t:${ts}:F> (**${LEAGUE_TZ_LABEL}**)`,
        inline: false,
      },
      ...(scrim.note ? [{ name: 'Note', value: scrim.note as string }] : []),
    ],
    footer: { text: isConfirmed ? 'Confirmed' : 'Pending — use /accept id to claim this scrim' },
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
    ? `<t:${ts}:t> – <t:${Math.floor(endAt.getTime() / 1000)}:t> **${LEAGUE_TZ_LABEL}**`
    : `<t:${ts}:F> (**${LEAGUE_TZ_LABEL}**)`;

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
        ? `<t:${ct}:t> – <t:${Math.floor(new Date(c.end_time as string).getTime() / 1000)}:t> **${LEAGUE_TZ_LABEL}**`
        : `<t:${ct}:t> **${LEAGUE_TZ_LABEL}**`;
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

  if (active.length === 0) return reply('No open scrims right now.', undefined, true);

  const embeds = active.slice(0, 10).map((s) => scrimEmbed(s as Record<string, unknown>));
  return reply(`**${active.length} open scrim${active.length !== 1 ? 's' : ''}**`, embeds, true);
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
      return ephemeral(`This scrim has a time range: <t:${startTs}:t> – <t:${endTs}:t> **${LEAGUE_TZ_LABEL}**. Use \`/accept id:${id} hour:X\` to specify your time.`);
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
      await dmUser(updated.discord_user_id as string, `Your scrim has been accepted! **${updated.home_team}** vs **${updated.away_team}** — <t:${ts}:F> (**${LEAGUE_TZ_LABEL}**)`);
    }
    return ephemeral(`Accepted! **${updated.home_team}** vs **${team}** — <t:${ts}:F> (**${LEAGUE_TZ_LABEL}**)`);
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

  const result = await db.execute({
    sql: `UPDATE scrims SET away_team = NULL, status = 'pending' WHERE id = ? RETURNING *`,
    args: [id],
  });

  const updated = result.rows[0];
  const ts = Math.floor(new Date(updated.scheduled_at as string).getTime() / 1000);
  const timeValue = updated.end_time
    ? `<t:${ts}:t> – <t:${Math.floor(new Date(updated.end_time as string).getTime() / 1000)}:t> **${LEAGUE_TZ_LABEL}**`
    : `<t:${ts}:F> (**${LEAGUE_TZ_LABEL}**)`;
  await sendChannelMessage(
    `<@&${SCRIM_ROLE_ID}> **${updated.home_team}**'s scrim is back on the board!`,
    [{
      title: `Scrim #${updated.id}`,
      color: 0xf97316,
      fields: [
        { name: 'Home', value: updated.home_team as string, inline: true },
        { name: 'Away', value: 'TBD', inline: true },
        { name: 'Time', value: timeValue, inline: false },
        ...(updated.note ? [{ name: 'Note', value: updated.note as string }] : []),
      ],
      footer: { text: 'Pending — use /accept id to claim this scrim' },
    }]
  );

  return ephemeral(`You've opted out of scrim #${id}. It's back on the board.`);
}

async function handleMyScrims(memberRoles: string[]) {
  const team = getTeamFromRoles(memberRoles);
  if (!team) return ephemeral("You don't have a team role assigned.");

  const now = Date.now();
  const cutoff = new Date(now - 60 * 60 * 1000).toISOString();
  const nowIso = new Date(now).toISOString();
  await db.execute({
    sql: `DELETE FROM scrims WHERE (status = 'confirmed' AND scheduled_at < ?) OR (status = 'pending' AND scheduled_at < ?)`,
    args: [cutoff, nowIso],
  });

  const result = await db.execute({
    sql: `SELECT * FROM scrims WHERE (home_team = ? OR away_team = ?) ORDER BY scheduled_at ASC`,
    args: [team, team],
  });

  if (result.rows.length === 0) return ephemeral(`**${team}** has no upcoming scrims.`);

  const embeds = result.rows.slice(0, 10).map((s) => scrimEmbed(s as Record<string, unknown>));
  return reply(`**${team}'s scrims** (${result.rows.length} upcoming)`, embeds, true);
}

function handleSite() {
  return ephemeral('View and manage scrims on the web: **https://easyqueue.xyz**');
}

const COMMAND_HELP: Record<string, { title: string; color: number; fields: { name: string; value: string }[] }> = {
  schedule: {
    title: '📅 /schedule — Post a scrim',
    color: 0x3b82f6,
    fields: [
      { name: 'hour (required)', value: 'The hour, 1–12. Defaults to PM.' },
      { name: 'am_pm (optional)', value: 'Only needed if scheduling AM. Leave blank for PM.' },
      { name: 'minute (optional)', value: 'Choose 15, 30, or 45. Defaults to :00.' },
      { name: 'duration (optional)', value: 'Hours your team is available. e.g. `4` = 4-hour window starting at your hour. Leave blank for a specific time.' },
      { name: 'day (optional)', value: 'Day of the week. Defaults to today if the time hasn\'t passed, otherwise tomorrow.' },
      { name: 'note (optional)', value: 'Extra info e.g. "best of 5, no subs".' },
      { name: 'Examples', value: '`/schedule hour:8` → 8 PM today\n`/schedule hour:3 am_pm:AM` → 3 AM\n`/schedule hour:5 duration:4` → available 5–9 PM' },
    ],
  },
  accept: {
    title: '✅ /accept — Accept a scrim',
    color: 0x22c55e,
    fields: [
      { name: 'id (required)', value: 'The scrim ID shown in /scrims.' },
      { name: 'hour (optional)', value: 'Required for range scrims — pick your preferred time within the window.' },
      { name: 'minute (optional)', value: '15, 30, or 45. Defaults to :00.' },
      { name: 'am_pm (optional)', value: 'Only needed for AM. Defaults to PM.' },
      { name: 'Examples', value: '`/accept id:5` → accept a specific-time scrim\n`/accept id:5 hour:7` → accept a range scrim at 7 PM' },
    ],
  },
  cancel: {
    title: '❌ /cancel — Cancel your scrim',
    color: 0xef4444,
    fields: [
      { name: 'id (required)', value: 'The ID of the pending scrim you posted.' },
      { name: 'Note', value: 'You can only cancel scrims your team posted.' },
    ],
  },
  optout: {
    title: '🚪 /optout — Leave a confirmed scrim',
    color: 0xf97316,
    fields: [
      { name: 'id (required)', value: 'The ID of the confirmed scrim you accepted.' },
      { name: 'Note', value: 'Puts the scrim back on the board as pending so another team can accept.' },
    ],
  },
  scrims: {
    title: '📋 /scrims — View open scrims',
    color: 0x3b82f6,
    fields: [
      { name: 'No parameters', value: 'Lists all pending scrims looking for opponents. Only you can see the response.' },
    ],
  },
  myscrims: {
    title: '🗂️ /myscrims — Your team\'s scrims',
    color: 0x3b82f6,
    fields: [
      { name: 'No parameters', value: 'Shows your team\'s upcoming pending and confirmed scrims. Only you can see the response.' },
    ],
  },
  site: {
    title: '🌐 /site — Website link',
    color: 0x3b82f6,
    fields: [
      { name: 'No parameters', value: 'Returns the link to the scrim scheduler website where you can view and manage scrims.' },
    ],
  },
};

function handleHelp(command?: string) {
  if (command && COMMAND_HELP[command]) {
    return NextResponse.json({
      type: 4,
      data: { flags: 64, embeds: [COMMAND_HELP[command]] },
    });
  }

  return NextResponse.json({
    type: 4,
    data: {
      flags: 64,
      embeds: [{
        title: 'RL 6Mans West — Bot Commands',
        color: 0x3b82f6,
        description: 'Use `/help command:name` for detailed help on any command.',
        fields: [
          { name: '📅 /schedule', value: 'Post a scrim for your team.', inline: true },
          { name: '✅ /accept', value: 'Accept an open scrim.', inline: true },
          { name: '❌ /cancel', value: 'Cancel a scrim you posted.', inline: true },
          { name: '🚪 /optout', value: 'Leave a confirmed scrim.', inline: true },
          { name: '📋 /scrims', value: 'List all open scrims.', inline: true },
          { name: '🗂️ /myscrims', value: 'Your team\'s scrims.', inline: true },
          { name: '🌐 /site', value: 'Get the website link.', inline: true },
          { name: '❓ /help', value: 'Show this menu.', inline: true },
        ],
        footer: { text: 'All responses except /schedule announcements are only visible to you.' },
      }],
    },
  });
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
        case 'help':       return handleHelp(options.command as string | undefined);
        default:           return ephemeral('Unknown command.');
      }
    } catch (err) {
      console.error('Discord command error:', err);
      return ephemeral('Something went wrong. Try again.');
    }
  }

  return new NextResponse('Unhandled interaction type', { status: 400 });
}
