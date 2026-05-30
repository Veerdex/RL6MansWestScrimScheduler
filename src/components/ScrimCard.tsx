'use client';

import type { Scrim, Team } from '@/lib/types';
import { TEAM_COLORS, getTeamLogoUrl } from '@/lib/types';
import { formatTime } from '@/lib/utils';

interface Props {
  scrim: Scrim;
  currentTeam: Team | null;
  onAccept?: () => void;
  onConfirm?: () => void;
  onCancel?: () => void;
}

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-blue-500/20 text-blue-400',
  pending: 'bg-orange-500/20 text-orange-400',
  confirmed: 'bg-green-500/20 text-green-400',
};

function TeamBadge({ name }: { name: string }) {
  const colors = TEAM_COLORS[name] ?? { badge: 'bg-slate-700 text-slate-300' };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium ${colors.badge}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={getTeamLogoUrl(name)}
        alt={name}
        width={14}
        height={14}
        className="rounded object-contain"
      />
      {name}
    </span>
  );
}

export function ScrimCard({ scrim, currentTeam, onAccept, onConfirm, onCancel }: Props) {
  const isMyScrim =
    currentTeam &&
    (scrim.home_team === currentTeam || scrim.away_team === currentTeam);

  return (
    <div
      className={`bg-surface-card border rounded-xl p-4 transition-all ${
        isMyScrim ? 'border-slate-600' : 'border-slate-800'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <TeamBadge name={scrim.home_team} />
            <span className="text-slate-600 text-sm">vs</span>
            {scrim.away_team ? (
              <TeamBadge name={scrim.away_team} />
            ) : (
              <span className="text-slate-600 text-xs italic">TBD</span>
            )}
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ml-auto ${STATUS_STYLES[scrim.status]}`}
            >
              {scrim.status}
            </span>
          </div>

          <p className="text-slate-300 text-sm">{formatTime(scrim.scheduled_at)}</p>

          {scrim.note && <p className="text-slate-500 text-xs">{scrim.note}</p>}
        </div>
      </div>

      {(onAccept || onConfirm || onCancel) && (
        <div className="mt-3 pt-3 border-t border-slate-800 flex gap-2">
          {onAccept && (
            <button
              onClick={onAccept}
              className="px-3 py-1.5 bg-accent-blue hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Accept
            </button>
          )}
          {onConfirm && (
            <button
              onClick={onConfirm}
              className="px-3 py-1.5 bg-accent-green hover:bg-green-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Confirm
            </button>
          )}
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      )}
    </div>
  );
}
