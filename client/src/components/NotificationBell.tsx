import { Bell } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { get, patch } from '../services/api';
import type { NotificationItem } from '../types';
import { fmtDateTime } from '../utils/date';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const load = async () => {
    try {
      const d = await get<{ notifications: NotificationItem[]; unreadCount: number }>('/notifications');
      setItems(d.notifications);
      setUnread(d.unreadCount);
    } catch { /* bell stays quiet on failure; the Notifications page shows errors */ }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const openItem = async (n: NotificationItem) => {
    if (!n.read) { await patch(`/notifications/${n._id}/read`); load(); }
    setOpen(false);
    if (n.relatedTask) navigate(`/tasks/${n.relatedTask}`);
  };
  const markAll = async () => { await patch('/notifications/read-all'); load(); };

  return (
    <div className="relative" ref={ref}>
      <button className="btn-ghost relative !p-2" onClick={() => { setOpen(!open); if (!open) load(); }} aria-label={`Notifications, ${unread} unread`} aria-expanded={open}>
        <Bell className="h-5 w-5" />
        {unread > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brass px-1 text-[10px] font-bold text-white">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 max-w-[calc(100vw-1.5rem)] rounded-lg border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
            <span className="text-sm font-semibold">Notifications</span>
            <button className="text-xs font-medium text-steel hover:underline disabled:text-slate-400" onClick={markAll} disabled={!unread}>Mark all as read</button>
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {items.length === 0 && <li className="px-4 py-8 text-center text-sm text-slate-500">You're all caught up</li>}
            {items.slice(0, 8).map((n) => (
              <li key={n._id}>
                <button onClick={() => openItem(n)} className={`block w-full px-4 py-2.5 text-left hover:bg-slate-50 ${n.read ? '' : 'bg-steel-light/50'}`}>
                  <p className="text-sm font-medium text-slate-800">{n.title}</p>
                  <p className="text-xs text-slate-600">{n.message}</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">{fmtDateTime(n.createdAt)}</p>
                </button>
              </li>
            ))}
          </ul>
          <Link to="/notifications" onClick={() => setOpen(false)} className="block border-t border-slate-100 px-4 py-2 text-center text-sm font-medium text-steel hover:bg-slate-50">View all</Link>
        </div>
      )}
    </div>
  );
}
