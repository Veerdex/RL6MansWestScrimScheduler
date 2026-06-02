'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTeam } from './TeamProvider';
import { TEAM_COLORS, getTeamLogoUrl } from '@/lib/types';
import { VisitCounter } from './VisitCounter';

export function NavBar() {
  const pathname = usePathname();
  const { team } = useTeam();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLink = (href: string, label: string, onClick?: () => void) => (
    <Link
      href={href}
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
        pathname === href
          ? 'bg-surface-elevated text-white'
          : 'text-slate-400 hover:text-white hover:bg-surface-elevated'
      }`}
    >
      {label}
    </Link>
  );

  const close = () => setMenuOpen(false);

  return (
    <nav className="border-b border-slate-800 bg-surface/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between gap-2">

        {/* Left: title + primary nav links */}
        <div className="flex items-center gap-1 min-w-0">
          <span className="text-white font-bold mr-3 text-sm tracking-wide whitespace-nowrap hidden sm:block">
            RL 6Mans West
          </span>
          {navLink('/', 'Scrim Board')}
          {navLink('/my-scrims', 'My Scrims')}
          {/* Desktop-only links */}
          <div className="hidden md:flex items-center gap-1">
            {navLink('/calendar', 'Calendar')}
            {navLink('/teams', 'Teams')}
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="hidden md:block">
            <VisitCounter />
          </div>

          {team && (
            <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${TEAM_COLORS[team]?.badge}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={getTeamLogoUrl(team)} alt={team} width={14} height={14} className="rounded object-contain" />
              <span className="hidden sm:inline">{team}</span>
            </span>
          )}

          {/* Desktop switch */}
          {team && (
            <button
              onClick={() => { localStorage.removeItem('rl_team'); window.location.reload(); }}
              className="hidden md:block text-xs text-slate-600 hover:text-slate-400 transition-colors"
            >
              switch
            </button>
          )}

          {/* Hamburger — mobile only */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="md:hidden p-1.5 text-slate-400 hover:text-white transition-colors rounded-md hover:bg-surface-elevated"
            aria-label="Menu"
          >
            {menuOpen ? (
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-surface/95 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto px-4 py-2 flex flex-col gap-1">
            {navLink('/calendar', 'Calendar', close)}
            {navLink('/teams', 'Teams', close)}
            <div className="border-t border-slate-800 my-1" />
            <div className="px-3 py-1.5">
              <VisitCounter />
            </div>
            {team && (
              <button
                onClick={() => { localStorage.removeItem('rl_team'); window.location.reload(); }}
                className="px-3 py-2 text-left text-sm text-slate-400 hover:text-white hover:bg-surface-elevated rounded-md transition-colors"
              >
                Switch team
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
