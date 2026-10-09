import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useToast } from '../context/ToastContext';
import { useMembers } from '../hooks/useMembers';
import { errMsg, patch, post } from '../services/api';
import type { Project } from '../types';
import { PROJECT_STATUSES, statusLabel } from '../utils/constants';
import { toDateInput } from '../utils/date';
import { FieldError, Modal, Spinner } from './ui';

const schema = z.object({
  name: z.string().trim().min(2, 'Name needs at least 2 characters').max(80),
  description: z.string().max(1000),
  status: z.enum(['PLANNING', 'ACTIVE', 'COMPLETED', 'ARCHIVED']),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  deadline: z.string(),
});
type Values = z.infer<typeof schema>;

export default function ProjectFormModal({ project, onClose, onSaved }: { project?: Project; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const members = useMembers();
  const [selected, setSelected] = useState<string[]>(project?.members.map((m) => m._id) ?? []);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: project?.name ?? '', description: project?.description ?? '', status: project?.status ?? 'PLANNING', color: project?.color ?? '#2E6A9E', deadline: toDateInput(project?.deadline) },
  });

  const submit = handleSubmit(async (v) => {
    const payload = { ...v, deadline: v.deadline || null, members: selected };
    try {
      if (project) await patch(`/projects/${project._id}`, payload);
      else await post('/projects', payload);
      toast.success(project ? 'Project updated' : 'Project created');
      onSaved();
      onClose();
    } catch (e) {
      toast.error(errMsg(e));
    }
  });
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <Modal open onClose={onClose} title={project ? 'Edit project' : 'New project'} wide>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div>
          <label className="label" htmlFor="p-name">Name</label>
          <input id="p-name" className="input" {...register('name')} />
          <FieldError msg={errors.name?.message} />
        </div>
        <div>
          <label className="label" htmlFor="p-desc">Description</label>
          <textarea id="p-desc" rows={3} className="input" {...register('description')} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="p-status">Status</label>
            <select id="p-status" className="input" {...register('status')}>{PROJECT_STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}</select>
          </div>
          <div>
            <label className="label" htmlFor="p-deadline">Deadline</label>
            <input id="p-deadline" type="date" className="input" {...register('deadline')} />
          </div>
          <div>
            <label className="label" htmlFor="p-color">Color</label>
            <input id="p-color" type="color" className="h-9 w-full cursor-pointer rounded-md border border-slate-300" {...register('color')} />
          </div>
        </div>
        <fieldset>
          <legend className="label">Members</legend>
          <div className="grid gap-1 sm:grid-cols-2">
            {members.data?.map((m) => (
              <label key={m._id} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-50">
                <input type="checkbox" checked={selected.includes(m._id)} onChange={() => toggle(m._id)} />{m.name}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={isSubmitting}>{isSubmitting && <Spinner />}{project ? 'Save changes' : 'Create project'}</button>
        </div>
      </form>
    </Modal>
  );
}
