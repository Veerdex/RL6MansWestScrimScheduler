'use client';

import { useEffect, useState } from 'react';
import { useTeam } from '@/components/TeamProvider';
import { PostScrimForm } from '@/components/PostScrimForm';
import { ScrimCard } from '@/components/ScrimCard';
import type { Scrim } from '@/lib/types';

export default function ScrimBoard() {
  const { team } = useTeam();
  const [scrims, setScrims] = useState<Scrim[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const fetchScrims = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/scrims?status=open');
      const data = await res.json();
      setScrims(data.scrims ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScrims();
  }, []);

  const handleAccept = async (id: number) => {
    if (!team) return;
    await fetch(`/api/scrims/${id}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ away_team: team }),
    });
    fetchScrims();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Scrim Board</h1>
          <p className="text-slate-400 text-sm mt-1">Open scrims looking for opponents</p>
        </div>
        {team && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="px-4 py-2 bg-accent-blue hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
          >
            {showForm ? 'Cancel' : '+ Post Scrim'}
          </button>
        )}
      </div>

      {showForm && team && (
        <PostScrimForm
          team={team}
          onPosted={() => {
            setShowForm(false);
            fetchScrims();
          }}
        />
      )}

      {loading ? (
        <div className="text-slate-500 text-center py-16">Loading scrims…</div>
      ) : scrims.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <p className="text-4xl mb-3">🚀</p>
          <p>No open scrims right now. Be the first to post one!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {scrims.map((s) => (
            <ScrimCard
              key={s.id}
              scrim={s}
              currentTeam={team}
              onAccept={
                team && s.home_team !== team && s.status === 'open'
                  ? () => handleAccept(s.id)
                  : undefined
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
