'use client';

import { useEffect, useState } from 'react';
import { useTeam } from '@/components/TeamProvider';
import { ScrimCard } from '@/components/ScrimCard';
import { groupByDay } from '@/lib/utils';
import type { Scrim } from '@/lib/types';

function DayGroup({
  scrims,
  renderCard,
}: {
  scrims: Scrim[];
  renderCard: (s: Scrim) => React.ReactNode;
}) {
  const groups = groupByDay(scrims);
  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <div key={group.key}>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            {group.label}
          </h3>
          <div className="space-y-3">{group.items.map(renderCard)}</div>
        </div>
      ))}
    </div>
  );
}

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

  const handleCancel = async (id: number) => {
    await fetch(`/api/scrims/${id}`, { method: 'DELETE' });
    fetchMyScrims();
  };

  const handleOptOut = async (id: number) => {
    await fetch(`/api/scrims/${id}/unaccept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ away_team: team }),
    });
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
          <DayGroup
            scrims={pending}
            renderCard={(s) => (
              <ScrimCard
                key={s.id}
                scrim={s}
                currentTeam={team}
                onCancel={() => handleCancel(s.id)}
              />
            )}
          />
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
          <DayGroup
            scrims={confirmed}
            renderCard={(s) => (
              <ScrimCard
                key={s.id}
                scrim={s}
                currentTeam={team}
                onOptOut={s.away_team === team ? () => handleOptOut(s.id) : undefined}
              />
            )}
          />
        )}
      </section>
    </div>
  );
}
