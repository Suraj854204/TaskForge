import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import TaskFormModal from '../components/TaskFormModal';
import { Avatar, AsyncView, ConfirmDialog, DeadlineBadge, EmptyState, PriorityBadge, ProgressBar, Spinner, StatusBadge } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useAsync } from '../hooks/useAsync';
import { useMembers } from '../hooks/useMembers';
import { useRealtime } from '../hooks/useRealtime';
import { del, errMsg, get, patch, post } from '../services/api';
import type { Activity, Comment, Priority, Task, TaskStatus } from '../types';
import { PRIORITIES, STATUSES, statusLabel } from '../utils/constants';
import { fmtDate, fmtDateTime } from '../utils/date';

export default function TaskDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const members = useMembers();
  const detail = useAsync(() => get<{ task: Task; activities: Activity[] }>(`/tasks/${id}`), [id]);
  const comments = useAsync(async () => (await get<{ comments: Comment[] }>(`/tasks/${id}/comments`)).comments, [id]);
  useRealtime('comments:changed', (p) => { if (p.taskId === id) comments.refresh(); });
  useRealtime('tasks:changed', (p) => { if (p.taskId === id) detail.refresh(); });
  const [modal, setModal] = useState<'edit' | 'delete' | null>(null);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const [editing, setEditing] = useState<{ id: string; content: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const task = detail.data?.task;
  const canEdit = task && (user?.role === 'ADMIN' || task.createdBy._id === user?._id || task.assignedTo?._id === user?._id);
  const canDelete = task && (user?.role === 'ADMIN' || task.createdBy._id === user?._id);
  const [newSub, setNewSub] = useState('');
  const subs = task?.subtasks ?? [];
  const subsDone = subs.filter((s) => s.done).length;
  const saveSubs = (next: { title: string; done: boolean }[]) => quickUpdate({ subtasks: next.map(({ title, done }) => ({ title, done })) });

  const quickUpdate = async (body: object) => {
    try { await patch(`/tasks/${id}`, body); detail.refresh(); } catch (e) { toast.error(errMsg(e)); }
  };
  const addComment = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setPosting(true);
    try { await post(`/tasks/${id}/comments`, { content: text }); setText(''); comments.refresh(); } catch (err) { toast.error(errMsg(err)); } finally { setPosting(false); }
  };
  const saveComment = async () => {
    if (!editing) return;
    try { await patch(`/comments/${editing.id}`, { content: editing.content }); setEditing(null); comments.refresh(); } catch (e) { toast.error(errMsg(e)); }
  };
  const removeComment = async (cid: string) => {
    try { await del(`/comments/${cid}`); comments.refresh(); } catch (e) { toast.error(errMsg(e)); }
  };
  const remove = async () => {
    setBusy(true);
    try { await del(`/tasks/${id}`); toast.success('Task deleted'); navigate('/tasks'); } catch (e) { toast.error(errMsg(e)); setBusy(false); setModal(null); }
  };

  return (
    <>
      <Link to={task ? `/projects/${task.project._id}` : '/tasks'} className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-steel"><ArrowLeft className="h-4 w-4" />Back</Link>
      <AsyncView loading={detail.loading} error={detail.error} onRetry={detail.reload} errorTitle="Unable to load task">
        {task && (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <div className="card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h1 className="text-xl font-bold text-ink">{task.title}</h1>
                  <div className="flex gap-2">
                    {canEdit && <button className="btn-secondary" onClick={() => setModal('edit')}><Pencil className="h-4 w-4" />Edit</button>}
                    {canDelete && <button className="btn-secondary text-red-600" onClick={() => setModal('delete')}><Trash2 className="h-4 w-4" />Delete</button>}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2"><StatusBadge status={task.status} /><PriorityBadge priority={task.priority} /><DeadlineBadge task={task} /></div>
                <p className="mt-4 whitespace-pre-wrap text-sm text-slate-700">{task.description || 'No description provided.'}</p>
                {task.tags.length > 0 && <div className="mt-4 flex flex-wrap gap-1.5">{task.tags.map((t) => <span key={t} className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">#{t}</span>)}</div>}
              </div>

              <div className="card">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-semibold text-ink">Checklist</h2>
                  {subs.length > 0 && <span className="text-xs text-slate-500">{subsDone}/{subs.length} done</span>}
                </div>
                {subs.length > 0 && <div className="mb-3"><ProgressBar value={Math.round((subsDone / subs.length) * 100)} /></div>}
                <ul className="space-y-1">
                  {subs.map((s, i) => (
                    <li key={i} className="group flex items-center gap-2 rounded-md px-1 py-1 hover:bg-slate-50">
                      <input type="checkbox" className="h-4 w-4 accent-[#2E6A9E]" checked={s.done} disabled={!canEdit} onChange={() => saveSubs(subs.map((x, j) => (j === i ? { ...x, done: !x.done } : x)))} aria-label={s.title} />
                      <span className={`flex-1 text-sm ${s.done ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{s.title}</span>
                      {canEdit && <button className="text-xs text-slate-400 opacity-100 hover:text-red-600 sm:opacity-0 sm:group-hover:opacity-100" onClick={() => saveSubs(subs.filter((_, j) => j !== i))} aria-label={`Remove ${s.title}`}>Remove</button>}
                    </li>
                  ))}
                </ul>
                {subs.length === 0 && <p className="text-sm text-slate-500">Break this task into smaller steps.</p>}
                {canEdit && (
                  <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (!newSub.trim() || subs.length >= 30) return; saveSubs([...subs, { title: newSub.trim(), done: false }]); setNewSub(''); }}>
                    <input className="input" placeholder="Add a step…" maxLength={200} value={newSub} onChange={(e) => setNewSub(e.target.value)} aria-label="New checklist item" />
                    <button className="btn-secondary shrink-0" disabled={!newSub.trim()}>Add</button>
                  </form>
                )}
              </div>

              <div className="card">
                <h2 className="mb-3 font-semibold text-ink">Comments</h2>
                <AsyncView loading={comments.loading} error={comments.error} onRetry={comments.reload}>
                  {comments.data?.length === 0 && <p className="mb-3 text-sm text-slate-500">No comments yet. Start the conversation.</p>}
                  <ul className="mb-4 space-y-4">
                    {comments.data?.map((c) => (
                      <li key={c._id} className="flex gap-3">
                        <Avatar user={c.author} size={32} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm"><span className="font-semibold">{c.author.name}</span> <span className="text-xs text-slate-400">{fmtDateTime(c.createdAt)}{c.updatedAt !== c.createdAt && ' (edited)'}</span></p>
                          {editing?.id === c._id ? (
                            <div className="mt-1 space-y-2">
                              <textarea className="input" rows={2} value={editing.content} onChange={(e) => setEditing({ id: c._id, content: e.target.value })} />
                              <div className="flex gap-2"><button className="btn-primary !py-1" onClick={saveComment}>Save</button><button className="btn-secondary !py-1" onClick={() => setEditing(null)}>Cancel</button></div>
                            </div>
                          ) : (
                            <p className="whitespace-pre-wrap text-sm text-slate-700">{c.content}</p>
                          )}
                          {editing?.id !== c._id && (c.author._id === user?._id || user?.role === 'ADMIN') && (
                            <div className="mt-1 flex gap-3 text-xs">
                              {c.author._id === user?._id && <button className="text-slate-500 hover:text-steel" onClick={() => setEditing({ id: c._id, content: c.content })}>Edit</button>}
                              <button className="text-slate-500 hover:text-red-600" onClick={() => removeComment(c._id)}>Delete</button>
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </AsyncView>
                <form onSubmit={addComment} className="flex flex-col gap-2">
                  <label className="sr-only" htmlFor="comment">Add a comment</label>
                  <textarea id="comment" rows={2} className="input" placeholder="Write a comment…" value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} />
                  <button className="btn-primary self-end" disabled={posting || !text.trim()}>{posting && <Spinner />}Add comment</button>
                </form>
              </div>
            </div>

            <div className="space-y-6">
              <div className="card space-y-3 text-sm">
                <div><label className="label" htmlFor="s-status">Status</label>
                  <select id="s-status" className="input" disabled={!canEdit} value={task.status} onChange={(e) => quickUpdate({ status: e.target.value as TaskStatus })}>{STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}</select></div>
                <div><label className="label" htmlFor="s-priority">Priority</label>
                  <select id="s-priority" className="input" disabled={!canEdit} value={task.priority} onChange={(e) => quickUpdate({ priority: e.target.value as Priority })}>{PRIORITIES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}</select></div>
                <div><label className="label" htmlFor="s-assignee">Assignee</label>
                  <select id="s-assignee" className="input" disabled={!canEdit} value={task.assignedTo?._id ?? ''} onChange={(e) => quickUpdate({ assignedTo: e.target.value || null })}>
                    <option value="">Unassigned</option>{members.data?.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}</select></div>
                <dl className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-slate-600">
                  <dt className="text-slate-400">Project</dt><dd><Link className="text-steel hover:underline" to={`/projects/${task.project._id}`}>{task.project.name}</Link></dd>
                  <dt className="text-slate-400">Created by</dt><dd>{task.createdBy.name}</dd>
                  <dt className="text-slate-400">Created</dt><dd>{fmtDate(task.createdAt)}</dd>
                  <dt className="text-slate-400">Deadline</dt><dd>{fmtDate(task.dueDate)}</dd>
                  <dt className="text-slate-400">Estimate</dt><dd>{task.estimatedHours != null ? `${task.estimatedHours} h` : '—'}</dd>
                </dl>
              </div>
              <div className="card">
                <h2 className="mb-3 font-semibold text-ink">Activity</h2>
                {detail.data?.activities.length === 0 ? <EmptyState title="No activity yet" /> : (
                  <ol className="relative space-y-4 border-l border-slate-200 pl-4">
                    {detail.data?.activities.map((a) => (
                      <li key={a._id} className="relative">
                        <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-steel" />
                        <p className="text-sm text-slate-700">{a.message}</p>
                        <p className="text-xs text-slate-400">{fmtDateTime(a.createdAt)}</p>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
            {modal === 'edit' && <TaskFormModal task={task} onClose={() => setModal(null)} onSaved={detail.refresh} />}
            <ConfirmDialog open={modal === 'delete'} title="Delete task?" message="This permanently deletes the task, its comments and its activity." busy={busy} onConfirm={remove} onCancel={() => setModal(null)} />
          </div>
        )}
      </AsyncView>
    </>
  );
}
