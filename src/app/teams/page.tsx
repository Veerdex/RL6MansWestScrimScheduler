'use client';

import { useState } from 'react';
import { TEAMS_DATA, GROUP_COLORS } from '@/lib/teams-data';
import { getTeamLogoUrl } from '@/lib/types';

const GROUPS = Array.from(new Set(TEAMS_DATA.map((t) => t.group)));

export default function TeamsPage() {
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  const filtered = TEAMS_DATA.filter((t) => {
    const matchesSearch =
      !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.players.some((p) => p.toLowerCase().includes(search.toLowerCase()));
    const matchesGroup = !selectedGroup || t.group === selectedGroup;
    return matchesSearch && matchesGroup;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Teams</h1>
        <p className="text-slate-400 text-sm mt-1">RL 6Mans West — Season standings</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search teams or players…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-surface-card border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-accent-blue"
        />
        <div className="flex gap-2 flex-wrap">
          {GROUPS.map((g) => {
            const colors = GROUP_COLORS[g];
            const active = selectedGroup === g;
            return (
              <button
                key={g}
                onClick={() => setSelectedGroup(active ? null : g)}
                className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                  active ? colors.badge + ' opacity-100' : 'bg-surface-card border-slate-700 text-slate-400 hover:border-slate-500'
                }`}
              >
                {g}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        {filtered.map((team) => {
          const groupColors = GROUP_COLORS[team.group];
          return (
            <div
              key={team.rank}
              className="bg-surface-card border border-slate-800 rounded-xl px-4 py-3 flex items-center gap-4"
            >
              <span className="text-slate-500 text-sm font-mono w-6 text-right flex-shrink-0">
                {team.rank}
              </span>

              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getTeamLogoUrl(team.name)}
                alt={team.name}
                width={32}
                height={32}
                className="rounded object-contain flex-shrink-0"
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white font-medium text-sm">{team.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${groupColors.badge}`}>
                    {team.group}
                  </span>
                </div>
                <p className="text-slate-500 text-xs mt-0.5">
                  {team.players.join(' · ')}
                </p>
              </div>

              <div className="text-right flex-shrink-0">
                <p className="text-white text-sm font-semibold">{team.rating.toFixed(1)}</p>
                <p className="text-slate-600 text-xs">rating</p>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-center text-slate-600 py-12">No teams match your search.</p>
        )}
      </div>
    </div>
  );
}
