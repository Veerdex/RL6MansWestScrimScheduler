export const TEAM_ROLE_MAP: Record<string, string> = {
  '1504967072478924880': 'Shorpify Rebellion',
  '1504967308831887591': 'Flowerboys',
  '1504967358232658147': 'Sackpack',
  '1504967411508707438': 'Arrh Arrh Arrh',
  '1504967459579498566': 'Stickless',
  '1504967508392939520': 'Los Habibis',
  '1504967563124412547': 'Absolutely No Clue',
  '1504967656879423529': "Santa's Sack",
  '1504967715704799302': 'Beef Brawlers',
  '1504967758079852595': 'Corona with Lime',
  '1504967800152653945': 'Tsukuyomi',
  '1504967839784636427': 'Bricked Beyond Belief',
  '1504967874530377881': 'Slot Team 6',
  '1504967909666197564': 'Dream Blunt Rotation',
  '1504967971204890725': "Shrek's Minions",
  '1504967957900558476': 'One in a Krillion',
  '1504968114570264576': 'DUI',
  '1504968172032495807': 'Deep Sea Dominators',
  '1504968231704858654': 'Las Abuelas',
  '1504968277615444028': 'Vacay',
  '1504968335266414682': 'Sweetie Pis',
  '1504968385669234789': 'Zouch Oven',
  '1504968424307163358': 'Tasselled Wobbegong',
  '1504968464799105144': 'Reef Raiders',
  '1504968533845610656': '3 Pickles In a Pod',
  '1504968616699760780': 'Bandits',
  '1504968662568800337': '$2 and an Overpay',
  '1504968708022599720': 'Sophisticated Gentlemen',
  '1504968754839421048': 'Jimmie Johns',
  '1504968798942531584': 'GentleBR8s',
  '1504968857805258932': 'Egoists',
  '1504968895587684352': 'Full Send FC',
};

export const TEAM_NAME_TO_ROLE: Record<string, string> = Object.fromEntries(
  Object.entries(TEAM_ROLE_MAP).map(([id, name]) => [name, id])
);

export function getTeamFromRoles(roleIds: string[]): string | null {
  for (const roleId of roleIds) {
    if (TEAM_ROLE_MAP[roleId]) return TEAM_ROLE_MAP[roleId];
  }
  return null;
}

export const DAYS_OF_WEEK = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
] as const;

// UTC offset for the league's timezone (e.g. -7 for US Pacific Daylight, -8 for Standard)
const LEAGUE_UTC_OFFSET = Number(process.env.LEAGUE_UTC_OFFSET ?? '-7');
const MS_PER_HOUR = 3600000;
const MS_PER_DAY = 86400000;

export function resolveScheduledAt(
  hour: number,
  minute: number,
  ampm: 'AM' | 'PM',
  day?: string
): Date {
  let h = hour % 12;
  if (ampm === 'PM') h += 12;

  // Shift now into league-local time so all comparisons are in the user's timezone
  const nowUtcMs = Date.now();
  const nowLeagueMs = nowUtcMs + LEAGUE_UTC_OFFSET * MS_PER_HOUR;
  const nowLeague = new Date(nowLeagueMs);

  // Midnight of today in league-local time (as a UTC ms value offset by the tz)
  const leagueMidnight =
    Date.UTC(nowLeague.getUTCFullYear(), nowLeague.getUTCMonth(), nowLeague.getUTCDate());

  if (day) {
    const todayIndex = nowLeague.getUTCDay();
    const targetIndex = DAYS_OF_WEEK.indexOf(day as typeof DAYS_OF_WEEK[number]);
    let daysAhead = targetIndex - todayIndex;
    if (daysAhead < 0) daysAhead += 7;

    let candidateLeagueMs = leagueMidnight + daysAhead * MS_PER_DAY + h * MS_PER_HOUR + minute * 60000;
    if (daysAhead === 0 && candidateLeagueMs <= nowLeagueMs) {
      candidateLeagueMs += 7 * MS_PER_DAY;
    }
    // Convert league-local ms back to real UTC
    return new Date(candidateLeagueMs - LEAGUE_UTC_OFFSET * MS_PER_HOUR);
  }

  // No day — use today if time hasn't passed, otherwise tomorrow
  const todayCandidateMs = leagueMidnight + h * MS_PER_HOUR + minute * 60000;
  const resultLeagueMs = todayCandidateMs > nowLeagueMs
    ? todayCandidateMs
    : todayCandidateMs + MS_PER_DAY;
  return new Date(resultLeagueMs - LEAGUE_UTC_OFFSET * MS_PER_HOUR);
}
