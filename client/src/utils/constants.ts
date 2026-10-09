import type { Priority, ProjectStatus, TaskStatus } from '../types';

export const STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED'];
export const PRIORITIES: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
export const PROJECT_STATUSES: ProjectStatus[] = ['PLANNING', 'ACTIVE', 'COMPLETED', 'ARCHIVED'];

export const statusLabel = (s: string) => s.replace('_', ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase()).replace(/ \w/, (c) => c.toUpperCase());

export const STATUS_STYLE: Record<string, string> = {
  TODO: 'bg-slate-100 text-slate-700',
  IN_PROGRESS: 'bg-steel-light text-steel-dark',
  IN_REVIEW: 'bg-brass-light text-amber-800',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  PLANNING: 'bg-slate-100 text-slate-700',
  ACTIVE: 'bg-steel-light text-steel-dark',
  ARCHIVED: 'bg-slate-200 text-slate-500',
};
export const PRIORITY_STYLE: Record<Priority, string> = {
  LOW: 'bg-slate-100 text-slate-600',
  MEDIUM: 'bg-sky-100 text-sky-700',
  HIGH: 'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700',
};
export const CHART_COLORS = ['#94A3B8', '#2E6A9E', '#C98A2B', '#16A34A'];
export const PRIORITY_COLORS = ['#94A3B8', '#38BDF8', '#F97316', '#DC2626'];
