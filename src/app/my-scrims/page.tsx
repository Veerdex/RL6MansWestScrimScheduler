'use client';

import { useEffect, useState } from 'react';
import { useTeam } from '@/components/TeamProvider';
import { ScrimCard } from '@/components/ScrimCard';
import type { Scrim } from '@/lib/types';

export default function MyScrims() {
  const { team } = useTeam();
  const [scrims, setScrims] = useState<Scrim[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMyScrims = async () => {
    if (!team) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/scrims?team=${encodeURIComponent(team)}`);
      const data = await res.json();
      setScrims(data.scrims ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyScrims();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team]);

  const handleConfirm = async (id: number) => {
    await fetch(`/api/scrims/${id}/confirm`, { method: 'POST' });
    fetchMyScrims();
  };

  const handleCancel = async (id: number) => {
    await fetch(`/api/scrims/${id}`, { method: 'DELETE' });
    fetchMyScrims();
  };

  if (!team) {
    return (
      <div className="text-center py-20 text-slate-400">
        Select your team to view your scrims.
      </div>
    );
  }

  const pending = scrims.filter((s) => s.status === 'pending');
  const confirmed = scrims.filter((s) => s.status === 'confirmed');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">My Scrims</h1>
        <p className="text-slate-400 text-sm mt-1">
          Scrims for <span className="text-white font-medium">{team}</span>
        </p>
      </div>

      <section>
        <h2 className="text-lg font-semibold text-slate-300 mb-3 flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-accent-orange" />
          Pending ({pending.length})
        </h2>
        {loading ? (
          <p className="text-slate-500">Loading…</p>
        ) : pending.length === 0 ? (
          <p className="text-slate-600 text-sm">No pending scrims.</p>
        ) : (
          <div className="space-y-3">
            {pending.map((s) => (
              <ScrimCard
                key={s.id}
                scrim={s}
                currentTeam={team}
                onConfirm={s.home_team === team ? () => handleConfirm(s.id) : undefined}
                onCancel={() => handleCancel(s.id)}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-300 mb-3 flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-accent-green" />
          Confirmed ({confirmed.length})
        </h2>
        {loading ? (
          <p className="text-slate-500">Loading…</p>
        ) : confirmed.length === 0 ? (
          <p className="text-slate-600 text-sm">No confirmed scrims yet.</p>
        ) : (
          <div className="space-y-3">
            {confirmed.map((s) => (
              <ScrimCard key={s.id} scrim={s} currentTeam={team} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
