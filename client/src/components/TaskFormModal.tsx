import { zodResolver } from '@hookform/resolvers/zod';
import { Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAsync } from '../hooks/useAsync';
import { useMembers } from '../hooks/useMembers';
import { useToast } from '../context/ToastContext';
import { errMsg, get, patch, post } from '../services/api';
import type { Project, Task } from '../types';
import { PRIORITIES, STATUSES, statusLabel } from '../utils/constants';
import { toDateInput } from '../utils/date';
import { FieldError, Modal, Spinner } from './ui';

const schema = z.object({
  title: z.string().trim().min(3, 'Title needs at least 3 characters').max(120, 'Title is too long'),
  description: z.string().max(2000, 'Description is too long'),
  project: z.string().min(1, 'Select a project'),
  assignedTo: z.string(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  dueDate: z.string(),
  tags: z.string(),
  estimatedHours: z.string().refine((v) => v === '' || (!Number.isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 1000), 'Enter hours between 0 and 1000'),
});
type Values = z.infer<typeof schema>;

interface Props { task?: Task; defaultProject?: string; onClose: () => void; onSaved: () => void }

export default function TaskFormModal({ task, defaultProject, onClose, onSaved }: Props) {
  const toast = useToast();
  const projects = useAsync(async () => (await get<{ projects: Project[] }>('/projects')).projects);
  const members = useMembers();
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [subtasks, setSubtasks] = useState<string[]>([]);

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: task?.title ?? '',
      description: task?.description ?? '',
      project: task?.project._id ?? defaultProject ?? '',
      assignedTo: task?.assignedTo?._id ?? '',
      status: task?.status ?? 'TODO',
      priority: task?.priority ?? 'MEDIUM',
      dueDate: toDateInput(task?.dueDate),
      tags: task?.tags.join(', ') ?? '',
      estimatedHours: task?.estimatedHours?.toString() ?? '',
    },
  });

  const submit = handleSubmit(async (v) => {
    const payload = {
      title: v.title,
      description: v.description,
      assignedTo: v.assignedTo || null,
      status: v.status,
      priority: v.priority,
      dueDate: v.dueDate || null,
      tags: v.tags.split(',').map((t) => t.trim()).filter(Boolean),
      estimatedHours: v.estimatedHours === '' ? null : Number(v.estimatedHours),
    };
    try {
      if (task) await patch(`/tasks/${task._id}`, payload);
      else await post('/tasks', { ...payload, project: v.project, subtasks: subtasks.map((title) => ({ title: title.slice(0, 200), done: false })) });
      toast.success(task ? 'Task updated' : 'Task created');
      onSaved();
      onClose();
    } catch (e) {
      toast.error(errMsg(e));
    }
  });

  const askAi = async () => {
    setAiBusy(true);
    try {
      const { suggestion: s } = await post<{ suggestion: { title: string; description: string; subtasks: string[]; priority: Values['priority']; estimatedHours: number; tags: string[] } }>('/ai/task-assistant', { prompt: aiPrompt });
      setSubtasks(s.subtasks);
      setValue('title', s.title.slice(0, 120), { shouldValidate: true });
      setValue('description', s.description.slice(0, 2000));
      setValue('priority', s.priority);
      setValue('estimatedHours', String(s.estimatedHours));
      setValue('tags', s.tags.join(', '));
      toast.success('Suggestion applied. Review it before saving.');
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setAiBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={task ? 'Edit task' : 'New task'} wide>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {!task && (
          <div className="rounded-lg border border-brass/40 bg-brass-light/60 p-3">
            <label className="label flex items-center gap-1.5" htmlFor="ai"><Sparkles className="h-4 w-4 text-brass" />AI Task Assistant <span className="font-normal text-slate-500">(optional)</span></label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input id="ai" className="input" value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="e.g. Build authentication system for the application" />
              <button type="button" className="btn-secondary shrink-0" onClick={askAi} disabled={aiBusy || aiPrompt.trim().length < 5}>{aiBusy && <Spinner />}Generate</button>
            </div>
          </div>
        )}
        {!task && subtasks.length > 0 && (
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="mb-1 text-sm font-medium">Suggested subtasks <span className="font-normal text-slate-400">(added to the task)</span></p>
            <ul className="space-y-1 text-sm text-slate-600">
              {subtasks.map((s, i) => (
                <li key={i} className="flex items-center justify-between gap-2">
                  <span className="truncate">• {s}</span>
                  <button type="button" className="text-xs text-slate-400 hover:text-red-600" onClick={() => setSubtasks((x) => x.filter((_, j) => j !== i))}>Remove</button>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div>
          <label className="label" htmlFor="t-title">Title</label>
          <input id="t-title" className="input" {...register('title')} />
          <FieldError msg={errors.title?.message} />
        </div>
        <div>
          <label className="label" htmlFor="t-desc">Description</label>
          <textarea id="t-desc" rows={4} className="input" {...register('description')} />
          <FieldError msg={errors.description?.message} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="t-project">Project</label>
            <select id="t-project" className="input" disabled={Boolean(task)} {...register('project')}>
              <option value="">Select project…</option>
              {projects.data?.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
            <FieldError msg={errors.project?.message} />
          </div>
          <div>
            <label className="label" htmlFor="t-assignee">Assignee</label>
            <select id="t-assignee" className="input" {...register('assignedTo')}>
              <option value="">Unassigned</option>
              {members.data?.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="t-status">Status</label>
            <select id="t-status" className="input" {...register('status')}>{STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}</select>
          </div>
          <div>
            <label className="label" htmlFor="t-priority">Priority</label>
            <select id="t-priority" className="input" {...register('priority')}>{PRIORITIES.map((p) => <option key={p} value={p}>{statusLabel(p)}</option>)}</select>
          </div>
          <div>
            <label className="label" htmlFor="t-due">Deadline</label>
            <input id="t-due" type="date" className="input" {...register('dueDate')} />
          </div>
          <div>
            <label className="label" htmlFor="t-est">Estimated hours</label>
            <input id="t-est" inputMode="decimal" className="input" {...register('estimatedHours')} />
            <FieldError msg={errors.estimatedHours?.message} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="t-tags">Tags <span className="font-normal text-slate-400">(comma separated)</span></label>
          <input id="t-tags" className="input" placeholder="backend, auth" {...register('tags')} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={isSubmitting}>{isSubmitting && <Spinner />}{task ? 'Save changes' : 'Create task'}</button>
        </div>
      </form>
    </Modal>
  );
}
