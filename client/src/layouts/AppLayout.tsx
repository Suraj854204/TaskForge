import { BarChart3, Bell, FolderKanban, LayoutDashboard, ListChecks, LogOut, Menu, Search, Shield, User as UserIcon, X } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import NotificationBell from '../components/NotificationBell';
import { Avatar } from '../components/ui';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/tasks', label: 'Tasks', icon: ListChecks },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/profile', label: 'Profile', icon: UserIcon },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const items = user?.role === 'ADMIN' ? [...NAV, { to: '/admin', label: 'Admin', icon: Shield }] : NAV;

  const search = (e: FormEvent) => {
    e.preventDefault();
    navigate(q.trim() ? `/tasks?search=${encodeURIComponent(q.trim())}` : '/tasks');
  };

  return (
    <div className="min-h-screen lg:pl-60">
      {open && <div className="fixed inset-0 z-30 bg-ink/50 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col bg-ink text-slate-300 transition-transform lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-14 items-center justify-between px-5">
          <span className="text-lg font-bold tracking-tight text-white">Task<span className="text-brass">Forge</span></span>
          <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X className="h-5 w-5" /></button>
        </div>
        <p className="truncate px-5 pb-2 text-xs text-slate-500">{user?.workspace?.name}</p>
        <nav className="flex-1 space-y-0.5 px-3" aria-label="Main">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} onClick={() => setOpen(false)}
              className={({ isActive }) => `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition ${isActive || (to !== '/dashboard' && location.pathname.startsWith(to)) ? 'bg-ink-soft text-white' : 'hover:bg-ink-soft/60 hover:text-white'}`}>
              <Icon className="h-4 w-4" />{label}
            </NavLink>
          ))}
        </nav>
        <button onClick={logout} className="m-3 flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-ink-soft hover:text-white">
          <LogOut className="h-4 w-4" />Log out
        </button>
      </aside>

      <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur">
        <button className="btn-ghost !p-2 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
        <form onSubmit={search} className="relative max-w-md flex-1" role="search">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} className="input !pl-9" placeholder="Search tasks by title, description or tag" aria-label="Search tasks" />
        </form>
        <div className="ml-auto flex items-center gap-2">
          <NotificationBell />
          <button className="flex items-center gap-2 rounded-md p-1 hover:bg-slate-100" onClick={() => navigate('/profile')} aria-label="Profile">
            <Avatar user={user} size={30} />
            <span className="hidden text-sm font-medium sm:block">{user?.name}</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4 sm:p-6"><Outlet /></main>
    </div>
  );
}
