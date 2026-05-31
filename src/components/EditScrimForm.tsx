'use client';

import { useMemo, useState } from 'react';
import type { Scrim } from '@/lib/types';

interface Props {
  scrim: Scrim;
  onSaved: () => void;
  onCancel: () => void;
}

function generateDates(count: number): Date[] {
  const dates: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function generateTimes(): { label: string; value: string }[] {
  const times: { label: string; value: string }[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hour12 = h % 12 || 12;
      const ampm = h < 12 ? 'AM' : 'PM';
      times.push({
        label: `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`,
        value: `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`,
      });
    }
  }
  return times;
}

function getDayChipLabel(date: Date): { top: string; bottom: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const bottom = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  if (date.getTime() === today.getTime()) return { top: 'Today', bottom };
  if (date.getTime() === tomorrow.getTime()) return { top: 'Tomorrow', bottom };
  return { top: date.toLocaleDateString(undefined, { weekday: 'short' }), bottom };
}

const TIMES = generateTimes();

export function EditScrimForm({ scrim, onSaved, onCancel }: Props) {
  const dates = useMemo(() => generateDates(14), []);

  const existing = new Date(scrim.scheduled_at);
  const initialDate =
    dates.find(
      (d) =>
        d.getFullYear() === existing.getFullYear() &&
        d.getMonth() === existing.getMonth() &&
        d.getDate() === existing.getDate()
    ) ?? null;
  const initialTime = `${existing.getHours().toString().padStart(2, '0')}:${existing.getMinutes().toString().padStart(2, '0')}`;

  const [selectedDate, setSelectedDate] = useState<Date | null>(initialDate);
  const [selectedTime, setSelectedTime] = useState(initialTime);
  const [note, setNote] = useState(scrim.note ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime) {
      setError('Pick a date and time.');
      return;
    }
    setError('');
    setSubmitting(true);

    const [hours, minutes] = selectedTime.split(':').map(Number);
    const scheduledAt = new Date(selectedDate);
    scheduledAt.setHours(hours, minutes, 0, 0);

    try {
      const res = await fetch(`/api/scrims/${scrim.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduled_at: scheduledAt.toISOString(), note }),
      });
      if (!res.ok) throw new Error('Failed to save');
      onSaved();
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-surface-elevated border border-slate-600 rounded-xl p-4 space-y-4 mt-2"
    >
      <div className="space-y-2">
        <label className="text-sm text-slate-400">Date</label>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {dates.map((date) => {
            const { top, bottom } = getDayChipLabel(date);
            const isSelected = selectedDate?.getTime() === date.getTime();
            return (
              <button
                key={date.toISOString()}
                type="button"
                onClick={() => setSelectedDate(date)}
                className={`flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-lg border text-sm transition-colors ${
                  isSelected
                    ? 'bg-accent-blue border-accent-blue text-white'
                    : 'bg-surface-card border-slate-700 text-slate-300 hover:border-slate-500'
                }`}
              >
                <span className="font-medium text-xs">{top}</span>
                <span className="text-xs opacity-75">{bottom}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm text-slate-400">Time</label>
        <select
          value={selectedTime}
          onChange={(e) => setSelectedTime(e.target.value)}
          className="w-full bg-surface-card border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-accent-blue"
        >
          <option value="">Select a time…</option>
          {TIMES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-sm text-slate-400">
          Note <span className="text-slate-600">(optional)</span>
        </label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. best of 5, no subs"
          maxLength={120}
          className="w-full bg-surface-card border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-accent-blue"
        />
      </div>

      {error && <p className="text-accent-red text-sm">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 py-2 bg-accent-blue hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg font-medium text-sm transition-colors"
        >
          {submitting ? 'Saving…' : 'Save Changes'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg font-medium text-sm transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
