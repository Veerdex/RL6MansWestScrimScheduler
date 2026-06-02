'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTeam } from './TeamProvider';
import { TEAM_COLORS, getTeamLogoUrl } from '@/lib/types';
import { VisitCounter } from './VisitCounter';

export function NavBar() {
  const pathname = usePathname();
  const { team } = useTeam();

  const navLink = (href: string, label: string) => (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
        pathname === href
          ? 'bg-surface-elevated text-white'
          : 'text-slate-400 hover:text-white hover:bg-surface-elevated'
      }`}
    >
      {label}
    </Link>
  );

  return (
    <nav className="border-b border-slate-800 bg-surface/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="text-white font-bold mr-4 text-sm tracking-wide">
            RL 6Mans West
          </span>
          {navLink('/', 'Scrim Board')}
          {navLink('/my-scrims', 'My Scrims')}
          {navLink('/calendar', 'Calendar')}
          {navLink('/teams', 'Teams')}
        </div>
        <div className="flex items-center gap-4">
          <VisitCounter />
          {team && (
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${TEAM_COLORS[team]?.badge}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={getTeamLogoUrl(team)} alt={team} width={14} height={14} className="rounded object-contain" />
              {team}
            </span>
            <button
              onClick={() => {
                localStorage.removeItem('rl_team');
                window.location.reload();
              }}
              className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
            >
              switch
            </button>
          </div>
          )}
        </div>
      </div>
    </nav>
  );
}
