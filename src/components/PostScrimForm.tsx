'use client';

import { useMemo, useState } from 'react';
import type { Team } from '@/lib/types';

interface Props {
  team: Team;
  onPosted: () => void;
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

export function generateTimes(): { label: string; value: string }[] {
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

export const TIMES = generateTimes();

function buildDateTime(date: Date, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const d = new Date(date);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

export function DatePicker({ dates, selected, onSelect }: {
  dates: Date[];
  selected: Date | null;
  onSelect: (d: Date) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {dates.map((date) => {
        const { top, bottom } = getDayChipLabel(date);
        const isSelected = selected?.getTime() === date.getTime();
        return (
          <button
            key={date.toISOString()}
            type="button"
            onClick={() => onSelect(date)}
            className={`flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-lg border text-sm transition-colors ${
              isSelected
                ? 'bg-accent-blue border-accent-blue text-white'
                : 'bg-surface-elevated border-slate-600 text-slate-300 hover:border-slate-400'
            }`}
          >
            <span className="font-medium text-xs">{top}</span>
            <span className="text-xs opacity-75">{bottom}</span>
          </button>
        );
      })}
    </div>
  );
}

export function TimePicker({ value, onChange, label, filterAfter }: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  filterAfter?: string;
}) {
  const times = filterAfter
    ? TIMES.filter((t) => t.value > filterAfter)
    : TIMES;
  return (
    <div className="space-y-1">
      <label className="text-sm text-slate-400">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-surface-elevated border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-accent-blue"
      >
        <option value="">Select a time…</option>
        {times.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>
    </div>
  );
}

export function PostScrimForm({ team, onPosted }: Props) {
  const dates = useMemo(() => generateDates(14), []);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState('');
  const [isRange, setIsRange] = useState(false);
  const [duration, setDuration] = useState(1);
  const [note, setNote] = useState('');
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
      const res = await fetch('/api/scrims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          home_team: team,
          scheduled_at: scheduledAt.toISOString(),
          end_time: endAt?.toISOString() ?? null,
          note,
        }),
      });
      if (!res.ok) throw new Error('Failed to post');
      onPosted();
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-surface-card border border-slate-700 rounded-xl p-5 space-y-4">
      <h3 className="text-white font-semibold">
        Post a Scrim as <span className="text-accent-blue">{team}</span>
      </h3>

      <div className="space-y-2">
        <label className="text-sm text-slate-400">Date</label>
        <DatePicker dates={dates} selected={selectedDate} onSelect={setSelectedDate} />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setIsRange(false)}
          className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
            !isRange ? 'bg-accent-blue border-accent-blue text-white' : 'bg-surface-elevated border-slate-600 text-slate-400 hover:border-slate-400'
          }`}
        >
          Specific Time
        </button>
        <button
          type="button"
          onClick={() => setIsRange(true)}
          className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
            isRange ? 'bg-accent-blue border-accent-blue text-white' : 'bg-surface-elevated border-slate-600 text-slate-400 hover:border-slate-400'
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
            className="w-full bg-surface-elevated border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-accent-blue"
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
          className="w-full bg-surface-elevated border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-accent-blue"
        />
      </div>

      {error && <p className="text-accent-red text-sm">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-2 bg-accent-blue hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg font-medium text-sm transition-colors"
      >
        {submitting ? 'Posting…' : 'Post Scrim'}
      </button>
    </form>
  );
}
