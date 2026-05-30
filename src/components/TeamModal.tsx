'use client';

import { useState } from 'react';
import type { Team } from '@/lib/types';
import { TEAMS, getTeamLogoUrl } from '@/lib/types';

interface Props {
  onSelect: (team: Team) => void;
}

export function TeamModal({ onSelect }: Props) {
  const [search, setSearch] = useState('');

  const filtered = TEAMS.filter((t) =>
    t.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-surface-card border border-slate-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        <h2 className="text-2xl font-bold text-white text-center mb-1">Welcome</h2>
        <p className="text-slate-400 text-center text-sm mb-4">
          Pick your team to get started. This is saved in your browser.
        </p>

        <input
          type="text"
          placeholder="Search teams…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-surface-elevated border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-accent-blue mb-4"
          autoFocus
        />

        <div className="overflow-y-auto flex-1 grid grid-cols-2 gap-2 pr-1">
          {filtered.map((t) => (
            <button
              key={t}
              onClick={() => onSelect(t)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-surface-elevated border border-slate-700 hover:border-slate-500 hover:bg-slate-700/50 transition-all text-left"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getTeamLogoUrl(t)}
                alt={t}
                width={28}
                height={28}
                className="rounded object-contain flex-shrink-0"
              />
              <span className="text-white text-xs font-medium leading-tight">{t}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="col-span-2 text-center text-slate-600 py-4 text-sm">No teams found.</p>
          )}
        </div>
      </div>
    </div>
  );
}
