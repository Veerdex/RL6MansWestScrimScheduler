'use client';

import type { Team } from '@/lib/types';
import { TEAMS, TEAM_COLORS } from '@/lib/types';

interface Props {
  onSelect: (team: Team) => void;
}

export function TeamModal({ onSelect }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-surface-card border border-slate-700 rounded-2xl p-8 w-full max-w-sm shadow-2xl">
        <h2 className="text-2xl font-bold text-white text-center mb-2">Welcome</h2>
        <p className="text-slate-400 text-center text-sm mb-8">
          Pick your team to get started. This is saved in your browser.
        </p>
        <div className="space-y-3">
          {TEAMS.map((t) => {
            const colors = TEAM_COLORS[t];
            return (
              <button
                key={t}
                onClick={() => onSelect(t)}
                className={`w-full py-4 rounded-xl font-semibold text-lg transition-all border border-transparent hover:border-slate-500 ${colors.bg} ${colors.text} hover:scale-[1.02] active:scale-[0.98]`}
              >
                {t === 'Dogs' ? '🐶' : '🐱'} {t}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
