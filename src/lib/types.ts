export type ScrimStatus = 'open' | 'pending' | 'confirmed';

export interface Scrim {
  id: number;
  home_team: string;
  away_team: string | null;
  scheduled_at: string;
  note: string;
  status: ScrimStatus;
  created_at: string;
}

export const TEAMS = [
  '$2 and an Overpay',
  '3 Pickles In a Pod',
  'Absolutely No Clue',
  'Arrh Arrh Arrh',
  'Bandits',
  'Beef Brawlers',
  'Bricked Beyond Belief',
  'Corona with Lime',
  'DUI',
  'Deep Sea Dominators',
  'Dream Blunt Rotation',
  'Egoists',
  'Flowerboys',
  'Full Send FC',
  'GentleBR8s',
  'Jimmie Johns',
  'Las Abuelas',
  'Los Habibis',
  'One in a Krillion',
  'Reef Raiders',
  'Sackpack',
  "Santa's Sack",
  'Shorpify Rebellion',
  "Shrek's Minions",
  'Slot Team 6',
  'Sophisticated Gentlemen',
  'Stickless',
  'Sweetie Pis',
  'Tasselled Wobbegong',
  'Tsukuyomi',
  'Vacay',
  'Zouch Oven',
] as const;

export type Team = (typeof TEAMS)[number];

export function getTeamLogoUrl(name: string): string {
  return `/teams/${encodeURIComponent(name)}/logo.png`;
}

const BADGE_PALETTE = [
  { bg: 'bg-blue-900/40', text: 'text-blue-300', badge: 'bg-blue-800 text-blue-200' },
  { bg: 'bg-purple-900/40', text: 'text-purple-300', badge: 'bg-purple-800 text-purple-200' },
  { bg: 'bg-green-900/40', text: 'text-green-300', badge: 'bg-green-800 text-green-200' },
  { bg: 'bg-red-900/40', text: 'text-red-300', badge: 'bg-red-800 text-red-200' },
  { bg: 'bg-yellow-900/40', text: 'text-yellow-300', badge: 'bg-yellow-800 text-yellow-200' },
  { bg: 'bg-pink-900/40', text: 'text-pink-300', badge: 'bg-pink-800 text-pink-200' },
  { bg: 'bg-indigo-900/40', text: 'text-indigo-300', badge: 'bg-indigo-800 text-indigo-200' },
  { bg: 'bg-teal-900/40', text: 'text-teal-300', badge: 'bg-teal-800 text-teal-200' },
  { bg: 'bg-orange-900/40', text: 'text-orange-300', badge: 'bg-orange-800 text-orange-200' },
  { bg: 'bg-cyan-900/40', text: 'text-cyan-300', badge: 'bg-cyan-800 text-cyan-200' },
];

function hashTeam(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

export const TEAM_COLORS: Record<string, { bg: string; text: string; badge: string }> =
  Object.fromEntries(TEAMS.map((t) => [t, BADGE_PALETTE[hashTeam(t) % BADGE_PALETTE.length]]));
