import { TEAM_NAME_TO_ROLE } from './discord-teams';

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;
const SCRIM_ROLE_ID = process.env.DISCORD_SCRIM_ROLE_ID;

async function discordPost(url: string, body: object) {
  if (!BOT_TOKEN) return;
  await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bot ${BOT_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function dmUser(userId: string, content: string) {
  if (!BOT_TOKEN) return;
  const res = await fetch('https://discord.com/api/v10/users/@me/channels', {
    method: 'POST',
    headers: { Authorization: `Bot ${BOT_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipient_id: userId }),
  });
  const dm = await res.json() as { id?: string };
  if (dm.id) {
    await discordPost(`https://discord.com/api/v10/channels/${dm.id}/messages`, { content });
  }
}

export async function notifyScrimPosted(scrim: {
  id: number | bigint;
  home_team: string;
  scheduled_at: string;
  end_time?: string | null;
  note?: string | null;
}) {
  if (!BOT_TOKEN || !CHANNEL_ID) return;
  const ts = Math.floor(new Date(scrim.scheduled_at).getTime() / 1000);
  const timeValue = scrim.end_time
    ? `<t:${ts}:t> – <t:${Math.floor(new Date(scrim.end_time).getTime() / 1000)}:t> PST on <t:${ts}:D>`
    : `<t:${ts}:F> (PST)`;

  await discordPost(`https://discord.com/api/v10/channels/${CHANNEL_ID}/messages`, {
    content: `<@&${SCRIM_ROLE_ID}> **${scrim.home_team}** is looking for a scrim!`,
    embeds: [{
      title: `Scrim #${scrim.id}`,
      color: 0xf97316,
      fields: [
        { name: 'Home', value: scrim.home_team, inline: true },
        { name: 'Away', value: 'TBD', inline: true },
        { name: 'Time', value: timeValue, inline: false },
        ...(scrim.note ? [{ name: 'Note', value: scrim.note }] : []),
      ],
      footer: { text: 'Pending — use /accept id to claim this scrim' },
    }],
  });
}

export async function notifyScrimAccepted(scrim: {
  id: number | bigint;
  home_team: string;
  away_team: string;
  scheduled_at: string;
  note?: string | null;
  discord_user_id?: string | null;
}) {
  if (!BOT_TOKEN || !CHANNEL_ID) return;
  const ts = Math.floor(new Date(scrim.scheduled_at).getTime() / 1000);
  const homeRoleId = TEAM_NAME_TO_ROLE[scrim.home_team];
  const homeMention = homeRoleId ? `<@&${homeRoleId}>` : `**${scrim.home_team}**`;

  await discordPost(`https://discord.com/api/v10/channels/${CHANNEL_ID}/messages`, {
    content: `${homeMention} your scrim has been accepted by **${scrim.away_team}**!`,
    embeds: [{
      title: `Scrim #${scrim.id}`,
      color: 0x22c55e,
      fields: [
        { name: 'Home', value: scrim.home_team, inline: true },
        { name: 'Away', value: scrim.away_team, inline: true },
        { name: 'Time', value: `<t:${ts}:F> (PST)`, inline: false },
        ...(scrim.note ? [{ name: 'Note', value: scrim.note }] : []),
      ],
      footer: { text: 'Confirmed' },
    }],
  });

  if (scrim.discord_user_id) {
    await dmUser(
      scrim.discord_user_id,
      `Your scrim has been accepted! **${scrim.home_team}** vs **${scrim.away_team}** — <t:${ts}:F> (PST)`
    );
  }
}
