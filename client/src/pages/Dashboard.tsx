import { AlertTriangle, CheckCircle2, Clock, FolderKanban, Flame, ListChecks, Plus, TrendingUp, UserCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PriorityBars, ProjectProgressChart, ProjectProgressRow, Slice, StatusPie, WeeklyBars } from '../components/charts';
import { Avatar, AsyncView, DeadlineBadge, EmptyState, Ring, StatTile } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useAsync } from '../hooks/useAsync';
import { get } from '../services/api';
import { timeAgo } from '../utils/date';

interface UpcomingTask { _id: string; title: string; dueDate: string; status: string; createdAt: string; project: { name: string; color: string }; assignedTo: { name: string; avatar?: string } | null }
interface ActivityRow { _id: string; message: string; createdAt: string; actor: { name: string; avatar?: string }; task: { _id: string; title: string } | null }
interface DashboardData {
  stats: { totalProjects: number; totalTasks: number; completedTasks: number; pendingTasks: number; overdueTasks: number; assignedToMe: number; highPriorityTasks: number; completionPercentage: number };
  charts: { tasksByStatus: Slice[]; tasksByPriority: Slice[]; weeklyCompleted: { week: string; completed: number }[]; projectProgress: ProjectProgressRow[] };
  upcoming: UpcomingTask[];
  recentActivity: ActivityRow[];
}

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};

export default function Dashboard() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useAsync(() => get<DashboardData>('/analytics/dashboard'));
  const s = data?.stats;

  return (
    <AsyncView loading={loading} error={error} onRetry={reload} errorTitle="Unable to load dashboard">
      {data && s && (
        <div className="space-y-6">
          <section className="relative overflow-hidden rounded-2xl bg-ink p-5 text-white sm:p-7">
            <div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full bg-brass/20 blur-3xl" aria-hidden />
            <div className="pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-steel/30 blur-3xl" aria-hidden />
            <div className="relative flex flex-wrap items-center justify-between gap-6">
              <div className="max-w-lg">
                <p className="text-sm text-slate-400">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{greeting()}, {user?.name.split(' ')[0]}</h1>
                <p className="mt-2 text-sm text-slate-300">
                  {s.assignedToMe === 0 ? 'Nothing open is assigned to you.' : `${s.assignedToMe} open task${s.assignedToMe === 1 ? '' : 's'} assigned to you`}
                  {s.overdueTasks > 0 && <> · <span className="font-semibold text-brass">{s.overdueTasks} overdue</span> across the workspace</>}.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link to="/tasks?new=1" className="btn bg-brass text-ink hover:bg-amber-500"><Plus className="h-4 w-4" />New task</Link>
                  <Link to="/tasks?assignedTo=me" className="btn border border-white/20 text-white hover:bg-white/10">My tasks</Link>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Ring value={s.completionPercentage} />
                <div className="text-sm"><p className="font-semibold">Workspace progress</p><p className="text-slate-400">{s.completedTasks} of {s.totalTasks} tasks done</p></div>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatTile label="Projects" value={s.totalProjects} icon={<FolderKanban className="h-5 w-5" />} />
            <StatTile label="Total tasks" value={s.totalTasks} icon={<ListChecks className="h-5 w-5" />} />
            <StatTile label="Completed" value={s.completedTasks} icon={<CheckCircle2 className="h-5 w-5" />} tone="green" hint={`${s.completionPercentage}% completion`} />
            <StatTile label="Pending" value={s.pendingTasks} icon={<Clock className="h-5 w-5" />} />
            <StatTile label="Overdue" value={s.overdueTasks} icon={<AlertTriangle className="h-5 w-5" />} tone={s.overdueTasks > 0 ? 'red' : 'steel'} />
            <StatTile label="Assigned to me" value={s.assignedToMe} icon={<UserCheck className="h-5 w-5" />} hint="Open tasks" />
            <StatTile label="High priority" value={s.highPriorityTasks} icon={<Flame className="h-5 w-5" />} tone="brass" hint="High + urgent, open" />
            <StatTile label="Completion" value={`${s.completionPercentage}%`} icon={<TrendingUp className="h-5 w-5" />} tone="green" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card">
              <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold text-slate-700">Upcoming deadlines</h2><Link to="/tasks?sort=deadline" className="text-xs font-medium text-steel hover:underline">View all</Link></div>
              {data.upcoming.length === 0 ? <EmptyState title="No upcoming deadlines" hint="Tasks with a due date show up here." /> : (
                <ul className="divide-y divide-slate-100">
                  {data.upcoming.map((t) => (
                    <li key={t._id} className="flex items-center gap-3 py-2.5">
                      <span className="h-8 w-1 shrink-0 rounded-full" style={{ background: t.project.color }} />
                      <div className="min-w-0 flex-1"><Link to={`/tasks/${t._id}`} className="block truncate text-sm font-medium text-ink hover:text-steel">{t.title}</Link><p className="truncate text-xs text-slate-400">{t.project.name}</p></div>
                      <DeadlineBadge task={t} />
                      <Avatar user={t.assignedTo} size={24} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="card">
              <h2 className="mb-3 text-sm font-semibold text-slate-700">Recent activity</h2>
              {data.recentActivity.length === 0 ? <EmptyState title="No activity yet" hint="Task changes will appear here." /> : (
                <ul className="space-y-3">
                  {data.recentActivity.map((a) => (
                    <li key={a._id} className="flex gap-3">
                      <Avatar user={a.actor} size={28} />
                      <div className="min-w-0 flex-1 text-sm">
                        <p className="text-slate-700">{a.message}</p>
                        <p className="truncate text-xs text-slate-400">{a.task && <Link to={`/tasks/${a.task._id}`} className="hover:text-steel">{a.task.title}</Link>} · {timeAgo(a.createdAt)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <StatusPie data={data.charts.tasksByStatus} />
            <PriorityBars data={data.charts.tasksByPriority} />
            <WeeklyBars data={data.charts.weeklyCompleted} />
            <ProjectProgressChart data={data.charts.projectProgress} />
          </div>
        </div>
      )}
    </AsyncView>
  );
}
