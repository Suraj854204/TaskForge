import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, Outlet } from 'react-router-dom';
import { z } from 'zod';
import { FieldError, Spinner } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { errMsg, post } from '../services/api';
import type { User } from '../types';

const FullScreenSpinner = () => <div className="flex h-screen items-center justify-center"><Spinner className="h-6 w-6 text-steel" /></div>;

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.workspace) return <NoWorkspace />;
  return <Outlet />;
}

export function PublicOnlyRoute() {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenSpinner />;
  return user ? <Navigate to="/dashboard" replace /> : <Outlet />;
}

export function AdminRoute() {
  const { user } = useAuth();
  return user?.role === 'ADMIN' ? <Outlet /> : <Navigate to="/dashboard" replace />;
}

const schema = z.object({ name: z.string().trim().min(2, 'Name needs at least 2 characters').max(80) });

function NoWorkspace() {
  const { setUser, logout } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });
  const submit = handleSubmit(async (v) => {
    setBusy(true);
    try { setUser((await post<{ user: User }>('/workspaces', v)).user); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  });
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4">
        <h1 className="text-xl font-bold text-ink">Create a workspace</h1>
        <p className="text-sm text-slate-500">You are not part of a workspace. Create one, or ask an admin to add you.</p>
        <div>
          <label className="label" htmlFor="ws-name">Workspace name</label>
          <input id="ws-name" className="input" {...register('name')} />
          <FieldError msg={errors.name?.message} />
        </div>
        <button className="btn-primary w-full" disabled={busy}>{busy && <Spinner />}Create workspace</button>
        <button type="button" className="btn-ghost w-full" onClick={logout}>Log out</button>
      </form>
    </div>
  );
}
