'use client';

import { useState } from 'react';
import { TIMES } from './PostScrimForm';
import type { Scrim } from '@/lib/types';
import { formatTime } from '@/lib/utils';

interface Props {
  scrim: Scrim;
  onAccept: (time: string) => void;
  onCancel: () => void;
}

export function AcceptTimeForm({ scrim, onAccept, onCancel }: Props) {
  const [selectedTime, setSelectedTime] = useState('');
  const [error, setError] = useState('');

  const start = new Date(scrim.scheduled_at);
  const end = new Date(scrim.end_time!);
  const startVal = `${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')}`;
  const endVal = `${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}`;

  const available = TIMES.filter((t) => t.value >= startVal && t.value <= endVal);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTime) { setError('Pick a time.'); return; }
    const [h, m] = selectedTime.split(':').map(Number);
    const date = new Date(scrim.scheduled_at);
    date.setHours(h, m, 0, 0);
    onAccept(date.toISOString());
  };

  return (
    <form onSubmit={handleSubmit} className="bg-surface-elevated border border-slate-600 rounded-xl p-4 space-y-3 mt-2">
      <p className="text-slate-300 text-sm">
        This team is available <span className="text-white font-medium">{formatTime(scrim.scheduled_at)} – {formatTime(scrim.end_time!)}</span>. Pick a time to play:
      </p>

      <select
        value={selectedTime}
        onChange={(e) => setSelectedTime(e.target.value)}
        className="w-full bg-surface-card border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-accent-blue"
      >
        <option value="">Select a time…</option>
        {available.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>

      {error && <p className="text-accent-red text-sm">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" className="flex-1 py-2 bg-accent-blue hover:bg-blue-500 text-white rounded-lg font-medium text-sm transition-colors">
          Confirm Time
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg font-medium text-sm transition-colors">
          Cancel
        </button>
      </div>
    </form>
  );
}
