import { AlertTriangle, Inbox, Loader2, X } from 'lucide-react';
import { ReactNode, useEffect } from 'react';
import { PRIORITY_STYLE, STATUS_STYLE, statusLabel } from '../utils/constants';
import type { Priority } from '../types';
import { deadlineInfo, Tone } from '../utils/date';

export const Spinner = ({ className = '' }: { className?: string }) => <Loader2 className={`h-4 w-4 animate-spin ${className}`} aria-label="Loading" />;
export const Skeleton = ({ className = '' }: { className?: string }) => <div className={`animate-pulse rounded-md bg-slate-200 ${className}`} />;

export function PageSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <Skeleton className="h-8 w-56" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}</div>
      <Skeleton className="h-64" />
    </div>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <Inbox className="mb-3 h-8 w-8 text-slate-400" />
      <p className="font-semibold text-slate-800">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-sm text-slate-500">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center rounded-lg border border-red-200 bg-red-50 px-6 py-10 text-center">
      <AlertTriangle className="mb-3 h-8 w-8 text-red-500" />
      <p className="font-semibold text-red-800">{message}</p>
      {onRetry && <button className="btn-secondary mt-4" onClick={onRetry}>Try again</button>}
    </div>
  );
}

export function AsyncView({ loading, error, onRetry, errorTitle, children }: { loading: boolean; error: string | null; onRetry?: () => void; errorTitle?: string; children: ReactNode }) {
  if (loading) return <PageSkeleton />;
  if (error) return <ErrorState message={errorTitle ? `${errorTitle}: ${error}` : error} onRetry={onRetry} />;
  return <>{children}</>;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 p-0 sm:items-center sm:p-4" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.stopPropagation()}
        className={`max-h-[92vh] w-full overflow-y-auto rounded-t-xl bg-white shadow-xl sm:rounded-xl ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'}`}>
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
          <h2 className="font-semibold text-ink">{title}</h2>
          <button className="btn-ghost !p-1" onClick={onClose} aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', busy, onConfirm, onCancel }: { open: boolean; title: string; message: string; confirmLabel?: string; busy?: boolean; onConfirm: () => void; onCancel: () => void }) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p className="text-sm text-slate-600">{message}</p>
      <div className="mt-5 flex justify-end gap-2">
        <button className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button className="btn-danger" onClick={onConfirm} disabled={busy}>{busy && <Spinner />}{confirmLabel}</button>
      </div>
    </Modal>
  );
}

export const Badge = ({ className, children }: { className: string; children: ReactNode }) => (
  <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>{children}</span>
);
export const StatusBadge = ({ status }: { status: string }) => <Badge className={STATUS_STYLE[status]}>{statusLabel(status)}</Badge>;
export const PriorityBadge = ({ priority }: { priority: Priority }) => <Badge className={PRIORITY_STYLE[priority]}>{statusLabel(priority)}</Badge>;

const TONES: Record<Tone, string> = { danger: 'text-red-600', warn: 'text-amber-700', ok: 'text-emerald-600', muted: 'text-slate-500' };
export function DeadlineBadge({ task }: { task: Parameters<typeof deadlineInfo>[0] }) {
  const info = deadlineInfo(task);
  return info ? <span className={`text-xs font-medium ${TONES[info.tone]}`}>{info.label}</span> : null;
}

export function Avatar({ user, size = 28 }: { user?: { name: string; avatar?: string } | null; size?: number }) {
  if (!user) return <span className="text-xs text-slate-400">Unassigned</span>;
  const initials = user.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  return user.avatar ? (
    <img src={user.avatar} alt={user.name} style={{ width: size, height: size }} className="rounded-full object-cover" />
  ) : (
    <span title={user.name} style={{ width: size, height: size }} className="inline-flex shrink-0 items-center justify-center rounded-full bg-steel-light text-xs font-semibold text-steel-dark">{initials}</span>
  );
}

export const StatCard = ({ label, value, hint, accent }: { label: string; value: ReactNode; hint?: string; accent?: boolean }) => (
  <div className={`card ${accent ? 'border-l-4 border-l-brass' : ''}`}>
    <p className="text-sm text-slate-500">{label}</p>
    <p className="mt-1 text-2xl font-bold text-ink">{value}</p>
    {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
  </div>
);

export const FieldError = ({ msg }: { msg?: string }) => (msg ? <p className="field-error" role="alert">{msg}</p> : null);

export function ProgressBar({ value, color = '#2E6A9E' }: { value: number; color?: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
    </div>
  );
}
