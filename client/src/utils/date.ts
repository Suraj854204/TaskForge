const DAY = 86_400_000;

export type Tone = 'danger' | 'warn' | 'ok' | 'muted';

export function formatDuration(ms: number): string {
  const hours = Math.round(ms / 3_600_000);
  if (hours < 1) return 'under an hour';
  if (hours < 48) return `${hours} hour${hours === 1 ? '' : 's'}`;
  const days = Math.round(hours / 24);
  return `${days} days`;
}

/** Smart deadline insight shown on task rows and detail pages. */
export function deadlineInfo(
  t: { status: string; dueDate?: string | null; createdAt: string; completedAt?: string | null },
  now: Date = new Date(),
): { label: string; tone: Tone } | null {
  if (t.status === 'COMPLETED') {
    if (!t.completedAt) return { label: 'Completed', tone: 'ok' };
    const ms = new Date(t.completedAt).getTime() - new Date(t.createdAt).getTime();
    return { label: `Completed in ${formatDuration(Math.max(0, ms))}`, tone: 'ok' };
  }
  if (!t.dueDate) return null;
  const due = new Date(t.dueDate).getTime();
  if (due < now.getTime()) {
    const days = Math.max(1, Math.floor((now.getTime() - due) / DAY));
    return { label: `Overdue by ${days} day${days === 1 ? '' : 's'}`, tone: 'danger' };
  }
  const days = Math.ceil((due - now.getTime()) / DAY);
  if (days <= 1) return { label: 'Due today', tone: 'warn' };
  return { label: `Due in ${days} days`, tone: days <= 3 ? 'warn' : 'muted' };
}

export const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
export const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
export const toDateInput = (d?: string | null) => (d ? new Date(d).toISOString().slice(0, 10) : '');

export function timeAgo(d: string, now: Date = new Date()): string {
  const mins = Math.floor((now.getTime() - new Date(d).getTime()) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days}d ago` : fmtDate(d);
}
