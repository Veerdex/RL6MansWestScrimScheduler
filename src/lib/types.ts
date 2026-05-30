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

export const TEAMS = ['Dogs', 'Cats'] as const;
export type Team = (typeof TEAMS)[number];

export const TEAM_COLORS: Record<string, { bg: string; text: string; badge: string }> = {
  Dogs: { bg: 'bg-amber-900/30', text: 'text-amber-300', badge: 'bg-amber-800 text-amber-200' },
  Cats: { bg: 'bg-purple-900/30', text: 'text-purple-300', badge: 'bg-purple-800 text-purple-200' },
};
