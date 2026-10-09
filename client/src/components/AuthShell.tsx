import { ReactNode } from 'react';

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-ink p-10 text-slate-300 lg:flex">
        <span className="text-xl font-bold text-white">Task<span className="text-brass">Forge</span></span>
        <div>
          <p className="max-w-md text-3xl font-bold leading-tight text-white">Shape the work. Ship it together.</p>
          <p className="mt-3 max-w-md text-slate-400">Projects, tasks, a live Kanban board and real productivity numbers for your team in one place.</p>
        </div>
        <p className="text-xs text-slate-500">MERN · TypeScript · JWT</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold text-ink">{title}</h1>
          <p className="mb-6 mt-1 text-sm text-slate-500">{subtitle}</p>
          {children}
          <p className="mt-6 text-center text-sm text-slate-500">{footer}</p>
        </div>
      </div>
    </div>
  );
}
