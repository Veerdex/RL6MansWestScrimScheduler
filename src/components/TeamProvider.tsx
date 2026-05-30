'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { TeamModal } from './TeamModal';
import type { Team } from '@/lib/types';

interface TeamContextValue {
  team: Team | null;
  setTeam: (t: Team) => void;
}

const TeamContext = createContext<TeamContextValue>({
  team: null,
  setTeam: () => {},
});

export function TeamProvider({ children }: { children: React.ReactNode }) {
  const [team, setTeamState] = useState<Team | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('rl_team') as Team | null;
    if (stored) {
      setTeamState(stored);
    } else {
      setShowModal(true);
    }
    setHydrated(true);
  }, []);

  const setTeam = (t: Team) => {
    localStorage.setItem('rl_team', t);
    setTeamState(t);
    setShowModal(false);
  };

  if (!hydrated) return null;

  return (
    <TeamContext.Provider value={{ team, setTeam }}>
      {showModal && <TeamModal onSelect={setTeam} />}
      {children}
    </TeamContext.Provider>
  );
}

export function useTeam() {
  return useContext(TeamContext);
}
