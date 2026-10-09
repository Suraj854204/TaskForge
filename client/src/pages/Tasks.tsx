import { Download, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import TaskFormModal from '../components/TaskFormModal';
import { Avatar, AsyncView, DeadlineBadge, EmptyState, PageHeader, PriorityBadge, StatusBadge } from '../components/ui';
import { useToast } from '../context/ToastContext';
import { useAsync } from '../hooks/useAsync';
import { useMembers } from '../hooks/useMembers';
import { useRealtime } from '../hooks/useRealtime';
import { errMsg, get } from '../services/api';
import type { Paginated, Project, Task } from '../types';
import { PRIORITIES, STATUSES, statusLabel } from '../utils/constants';
import { fmtDate } from '../utils/date';

const LIMIT = 10;
const FILTER_KEYS = ['search', 'project', 'status', 'priority', 'assignedTo', 'dueBefore', 'overdue', 'unassigned'];

const csvCell = (v: unknown) => {
  let s = String(v ?? '');
  if (/^[=+\-@]/.test(s)) s = `'${s}`; // neutralise spreadsheet formula injection
  return `"${s.replace(/"/g, '""')}"`;
};

export default function Tasks() {
  const [params, setParams] = useSearchParams();
  const toast = useToast();
  const urlSearch = params.get('search') ?? '';
  const [q, setQ] = useState(urlSearch);
  const [creating, setCreating] = useState(params.get('new') === '1');
  const members = useMembers();
  const projects = useAsync(async () => (await get<{ projects: Project[] }>('/projects')).projects);

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true });
  };

  useEffect(() => {
    if (params.get('new') === '1') {
      setCreating(true);
      const next = new URLSearchParams(params);
      next.delete('new');
      setParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.get('new')]);
  useEffect(() => setQ(urlSearch), [urlSearch]);
  useEffect(() => {
    if (q === urlSearch) return;
    const t = setTimeout(() => set('search', q), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const query = params.toString();
  const { data, loading, error, reload, refresh } = useAsync(
    () => get<Paginated<Task>>('/tasks', { ...Object.fromEntries(params), limit: LIMIT }),
    [query],
  );
  useRealtime('tasks:changed', refresh);
  const filtered = FILTER_KEYS.some((k) => params.get(k));
  const page = Number(params.get('page') ?? 1);

  const exportCsv = async () => {
    try {
      const all = await get<Paginated<Task>>('/tasks', { ...Object.fromEntries(params), limit: 200, page: 1 });
      const header = ['Title', 'Project', 'Status', 'Priority', 'Assignee', 'Due date', 'Tags'];
      const rows = all.items.map((t) => [t.title, t.project.name, t.status, t.priority, t.assignedTo?.name ?? '', t.dueDate ? t.dueDate.slice(0, 10) : '', t.tags.join(' ')]);
      const csv = [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      a.download = `taskforge-tasks-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success(`Exported ${all.items.length} task${all.items.length === 1 ? '' : 's'}`);
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const chip = (label: string, key: string, value: string) => {
    const active = params.get(key) === value;
    return <button key={label} className={`chip ${active ? 'chip-active' : ''}`} aria-pressed={active} onClick={() => set(key, active ? '' : value)}>{label}</button>;
  };
  const select = (key: string, label: string, options: { value: string; label: string }[]) => (
    <select aria-label={label} className="input !w-auto min-w-0 flex-1 sm:flex-none" value={params.get(key) ?? ''} onChange={(e) => set(key, e.target.value)}>
      <option value="">{label}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );

  return (
    <>
      <PageHeader title="Tasks" subtitle="Search, filter and sort every task in your workspace"
        actions={<>
          <button className="btn-secondary" onClick={exportCsv}><Download className="h-4 w-4" /><span className="hidden sm:inline">Export CSV</span></button>
          <button className="btn-primary" onClick={() => setCreating(true)}><Plus className="h-4 w-4" />New task</button>
        </>} />

      <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" role="group" aria-label="Quick filters">
        {chip('Assigned to me', 'assignedTo', 'me')}
        {chip('Overdue', 'overdue', 'true')}
        {chip('Unassigned', 'unassigned', 'true')}
        {chip('Urgent', 'priority', 'URGENT')}
        {chip('In review', 'status', 'IN_REVIEW')}
      </div>

      <div className="card mb-4 flex flex-wrap items-center gap-2 !p-3">
        <input className="input !w-full sm:!w-64" placeholder="Search title, description, tag…" aria-label="Search tasks" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
          {select('project', 'All projects', projects.data?.map((p) => ({ value: p._id, label: p.name })) ?? [])}
          {select('status', 'All statuses', STATUSES.map((s) => ({ value: s, label: statusLabel(s) })))}
          {select('priority', 'All priorities', PRIORITIES.map((s) => ({ value: s, label: statusLabel(s) })))}
          {select('assignedTo', 'Any assignee', [{ value: 'me', label: 'Assigned to me' }, ...(members.data?.map((m) => ({ value: m._id, label: m.name })) ?? [])])}
          {select('sort', 'Sort: newest', [{ value: 'oldest', label: 'Oldest' }, { value: 'priority', label: 'Priority' }, { value: 'deadline', label: 'Deadline' }])}
          <label className="col-span-2 flex items-center gap-2 text-sm text-slate-500 sm:col-span-1">Due before
            <input type="date" className="input !w-auto flex-1" value={params.get('dueBefore')?.slice(0, 10) ?? ''} onChange={(e) => set('dueBefore', e.target.value)} />
          </label>
        </div>
        {(filtered || params.get('sort')) && <button className="btn-ghost" onClick={() => { setQ(''); setParams({}, { replace: true }); }}>Clear all</button>}
      </div>

      <AsyncView loading={loading} error={error} onRetry={reload} errorTitle="Unable to load tasks">
        {data?.items.length === 0 ? (
          <EmptyState title="No tasks found" hint={filtered ? 'Try changing or clearing your filters.' : 'Create your first task to get started.'} action={!filtered && <button className="btn-primary" onClick={() => setCreating(true)}>New task</button>} />
        ) : (
          <>
            {/* Mobile: card list */}
            <ul className="space-y-3 md:hidden">
              {data?.items.map((t) => (
                <li key={t._id} className="card !p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <Link to={`/tasks/${t._id}`} className="font-medium text-ink hover:text-steel">{t.title}</Link>
                    <Avatar user={t.assignedTo} size={26} />
                  </div>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500"><span className="h-2 w-2 rounded-full" style={{ background: t.project.color }} />{t.project.name}{t.dueDate && <> · {fmtDate(t.dueDate)}</>}</p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2"><StatusBadge status={t.status} /><PriorityBadge priority={t.priority} /><DeadlineBadge task={t} /></div>
                </li>
              ))}
            </ul>
            {/* Tablet/desktop: table */}
            <div className="card hidden overflow-x-auto !p-0 md:block">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                  <tr><th className="px-4 py-2.5 font-medium">Task</th><th className="px-4 py-2.5 font-medium">Project</th><th className="px-4 py-2.5 font-medium">Assignee</th><th className="px-4 py-2.5 font-medium">Priority</th><th className="px-4 py-2.5 font-medium">Status</th><th className="px-4 py-2.5 font-medium">Deadline</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data?.items.map((t) => (
                    <tr key={t._id} className="hover:bg-slate-50">
                      <td className="px-4 py-3"><Link to={`/tasks/${t._id}`} className="font-medium text-ink hover:text-steel">{t.title}</Link>{t.tags.length > 0 && <p className="text-xs text-slate-400">#{t.tags.join(' #')}</p>}</td>
                      <td className="px-4 py-3"><span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: t.project.color }} />{t.project.name}</span></td>
                      <td className="px-4 py-3"><Avatar user={t.assignedTo} size={24} /></td>
                      <td className="px-4 py-3"><PriorityBadge priority={t.priority} /></td>
                      <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                      <td className="px-4 py-3"><DeadlineBadge task={t} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
              <span>{data?.pagination.total} task{data?.pagination.total === 1 ? '' : 's'}</span>
              <div className="flex items-center gap-2">
                <button className="btn-secondary !py-1" disabled={page <= 1} onClick={() => set('page', String(page - 1))}>Previous</button>
                <span>Page {page} of {data?.pagination.pages}</span>
                <button className="btn-secondary !py-1" disabled={page >= (data?.pagination.pages ?? 1)} onClick={() => set('page', String(page + 1))}>Next</button>
              </div>
            </div>
          </>
        )}
      </AsyncView>
      {creating && <TaskFormModal onClose={() => setCreating(false)} onSaved={refresh} />}
    </>
  );
}
