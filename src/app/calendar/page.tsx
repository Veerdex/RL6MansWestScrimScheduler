'use client';

import { useEffect, useState } from 'react';
import { ScrimCard } from '@/components/ScrimCard';
import { useTeam } from '@/components/TeamProvider';
import type { Scrim } from '@/lib/types';

function getNext7Days(): { date: Date; label: string }[] {
  const days: { date: Date; label: string }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const labels = ['Today', 'Tomorrow'];

  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const label =
      i < 2
        ? labels[i]
        : d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
    days.push({ date: d, label });
  }
  return days;
}

function isSameLocalDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function CalendarPage() {
  const { team } = useTeam();
  const [scrims, setScrims] = useState<Scrim[]>([]);
  const [loading, setLoading] = useState(true);
  const days = getNext7Days();

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/scrims');
        const data = await res.json();
        const all: Scrim[] = data.scrims ?? [];
        setScrims(all.filter((s) => s.status === 'confirmed'));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Calendar</h1>
        <p className="text-slate-400 text-sm mt-1">Upcoming scrims over the next 7 days</p>
      </div>

      {loading ? (
        <div className="text-slate-500 text-center py-16">Loading…</div>
      ) : (
        <div className="space-y-6">
          {days.map(({ date, label }) => {
            const dayScrims = scrims.filter((s) =>
              isSameLocalDay(new Date(s.scheduled_at), date)
            );
            return (
              <div key={label}>
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                    {label}
                  </h2>
                  <div className="flex-1 border-t border-slate-800" />
                  {dayScrims.length > 0 && (
                    <span className="text-xs text-slate-600">{dayScrims.length} scrim{dayScrims.length !== 1 ? 's' : ''}</span>
                  )}
                </div>
                {dayScrims.length === 0 ? (
                  <p className="text-slate-700 text-sm">No scrims scheduled.</p>
                ) : (
                  <div className="space-y-3">
                    {dayScrims.map((s) => (
                      <ScrimCard key={s.id} scrim={s} currentTeam={team} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
