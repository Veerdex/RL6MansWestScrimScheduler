// Run with: node scripts/deploy-discord-commands.mjs
// Requires DISCORD_BOT_TOKEN, DISCORD_APPLICATION_ID, DISCORD_GUILD_ID in environment

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const APP_ID = process.env.DISCORD_APPLICATION_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID;

if (!TOKEN || !APP_ID || !GUILD_ID) {
  console.error('Missing DISCORD_BOT_TOKEN, DISCORD_APPLICATION_ID, or DISCORD_GUILD_ID');
  process.exit(1);
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const commands = [
  {
    name: 'schedule',
    description: 'Post a scrim for your team',
    options: [
      {
        name: 'hour',
        description: 'Hour (1–12)',
        type: 4, // INTEGER
        required: true,
        min_value: 1,
        max_value: 12,
      },
      {
        name: 'minute',
        description: 'Minutes (default: 0)',
        type: 4,
        required: false,
        choices: [
          { name: '15', value: 15 },
          { name: '30', value: 30 },
          { name: '45', value: 45 },
        ],
      },
      {
        name: 'am_pm',
        description: 'Only needed for AM — PM is default',
        type: 3,
        required: false,
        choices: [
          { name: 'AM', value: 'AM' },
        ],
      },
      {
        name: 'duration',
        description: 'How many hours available (e.g. 4 = from start time for 4 hours)',
        type: 4,
        required: false,
        choices: [1, 2, 3, 4, 5, 6].map((h) => ({ name: `${h} hour${h !== 1 ? 's' : ''}`, value: h })),
      },
      {
        name: 'day',
        description: 'Day of the week (default: today or tomorrow based on hour)',
        type: 3,
        required: false,
        choices: DAYS.map((d) => ({ name: d, value: d })),
      },
      {
        name: 'note',
        description: 'Optional note (e.g. best of 5)',
        type: 3,
        required: false,
      },
    ],
  },
  {
    name: 'scrims',
    description: 'List all open scrims',
  },
  {
    name: 'accept',
    description: 'Accept an open scrim',
    options: [
      {
        name: 'id',
        description: 'Scrim ID',
        type: 4,
        required: true,
      },
      {
        name: 'hour',
        description: 'Your preferred time (required for range scrims)',
        type: 4,
        required: false,
        min_value: 1,
        max_value: 12,
      },
      {
        name: 'minute',
        description: 'Minutes (default: 0)',
        type: 4,
        required: false,
        choices: [
          { name: '15', value: 15 },
          { name: '30', value: 30 },
          { name: '45', value: 45 },
        ],
      },
      {
        name: 'am_pm',
        description: 'Only needed for AM — PM is default',
        type: 3,
        required: false,
        choices: [
          { name: 'AM', value: 'AM' },
        ],
      },
    ],
  },
  {
    name: 'cancel',
    description: 'Cancel a scrim you posted',
    options: [
      {
        name: 'id',
        description: 'Scrim ID',
        type: 4,
        required: true,
      },
    ],
  },
  {
    name: 'optout',
    description: 'Opt out of a confirmed scrim you accepted',
    options: [
      {
        name: 'id',
        description: 'Scrim ID',
        type: 4,
        required: true,
      },
    ],
  },
  {
    name: 'myscrims',
    description: 'View your team\'s upcoming scrims',
  },
  {
    name: 'site',
    description: 'Get the link to the scrim scheduler website',
  },
  {
    name: 'help',
    description: 'Show all available bot commands and how to use them',
    options: [
      {
        name: 'command',
        description: 'Get detailed help for a specific command',
        type: 3,
        required: false,
        choices: ['schedule','accept','cancel','optout','scrims','myscrims','site'].map((c) => ({ name: c, value: c })),
      },
    ],
  },
];

const url = `https://discord.com/api/v10/applications/${APP_ID}/guilds/${GUILD_ID}/commands`;

const res = await fetch(url, {
  method: 'PUT',
  headers: {
    Authorization: `Bot ${TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(commands),
});

if (res.ok) {
  console.log(`✓ Registered ${commands.length} commands to guild ${GUILD_ID}`);
} else {
  const err = await res.text();
  console.error('Failed to register commands:', err);
  process.exit(1);
}
