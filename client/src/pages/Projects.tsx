import { FolderKanban, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import ProjectFormModal from '../components/ProjectFormModal';
import { Avatar, AsyncView, EmptyState, PageHeader, ProgressBar, StatusBadge } from '../components/ui';
import { useAsync } from '../hooks/useAsync';
import { get } from '../services/api';
import type { Project } from '../types';
import { fmtDate } from '../utils/date';

export default function Projects() {
  const { data, loading, error, reload } = useAsync(async () => (await get<{ projects: Project[] }>('/projects')).projects);
  const [creating, setCreating] = useState(false);
  const newBtn = <button className="btn-primary" onClick={() => setCreating(true)}><Plus className="h-4 w-4" />New project</button>;

  return (
    <>
      <PageHeader title="Projects" subtitle="Everything your team is working on" actions={newBtn} />
      <AsyncView loading={loading} error={error} onRetry={reload} errorTitle="Unable to load projects">
        {data?.length === 0 ? (
          <EmptyState title="No projects yet" hint="Create a project to start organizing tasks." action={newBtn} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data?.map((p) => (
              <Link key={p._id} to={`/projects/${p._id}`} className="card block border-t-4 transition hover:shadow-md" style={{ borderTopColor: p.color }}>
                <div className="flex items-start justify-between gap-2">
                  <h2 className="flex items-center gap-2 font-semibold text-ink"><FolderKanban className="h-4 w-4" style={{ color: p.color }} />{p.name}</h2>
                  <StatusBadge status={p.status} />
                </div>
                <p className="mt-1 line-clamp-2 min-h-10 text-sm text-slate-500">{p.description || 'No description'}</p>
                <div className="mt-4">
                  <div className="mb-1 flex justify-between text-xs text-slate-500"><span>{p.completedCount}/{p.taskCount} tasks done</span><span>{p.progress}%</span></div>
                  <ProgressBar value={p.progress} color={p.color} />
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex -space-x-1.5">{p.members.slice(0, 4).map((m) => <Avatar key={m._id} user={m} size={24} />)}</div>
                  <span>Due {fmtDate(p.deadline)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </AsyncView>
      {creating && <ProjectFormModal onClose={() => setCreating(false)} onSaved={reload} />}
    </>
  );
}
