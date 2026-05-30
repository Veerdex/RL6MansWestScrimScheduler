'use client';

import { useTeam } from './TeamProvider';
import { getTeamLogoUrl } from '@/lib/types';

export function TeamWatermark() {
  const { team } = useTeam();
  if (!team) return null;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden>
      <div
        style={{
          position: 'absolute',
          inset: '-100%',
          backgroundImage: `url(${getTeamLogoUrl(team)})`,
          backgroundSize: '96px 96px',
          backgroundRepeat: 'repeat',
          transform: 'rotate(-30deg)',
          opacity: 0.035,
        }}
      />
    </div>
  );
}
