import { BarChart3, Bell, CalendarDays, FolderKanban, LayoutDashboard, ListChecks, LogOut, Menu, Moon, MoreHorizontal, Search, Shield, Sun, User as UserIcon, X } from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import CommandPalette, { openPalette } from '../components/CommandPalette';
import NotificationBell from '../components/NotificationBell';
import { Avatar } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const GROUPS = [
  { title: 'Workspace', items: [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/projects', label: 'Projects', icon: FolderKanban },
    { to: '/tasks', label: 'Tasks', icon: ListChecks },
    { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  ] },
  { title: 'Insights', items: [
    { to: '/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/notifications', label: 'Notifications', icon: Bell },
  ] },
];
const BOTTOM = [GROUPS[0].items[0], GROUPS[0].items[1], GROUPS[0].items[2], GROUPS[0].items[3]];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const isAdmin = user?.role === 'ADMIN';
  const account = [{ to: '/profile', label: 'Profile', icon: UserIcon }, ...(isAdmin ? [{ to: '/admin', label: 'Admin', icon: Shield }] : [])];

  const link = ({ isActive }: { isActive: boolean }) =>
    `group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${isActive ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`;

  const renderLink = ({ to, label, icon: Icon }: { to: string; label: string; icon: typeof Bell }) => (
    <NavLink key={to} to={to} onClick={() => setOpen(false)} className={link}>
      {({ isActive }) => (
        <>
          {isActive && <span className="absolute -left-3 top-1.5 h-6 w-1 rounded-r bg-brass" />}
          <Icon className="h-4 w-4" />{label}
        </>
      )}
    </NavLink>
  );

  return (
    <div className="min-h-screen lg:pl-64">
      {open && <div className="fixed inset-0 z-40 bg-ink/60 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-ink transition-transform duration-200 lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`} aria-label="Sidebar">
        <div className="flex h-16 items-center justify-between px-5">
          <span className="flex items-center gap-2 text-lg font-bold tracking-tight text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brass text-ink">T</span>Task<span className="-ml-1.5 text-brass">Forge</span>
          </span>
          <button className="text-slate-400 lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X className="h-5 w-5" /></button>
        </div>
        <div className="mx-3 mb-3 rounded-lg bg-white/5 px-3 py-2">
          <p className="text-[11px] text-slate-500">Workspace</p>
          <p className="truncate text-sm font-semibold text-white">{user?.workspace?.name}</p>
        </div>
        <nav className="flex-1 space-y-5 overflow-y-auto px-3" aria-label="Main">
          {GROUPS.map((g) => (
            <div key={g.title}>
              <p className="mb-1 px-3 text-[11px] font-medium text-slate-500">{g.title}</p>
              <div className="space-y-0.5">{g.items.map(renderLink)}</div>
            </div>
          ))}
          <div>
            <p className="mb-1 px-3 text-[11px] font-medium text-slate-500">Account</p>
            <div className="space-y-0.5">{account.map(renderLink)}</div>
          </div>
        </nav>
        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <Avatar user={user} size={34} />
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-white">{user?.name}</p><p className="truncate text-xs text-slate-500">{isAdmin ? 'Admin' : 'Member'}</p></div>
            <button onClick={logout} className="rounded-md p-2 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Log out"><LogOut className="h-4 w-4" /></button>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-slate-200 bg-white/90 px-3 backdrop-blur sm:gap-3 sm:px-6">
        <button className="btn-ghost !p-2 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
        <button onClick={openPalette} className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-left text-sm text-slate-400 transition hover:border-steel sm:max-w-md" aria-label="Search or jump to">
          <Search className="h-4 w-4 shrink-0" /><span className="flex-1 truncate">Search tasks or jump to…</span>
          <kbd className="hidden rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[10px] text-slate-500 sm:block">Ctrl K</kbd>
        </button>
        <div className="ml-auto flex items-center gap-1">
          <button className="btn-ghost !p-2" onClick={toggle} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}>{dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}</button>
          <NotificationBell />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-28 pt-5 sm:px-6 sm:pt-6 lg:pb-10"><Outlet /></main>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden" aria-label="Quick navigation">
        {BOTTOM.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${isActive ? 'text-steel' : 'text-slate-500'}`}>
            <Icon className="h-5 w-5" />{label}
          </NavLink>
        ))}
        <button onClick={() => setOpen(true)} className="flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-slate-500"><MoreHorizontal className="h-5 w-5" />More</button>
      </nav>
      <CommandPalette />
    </div>
  );
}
