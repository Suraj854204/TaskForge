import { ArrowLeft, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import KanbanBoard from '../components/KanbanBoard';
import ProjectFormModal from '../components/ProjectFormModal';
import TaskFormModal from '../components/TaskFormModal';
import { Avatar, AsyncView, ConfirmDialog, EmptyState, PageHeader, ProgressBar, StatCard, StatusBadge } from '../components/ui';
import { useToast } from '../context/ToastContext';
import { useAsync } from '../hooks/useAsync';
import { useRealtime } from '../hooks/useRealtime';
import { del, errMsg, get, patch } from '../services/api';
import type { Paginated, Project, Task, TaskStatus } from '../types';
import { fmtDate } from '../utils/date';

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const project = useAsync(async () => (await get<{ project: Project }>(`/projects/${id}`)).project, [id]);
  const tasks = useAsync(async () => (await get<Paginated<Task>>('/tasks', { project: id, limit: 200 })).items, [id]);
  useRealtime('tasks:changed', (p) => { if (!p.projectId || p.projectId === id) { tasks.refresh(); project.refresh(); } });
  const [modal, setModal] = useState<'task' | 'edit' | 'delete' | null>(null);
  const [busy, setBusy] = useState(false);

  /** Optimistic move: update the board immediately, persist, roll back on failure. */
  const move = async (taskId: string, status: TaskStatus) => {
    const previous = tasks.data;
    tasks.setData((ts) => ts!.map((t) => (t._id === taskId ? { ...t, status } : t)));
    try {
      await patch(`/tasks/${taskId}`, { status });
      project.refresh();
      tasks.refresh();
    } catch (e) {
      tasks.setData(previous);
      toast.error(errMsg(e));
    }
  };

  const remove = async () => {
    setBusy(true);
    try { await del(`/projects/${id}`); toast.success('Project deleted'); navigate('/projects'); } catch (e) { toast.error(errMsg(e)); setBusy(false); setModal(null); }
  };
  const reloadAll = () => { project.refresh(); tasks.refresh(); };
  const p = project.data;

  return (
    <>
      <Link to="/projects" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-steel"><ArrowLeft className="h-4 w-4" />All projects</Link>
      <AsyncView loading={project.loading} error={project.error} onRetry={project.reload} errorTitle="Unable to load project">
        {p && (
          <>
            <PageHeader
              title={p.name}
              subtitle={p.description}
              actions={<>
                <button className="btn-primary" onClick={() => setModal('task')}><Plus className="h-4 w-4" />Add task</button>
                <button className="btn-secondary" onClick={() => setModal('edit')}><Pencil className="h-4 w-4" />Edit</button>
                <button className="btn-secondary text-red-600" onClick={() => setModal('delete')}><Trash2 className="h-4 w-4" />Delete</button>
              </>}
            />
            <div className="mb-6 grid gap-4 md:grid-cols-3">
              <div className="card md:col-span-2">
                <div className="mb-2 flex items-center justify-between"><StatusBadge status={p.status} /><span className="text-sm font-semibold">{p.progress}% complete</span></div>
                <ProgressBar value={p.progress} color={p.color} />
                <p className="mt-2 text-xs text-slate-500">{p.completedCount} of {p.taskCount} tasks completed · Deadline {fmtDate(p.deadline)}</p>
              </div>
              <div className="card">
                <p className="mb-2 text-sm text-slate-500">Members</p>
                <div className="flex flex-wrap gap-2">{p.members.map((m) => <span key={m._id} className="flex items-center gap-1.5 text-sm"><Avatar user={m} size={24} />{m.name.split(' ')[0]}</span>)}</div>
              </div>
            </div>
            <AsyncView loading={tasks.loading} error={tasks.error} onRetry={tasks.reload} errorTitle="Unable to load tasks">
              {tasks.data?.length === 0 ? (
                <EmptyState title="No tasks found" hint="Add the first task to this project." action={<button className="btn-primary" onClick={() => setModal('task')}>Add task</button>} />
              ) : (
                <KanbanBoard tasks={tasks.data ?? []} onMove={move} />
              )}
            </AsyncView>
            {modal === 'task' && <TaskFormModal defaultProject={p._id} onClose={() => setModal(null)} onSaved={reloadAll} />}
            {modal === 'edit' && <ProjectFormModal project={p} onClose={() => setModal(null)} onSaved={reloadAll} />}
            <ConfirmDialog open={modal === 'delete'} title="Delete project?" message="This permanently deletes the project and all of its tasks, comments and activity." busy={busy} onConfirm={remove} onCancel={() => setModal(null)} />
          </>
        )}
      </AsyncView>
    </>
  );
}
