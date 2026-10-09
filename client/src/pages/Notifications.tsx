import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AsyncView, EmptyState, PageHeader } from '../components/ui';
import { useToast } from '../context/ToastContext';
import { useAsync } from '../hooks/useAsync';
import { errMsg, get, patch } from '../services/api';
import type { NotificationItem } from '../types';
import { fmtDateTime } from '../utils/date';

export default function Notifications() {
  const toast = useToast();
  const navigate = useNavigate();
  const { data, loading, error, reload, refresh } = useAsync(() => get<{ notifications: NotificationItem[]; unreadCount: number }>('/notifications'));

  const open = async (n: NotificationItem) => {
    try {
      if (!n.read) await patch(`/notifications/${n._id}/read`);
      if (n.relatedTask) navigate(`/tasks/${n.relatedTask}`); else refresh();
    } catch (e) { toast.error(errMsg(e)); }
  };
  const markAll = async () => {
    try { await patch('/notifications/read-all'); refresh(); } catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <>
      <PageHeader title="Notifications" subtitle={data ? `${data.unreadCount} unread` : undefined}
        actions={<button className="btn-secondary" onClick={markAll} disabled={!data?.unreadCount}>Mark all as read</button>} />
      <AsyncView loading={loading} error={error} onRetry={reload} errorTitle="Unable to load notifications">
        {data?.notifications.length === 0 ? (
          <EmptyState title="No notifications" hint="You'll hear about assignments, comments, deadlines and completed tasks here." />
        ) : (
          <ul className="card divide-y divide-slate-100 !p-0">
            {data?.notifications.map((n) => (
              <li key={n._id}>
                <button onClick={() => open(n)} className={`flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 ${n.read ? '' : 'bg-steel-light/50'}`}>
                  <Bell className={`mt-0.5 h-4 w-4 shrink-0 ${n.read ? 'text-slate-300' : 'text-brass'}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-slate-800">{n.title}</span>
                    <span className="block text-sm text-slate-600">{n.message}</span>
                    <span className="text-xs text-slate-400">{fmtDateTime(n.createdAt)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </AsyncView>
    </>
  );
}
