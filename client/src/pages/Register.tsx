import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { AuthShell } from '../components/AuthShell';
import { FieldError, Spinner } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { errMsg } from '../services/api';

const schema = z.object({
  name: z.string().trim().min(2, 'Name needs at least 2 characters').max(60),
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(8, 'At least 8 characters').regex(/[A-Za-z]/, 'Include a letter').regex(/\d/, 'Include a number'),
  workspaceName: z.string().trim().max(80),
});
type Values = z.infer<typeof schema>;

export default function Register() {
  const { register: signUp } = useAuth();
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { workspaceName: '' } });

  const submit = handleSubmit(async (v) => {
    setError('');
    try { await signUp({ ...v, workspaceName: v.workspaceName || undefined }); } catch (e) { setError(errMsg(e)); }
  });

  return (
    <AuthShell title="Create your account" subtitle="You'll become the admin of a new workspace" footer={<>Already have an account? <Link to="/login" className="font-semibold text-steel hover:underline">Log in</Link></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {error && <div role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <div>
          <label className="label" htmlFor="name">Full name</label>
          <input id="name" autoComplete="name" className="input" {...register('name')} />
          <FieldError msg={errors.name?.message} />
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email" className="input" {...register('email')} />
          <FieldError msg={errors.email?.message} />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" type="password" autoComplete="new-password" className="input" {...register('password')} />
          <FieldError msg={errors.password?.message} />
        </div>
        <div>
          <label className="label" htmlFor="ws">Workspace name <span className="font-normal text-slate-400">(optional)</span></label>
          <input id="ws" className="input" {...register('workspaceName')} />
          <FieldError msg={errors.workspaceName?.message} />
        </div>
        <button className="btn-primary w-full" disabled={isSubmitting}>{isSubmitting && <Spinner />}Create account</button>
      </form>
    </AuthShell>
  );
}
