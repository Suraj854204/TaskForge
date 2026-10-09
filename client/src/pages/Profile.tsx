import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { Avatar, AsyncView, DeadlineBadge, EmptyState, FieldError, PageHeader, PriorityBadge, Spinner, StatCard, StatusBadge } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useAsync } from '../hooks/useAsync';
import { errMsg, get, patch } from '../services/api';
import type { Paginated, Task, User } from '../types';

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Name needs at least 2 characters').max(60),
  avatar: z.union([z.literal(''), z.string().trim().url('Enter a valid image URL')]),
});
const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password'),
  newPassword: z.string().min(8, 'At least 8 characters').regex(/[A-Za-z]/, 'Include a letter').regex(/\d/, 'Include a number'),
});

export default function Profile() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const tasks = useAsync(async () => (await get<Paginated<Task>>('/tasks', { assignedTo: 'me', limit: 50, sort: 'deadline' })).items);

  const profile = useForm<z.infer<typeof profileSchema>>({ resolver: zodResolver(profileSchema), defaultValues: { name: user?.name ?? '', avatar: user?.avatar ?? '' } });
  const password = useForm<z.infer<typeof passwordSchema>>({ resolver: zodResolver(passwordSchema) });

  const saveProfile = profile.handleSubmit(async (v) => {
    try { setUser((await patch<{ user: User }>('/users/me', v)).user); toast.success('Profile updated'); } catch (e) { toast.error(errMsg(e)); }
  });
  const savePassword = password.handleSubmit(async (v) => {
    try { await patch('/users/me/password', v); toast.success('Password changed'); password.reset(); } catch (e) { toast.error(errMsg(e)); }
  });

  const open = tasks.data?.filter((t) => t.status !== 'COMPLETED') ?? [];
  const done = tasks.data?.filter((t) => t.status === 'COMPLETED') ?? [];

  return (
    <>
      <PageHeader title="Profile" subtitle={`${user?.email} · ${user?.role === 'ADMIN' ? 'Admin' : 'Member'} of ${user?.workspace?.name}`} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <form onSubmit={saveProfile} className="card space-y-4" noValidate>
            <div className="flex items-center gap-3"><Avatar user={user} size={48} /><h2 className="font-semibold text-ink">Your details</h2></div>
            <div><label className="label" htmlFor="pf-name">Name</label><input id="pf-name" className="input" {...profile.register('name')} /><FieldError msg={profile.formState.errors.name?.message} /></div>
            <div><label className="label" htmlFor="pf-avatar">Avatar image URL</label><input id="pf-avatar" className="input" placeholder="https://…" {...profile.register('avatar')} /><FieldError msg={profile.formState.errors.avatar?.message} /></div>
            <button className="btn-primary" disabled={profile.formState.isSubmitting}>{profile.formState.isSubmitting && <Spinner />}Save profile</button>
          </form>
          <form onSubmit={savePassword} className="card space-y-4" noValidate>
            <h2 className="font-semibold text-ink">Change password</h2>
            <div><label className="label" htmlFor="pw-cur">Current password</label><input id="pw-cur" type="password" autoComplete="current-password" className="input" {...password.register('currentPassword')} /><FieldError msg={password.formState.errors.currentPassword?.message} /></div>
            <div><label className="label" htmlFor="pw-new">New password</label><input id="pw-new" type="password" autoComplete="new-password" className="input" {...password.register('newPassword')} /><FieldError msg={password.formState.errors.newPassword?.message} /></div>
            <button className="btn-primary" disabled={password.formState.isSubmitting}>{password.formState.isSubmitting && <Spinner />}Update password</button>
          </form>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <AsyncView loading={tasks.loading} error={tasks.error} onRetry={tasks.reload} errorTitle="Unable to load your tasks">
            <div className="grid grid-cols-2 gap-4"><StatCard label="Assigned to me (open)" value={open.length} /><StatCard label="Completed by me" value={done.length} /></div>
            <div className="card">
              <h2 className="mb-3 font-semibold text-ink">My tasks</h2>
              {tasks.data?.length === 0 ? <EmptyState title="No tasks found" hint="Tasks assigned to you will appear here." /> : (
                <ul className="divide-y divide-slate-100">
                  {[...open, ...done].map((t) => (
                    <li key={t._id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                      <div className="min-w-0"><Link to={`/tasks/${t._id}`} className="text-sm font-medium text-ink hover:text-steel">{t.title}</Link><p className="text-xs text-slate-400">{t.project.name}</p></div>
                      <div className="flex items-center gap-2"><DeadlineBadge task={t} /><PriorityBadge priority={t.priority} /><StatusBadge status={t.status} /></div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </AsyncView>
        </div>
      </div>
    </>
  );
}
