import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import TaskFormModal from '../components/TaskFormModal';
import { Avatar, AsyncView, DeadlineBadge, EmptyState, PageHeader, PriorityBadge, StatusBadge } from '../components/ui';
import { useAsync } from '../hooks/useAsync';
import { useMembers } from '../hooks/useMembers';
import { get } from '../services/api';
import type { Paginated, Project, Task } from '../types';
import { PRIORITIES, STATUSES, statusLabel } from '../utils/constants';

const LIMIT = 10;

export default function Tasks() {
  const [params, setParams] = useSearchParams();
  const urlSearch = params.get('search') ?? '';
  const [q, setQ] = useState(urlSearch);
  const [creating, setCreating] = useState(false);
  const members = useMembers();
  const projects = useAsync(async () => (await get<{ projects: Project[] }>('/projects')).projects);

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true });
  };

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
  const filtered = ['search', 'project', 'status', 'priority', 'assignedTo', 'dueBefore'].some((k) => params.get(k));
  const page = Number(params.get('page') ?? 1);

  const select = (key: string, label: string, options: { value: string; label: string }[]) => (
    <select aria-label={label} className="input !w-auto" value={params.get(key) ?? ''} onChange={(e) => set(key, e.target.value)}>
      <option value="">{label}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );

  return (
    <>
      <PageHeader title="Tasks" subtitle="Search, filter and sort every task in your workspace" actions={<button className="btn-primary" onClick={() => setCreating(true)}><Plus className="h-4 w-4" />New task</button>} />
      <div className="card mb-4 flex flex-wrap items-center gap-2 !p-3">
        <input className="input !w-full sm:!w-64" placeholder="Search title, description, tag…" aria-label="Search tasks" value={q} onChange={(e) => setQ(e.target.value)} />
        {select('project', 'All projects', projects.data?.map((p) => ({ value: p._id, label: p.name })) ?? [])}
        {select('status', 'All statuses', STATUSES.map((s) => ({ value: s, label: statusLabel(s) })))}
        {select('priority', 'All priorities', PRIORITIES.map((s) => ({ value: s, label: statusLabel(s) })))}
        {select('assignedTo', 'Any assignee', [{ value: 'me', label: 'Assigned to me' }, ...(members.data?.map((m) => ({ value: m._id, label: m.name })) ?? [])])}
        <label className="flex items-center gap-1 text-sm text-slate-500">Due before
          <input type="date" className="input !w-auto" value={params.get('dueBefore')?.slice(0, 10) ?? ''} onChange={(e) => set('dueBefore', e.target.value)} />
        </label>
        {select('sort', 'Sort: newest', [{ value: 'oldest', label: 'Oldest' }, { value: 'priority', label: 'Priority' }, { value: 'deadline', label: 'Deadline' }])}
        {(filtered || params.get('sort')) && <button className="btn-ghost" onClick={() => { setQ(''); setParams({}, { replace: true }); }}>Clear</button>}
      </div>

      <AsyncView loading={loading} error={error} onRetry={reload} errorTitle="Unable to load tasks">
        {data?.items.length === 0 ? (
          <EmptyState title="No tasks found" hint={filtered ? 'Try changing or clearing your filters.' : 'Create your first task to get started.'} action={!filtered && <button className="btn-primary" onClick={() => setCreating(true)}>New task</button>} />
        ) : (
          <div className="card overflow-x-auto !p-0">
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
            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2.5 text-sm text-slate-500">
              <span>{data?.pagination.total} task{data?.pagination.total === 1 ? '' : 's'}</span>
              <div className="flex items-center gap-2">
                <button className="btn-secondary !py-1" disabled={page <= 1} onClick={() => set('page', String(page - 1))}>Previous</button>
                <span>Page {page} of {data?.pagination.pages}</span>
                <button className="btn-secondary !py-1" disabled={page >= (data?.pagination.pages ?? 1)} onClick={() => set('page', String(page + 1))}>Next</button>
              </div>
            </div>
          </div>
        )}
      </AsyncView>
      {creating && <TaskFormModal onClose={() => setCreating(false)} onSaved={refresh} />}
    </>
  );
}
