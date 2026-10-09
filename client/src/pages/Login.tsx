import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { AuthShell } from '../components/AuthShell';
import { FieldError, Spinner } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { errMsg } from '../services/api';

const schema = z.object({ email: z.string().trim().email('Enter a valid email'), password: z.string().min(1, 'Password is required') });
type Values = z.infer<typeof schema>;

export default function Login() {
  const { login } = useAuth();
  const [params] = useSearchParams();
  const [error, setError] = useState(params.get('expired') ? 'Your session expired. Please log in again.' : '');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema) });

  const submit = handleSubmit(async (v) => {
    setError('');
    try { await login(v.email, v.password); } catch (e) { setError(errMsg(e)); }
  });

  return (
    <AuthShell title="Welcome back" subtitle="Log in to your workspace" footer={<>New to TaskForge? <Link to="/register" className="font-semibold text-steel hover:underline">Create an account</Link></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {error && <div role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email" className="input" {...register('email')} />
          <FieldError msg={errors.email?.message} />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" type="password" autoComplete="current-password" className="input" {...register('password')} />
          <FieldError msg={errors.password?.message} />
        </div>
        <button className="btn-primary w-full" disabled={isSubmitting}>{isSubmitting && <Spinner />}Log in</button>
        <p className="text-center text-xs text-slate-400">Demo (after seeding): admin@taskforge.dev / Password123</p>
      </form>
    </AuthShell>
  );
}
