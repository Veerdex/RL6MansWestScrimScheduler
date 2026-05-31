'use client';

import { useEffect, useState } from 'react';

export function VisitCounter() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (!sessionStorage.getItem('visit_counted')) {
      fetch('/api/visits', { method: 'POST' });
      sessionStorage.setItem('visit_counted', '1');
    }
    fetch('/api/visits')
      .then((r) => r.json())
      .then((d) => setCount(d.count));
  }, []);

  if (count === null) return null;

  return (
    <span className="flex items-center gap-1.5 text-xs text-slate-500">
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
      {count} {count === 1 ? 'visitor' : 'visitors'} today
    </span>
  );
}
