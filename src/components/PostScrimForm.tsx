'use client';

import { useState } from 'react';
import type { Team } from '@/lib/types';

interface Props {
  team: Team;
  onPosted: () => void;
}

export function PostScrimForm({ team, onPosted }: Props) {
  const [scheduledAt, setScheduledAt] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduledAt) {
      setError('Pick a date and time.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/scrims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ home_team: team, scheduled_at: scheduledAt, note }),
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
    <form
      onSubmit={handleSubmit}
      className="bg-surface-card border border-slate-700 rounded-xl p-5 space-y-4"
    >
      <h3 className="text-white font-semibold">
        Post a Scrim as <span className="text-accent-blue">{team}</span>
      </h3>

      <div className="space-y-1">
        <label className="text-sm text-slate-400">Date &amp; Time</label>
        <input
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          className="w-full bg-surface-elevated border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-accent-blue"
        />
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
