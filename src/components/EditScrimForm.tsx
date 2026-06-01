'use client';

import { useMemo, useState } from 'react';
import type { Scrim } from '@/lib/types';
import { DatePicker, TimePicker } from './PostScrimForm';

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

interface Props {
  scrim: Scrim;
  onSaved: () => void;
  onCancel: () => void;
}

function getInitialDate(scheduled_at: string, dates: Date[]): Date | null {
  const d = new Date(scheduled_at);
  return dates.find(
    (date) =>
      date.getFullYear() === d.getFullYear() &&
      date.getMonth() === d.getMonth() &&
      date.getDate() === d.getDate()
  ) ?? null;
}

function toTimeValue(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function buildDateTime(date: Date, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const d = new Date(date);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

export function EditScrimForm({ scrim, onSaved, onCancel }: Props) {
  const dates = useMemo(() => generateDates(14), []);
  const [selectedDate, setSelectedDate] = useState<Date | null>(getInitialDate(scrim.scheduled_at, dates));
  const [startTime, setStartTime] = useState(toTimeValue(scrim.scheduled_at));
  const [isRange, setIsRange] = useState(!!scrim.end_time);
  const [duration, setDuration] = useState(() => {
    if (!scrim.end_time) return 1;
    return Math.max(1, Math.round((new Date(scrim.end_time).getTime() - new Date(scrim.scheduled_at).getTime()) / (60 * 60 * 1000)));
  });
  const [note, setNote] = useState(scrim.note ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !startTime) { setError('Pick a date and time.'); return; }
    setError('');
    setSubmitting(true);

    const scheduledAt = buildDateTime(selectedDate, startTime);
    const endAt = isRange ? new Date(scheduledAt.getTime() + duration * 60 * 60 * 1000) : null;

    try {
      const res = await fetch(`/api/scrims/${scrim.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduled_at: scheduledAt.toISOString(),
          end_time: endAt?.toISOString() ?? null,
          note,
        }),
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
    <form onSubmit={handleSubmit} className="bg-surface-elevated border border-slate-600 rounded-xl p-4 space-y-4 mt-2">
      <div className="space-y-2">
        <label className="text-sm text-slate-400">Date</label>
        <DatePicker dates={dates} selected={selectedDate} onSelect={setSelectedDate} />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setIsRange(false)}
          className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
            !isRange ? 'bg-accent-blue border-accent-blue text-white' : 'bg-surface-card border-slate-700 text-slate-400 hover:border-slate-500'
          }`}
        >
          Specific Time
        </button>
        <button
          type="button"
          onClick={() => setIsRange(true)}
          className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
            isRange ? 'bg-accent-blue border-accent-blue text-white' : 'bg-surface-card border-slate-700 text-slate-400 hover:border-slate-500'
          }`}
        >
          Time Range
        </button>
      </div>

      <TimePicker value={startTime} onChange={setStartTime} label={isRange ? 'Available from' : 'Time'} />
      {isRange && (
        <div className="space-y-1">
          <label className="text-sm text-slate-400">Duration</label>
          <select
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full bg-surface-card border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-accent-blue"
          >
            {[1, 2, 3, 4, 5, 6].map((h) => (
              <option key={h} value={h}>{h} hour{h !== 1 ? 's' : ''}</option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-1">
        <label className="text-sm text-slate-400">Note <span className="text-slate-600">(optional)</span></label>
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
        <button type="submit" disabled={submitting} className="flex-1 py-2 bg-accent-blue hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg font-medium text-sm transition-colors">
          {submitting ? 'Saving…' : 'Save Changes'}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg font-medium text-sm transition-colors">
          Cancel
        </button>
      </div>
    </form>
  );
}
