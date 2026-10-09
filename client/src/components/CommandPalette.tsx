import { BarChart3, Bell, CalendarDays, CornerDownLeft, FolderKanban, LayoutDashboard, ListChecks, LogOut, Moon, Plus, Search, Sun, User as UserIcon } from 'lucide-react';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { get } from '../services/api';
import type { Paginated, Task } from '../types';

interface Entry { key: string; label: string; hint?: string; icon: ReactNode; run: () => void }
export const openPalette = () => window.dispatchEvent(new Event('tf:palette'));

/** Ctrl/Cmd+K quick switcher: jump to pages, run actions, and search tasks. */
export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [idx, setIdx] = useState(0);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen((o) => !o); }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('tf:palette', onOpen);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('tf:palette', onOpen); };
  }, []);

  useEffect(() => { if (!open) { setQ(''); setTasks([]); setIdx(0); } }, [open]);
  useEffect(() => {
    if (q.trim().length < 2) { setTasks([]); return; }
    const t = setTimeout(async () => {
      try { setTasks((await get<Paginated<Task>>('/tasks', { search: q.trim(), limit: 5 })).items); } catch { setTasks([]); }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const entries = useMemo<Entry[]>(() => {
    const go = (to: string) => () => navigate(to);
    const icon = 'h-4 w-4';
    const commands: Entry[] = [
      { key: 'new', label: 'Create new task', hint: 'Action', icon: <Plus className={icon} />, run: go('/tasks?new=1') },
      { key: 'dash', label: 'Go to Dashboard', icon: <LayoutDashboard className={icon} />, run: go('/dashboard') },
      { key: 'proj', label: 'Go to Projects', icon: <FolderKanban className={icon} />, run: go('/projects') },
      { key: 'tasks', label: 'Go to Tasks', icon: <ListChecks className={icon} />, run: go('/tasks') },
      { key: 'cal', label: 'Go to Calendar', icon: <CalendarDays className={icon} />, run: go('/calendar') },
      { key: 'ana', label: 'Go to Analytics', icon: <BarChart3 className={icon} />, run: go('/analytics') },
      { key: 'not', label: 'Go to Notifications', icon: <Bell className={icon} />, run: go('/notifications') },
      { key: 'prof', label: 'Go to Profile', icon: <UserIcon className={icon} />, run: go('/profile') },
      { key: 'theme', label: dark ? 'Switch to light mode' : 'Switch to dark mode', hint: 'Action', icon: dark ? <Sun className={icon} /> : <Moon className={icon} />, run: toggle },
      { key: 'out', label: 'Log out', hint: 'Action', icon: <LogOut className={icon} />, run: logout },
    ];
    if (user?.role === 'ADMIN') commands.splice(8, 0, { key: 'admin', label: 'Go to Admin', icon: <UserIcon className={icon} />, run: go('/admin') });
    const needle = q.trim().toLowerCase();
    const shown = needle ? commands.filter((c) => c.label.toLowerCase().includes(needle)) : commands;
    const found: Entry[] = tasks.map((t) => ({ key: `t-${t._id}`, label: t.title, hint: t.project.name, icon: <ListChecks className={icon} />, run: go(`/tasks/${t._id}`) }));
    return [...found, ...shown];
  }, [q, tasks, dark, user?.role, navigate, toggle, logout]);

  useEffect(() => setIdx(0), [q, tasks.length]);
  if (!open) return null;

  const run = (e?: Entry) => { if (!e) return; setOpen(false); e.run(); };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(i + 1, entries.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); run(entries[idx]); }
    else if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[70] bg-ink/60 px-4 pt-[10vh] backdrop-blur-sm" onMouseDown={() => setOpen(false)}>
      <div role="dialog" aria-modal="true" aria-label="Command palette" onMouseDown={(e) => e.stopPropagation()} className="mx-auto w-full max-w-xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center gap-3 border-b border-slate-200 px-4">
          <Search className="h-4 w-4 text-slate-400" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKeyDown} placeholder="Search tasks or jump to a page…" aria-label="Search" className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-slate-400" />
          <kbd className="hidden rounded border border-slate-300 px-1.5 py-0.5 text-[10px] text-slate-500 sm:block">Esc</kbd>
        </div>
        <ul role="listbox" className="max-h-80 overflow-y-auto p-2">
          {entries.length === 0 && <li className="px-3 py-8 text-center text-sm text-slate-500">No results</li>}
          {entries.map((e, i) => (
            <li key={e.key} role="option" aria-selected={i === idx}>
              <button onMouseEnter={() => setIdx(i)} onClick={() => run(e)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm ${i === idx ? 'bg-steel-light text-steel-dark' : 'text-slate-700'}`}>
                <span className="text-slate-400">{e.icon}</span>
                <span className="min-w-0 flex-1 truncate">{e.label}</span>
                {e.hint && <span className="text-xs text-slate-400">{e.hint}</span>}
                {i === idx && <CornerDownLeft className="h-3.5 w-3.5 text-slate-400" />}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
