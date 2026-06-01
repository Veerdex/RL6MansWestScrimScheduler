export function getDayLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);

  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (dateOnly.getTime() === today.getTime()) return 'Today';
  if (dateOnly.getTime() === tomorrow.getTime()) return 'Tomorrow';
  if (dateOnly < nextWeek) return date.toLocaleDateString(undefined, { weekday: 'long' });
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatTimeRange(scheduledAt: string, endTime: string | null): string {
  if (!endTime) return formatTime(scheduledAt);
  return `${formatTime(scheduledAt)} – ${formatTime(endTime)}`;
}

export function groupByDay<T extends { scheduled_at: string }>(
  items: T[]
): { key: string; label: string; items: T[] }[] {
  const groups = new Map<string, { key: string; label: string; items: T[] }>();

  for (const item of items) {
    const d = new Date(item.scheduled_at);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!groups.has(key)) {
      groups.set(key, { key, label: getDayLabel(item.scheduled_at), items: [] });
    }
    groups.get(key)!.items.push(item);
  }

  return Array.from(groups.values());
}
