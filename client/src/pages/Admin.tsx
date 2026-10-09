import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Avatar, AsyncView, ConfirmDialog, EmptyState, FieldError, Modal, PageHeader, Spinner, StatCard } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useAsync } from '../hooks/useAsync';
import { del, errMsg, get, patch, post } from '../services/api';
import type { Role, UserLite } from '../types';

const schema = z.object({
  name: z.string().trim().min(2, 'Name needs at least 2 characters').max(60),
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(8, 'At least 8 characters').regex(/[A-Za-z]/, 'Include a letter').regex(/\d/, 'Include a number'),
  role: z.enum(['ADMIN', 'MEMBER']),
});

export default function Admin() {
  const { user } = useAuth();
  const toast = useToast();
  const wsId = user!.workspace!._id;
  const members = useAsync(() => get<{ members: UserLite[]; ownerId: string }>(`/workspaces/${wsId}/members`), [wsId]);
  const stats = useAsync(() => get<{ stats: Record<string, number>; charts: { projectProgress: { name: string; progress: number; completed: number; total: number }[] } }>('/analytics/dashboard'));
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<UserLite | null>(null);
  const [busy, setBusy] = useState(false);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { role: 'MEMBER' } });

  const add = handleSubmit(async (v) => {
    try { await post(`/workspaces/${wsId}/members`, v); toast.success('Member added'); reset(); setAdding(false); members.refresh(); } catch (e) { toast.error(errMsg(e)); }
  });
  const changeRole = async (id: string, role: Role) => {
    try { await patch(`/workspaces/${wsId}/members/${id}`, { role }); toast.success('Role updated'); members.refresh(); } catch (e) { toast.error(errMsg(e)); members.refresh(); }
  };
  const remove = async () => {
    if (!removing) return;
    setBusy(true);
    try { await del(`/workspaces/${wsId}/members/${removing._id}`); toast.success('Member removed'); members.refresh(); stats.refresh(); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); setRemoving(null); }
  };
  const s = stats.data?.stats;

  return (
    <>
      <PageHeader title="Admin" subtitle="Manage your workspace members and review team statistics"
        actions={<button className="btn-primary" onClick={() => setAdding(true)}><Plus className="h-4 w-4" />Add member</button>} />

      <AsyncView loading={stats.loading} error={stats.error} onRetry={stats.reload} errorTitle="Unable to load statistics">
        {s && (
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Projects" value={s.totalProjects} />
            <StatCard label="Tasks" value={s.totalTasks} hint={`${s.completedTasks} completed`} />
            <StatCard label="Overdue tasks" value={s.overdueTasks} accent={s.overdueTasks > 0} />
            <StatCard label="Completion" value={`${s.completionPercentage}%`} />
          </div>
        )}
      </AsyncView>

      <AsyncView loading={members.loading} error={members.error} onRetry={members.reload} errorTitle="Unable to load members">
        {members.data?.members.length === 0 ? <EmptyState title="No members yet" /> : (
          <div className="card overflow-x-auto !p-0">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500"><tr><th className="px-4 py-2.5 font-medium">Member</th><th className="px-4 py-2.5 font-medium">Role</th><th className="px-4 py-2.5" /></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {members.data?.members.map((m) => {
                  const isOwner = m._id === members.data?.ownerId;
                  return (
                    <tr key={m._id}>
                      <td className="px-4 py-3"><div className="flex items-center gap-3"><Avatar user={m} size={32} /><div><p className="font-medium text-ink">{m.name}{isOwner && <span className="ml-2 rounded bg-brass-light px-1.5 py-0.5 text-[11px] font-semibold text-amber-800">Owner</span>}</p><p className="text-xs text-slate-500">{m.email}</p></div></div></td>
                      <td className="px-4 py-3">
                        <select aria-label={`Role for ${m.name}`} className="input !w-auto" value={m.role} disabled={isOwner} onChange={(e) => changeRole(m._id, e.target.value as Role)}>
                          <option value="ADMIN">Admin</option><option value="MEMBER">Member</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right">{!isOwner && <button className="btn-ghost text-red-600" onClick={() => setRemoving(m)} aria-label={`Remove ${m.name}`}><Trash2 className="h-4 w-4" /></button>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AsyncView>

      {s && stats.data && stats.data.charts.projectProgress.length > 0 && (
        <div className="card mt-6">
          <h2 className="mb-3 font-semibold text-ink">Project statistics</h2>
          <ul className="divide-y divide-slate-100 text-sm">
            {stats.data.charts.projectProgress.map((p) => (
              <li key={p.name} className="flex items-center justify-between py-2"><span>{p.name}</span><span className="text-slate-500">{p.completed}/{p.total} tasks · {p.progress}%</span></li>
            ))}
          </ul>
        </div>
      )}

      <Modal open={adding} onClose={() => setAdding(false)} title="Add member">
        <form onSubmit={add} className="space-y-4" noValidate>
          <div><label className="label" htmlFor="m-name">Full name</label><input id="m-name" className="input" {...register('name')} /><FieldError msg={errors.name?.message} /></div>
          <div><label className="label" htmlFor="m-email">Email</label><input id="m-email" type="email" className="input" {...register('email')} /><FieldError msg={errors.email?.message} /></div>
          <div><label className="label" htmlFor="m-pass">Temporary password</label><input id="m-pass" type="password" autoComplete="new-password" className="input" {...register('password')} /><FieldError msg={errors.password?.message} /></div>
          <div><label className="label" htmlFor="m-role">Role</label><select id="m-role" className="input" {...register('role')}><option value="MEMBER">Member</option><option value="ADMIN">Admin</option></select></div>
          <div className="flex justify-end gap-2"><button type="button" className="btn-secondary" onClick={() => setAdding(false)}>Cancel</button><button className="btn-primary" disabled={isSubmitting}>{isSubmitting && <Spinner />}Add member</button></div>
        </form>
      </Modal>
      <ConfirmDialog open={Boolean(removing)} title="Remove member?" message={`${removing?.name} will lose access to this workspace and their tasks will become unassigned.`} confirmLabel="Remove" busy={busy} onConfirm={remove} onCancel={() => setRemoving(null)} />
    </>
  );
}
