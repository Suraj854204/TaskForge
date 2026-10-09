import { PriorityBars, ProjectProgressChart, ProjectProgressRow, Slice, StatusPie, WeeklyBars } from '../components/charts';
import { AsyncView, PageHeader, StatCard } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useAsync } from '../hooks/useAsync';
import { get } from '../services/api';

interface DashboardData {
  stats: { totalProjects: number; totalTasks: number; completedTasks: number; pendingTasks: number; overdueTasks: number; assignedToMe: number; highPriorityTasks: number; completionPercentage: number };
  charts: { tasksByStatus: Slice[]; tasksByPriority: Slice[]; weeklyCompleted: { week: string; completed: number }[]; projectProgress: ProjectProgressRow[] };
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useAsync(() => get<DashboardData>('/analytics/dashboard'));
  const s = data?.stats;

  return (
    <>
      <PageHeader title={`Hello, ${user?.name.split(' ')[0]}`} subtitle={`Here's where ${user?.workspace?.name} stands today`} />
      <AsyncView loading={loading} error={error} onRetry={reload} errorTitle="Unable to load dashboard">
        {data && s && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Projects" value={s.totalProjects} />
              <StatCard label="Total tasks" value={s.totalTasks} />
              <StatCard label="Completed" value={s.completedTasks} hint={`${s.completionPercentage}% completion`} />
              <StatCard label="Pending" value={s.pendingTasks} />
              <StatCard label="Overdue" value={s.overdueTasks} accent={s.overdueTasks > 0} />
              <StatCard label="Assigned to me" value={s.assignedToMe} hint="Open tasks" />
              <StatCard label="High priority" value={s.highPriorityTasks} hint="High + urgent, open" />
              <StatCard label="Completion" value={`${s.completionPercentage}%`} />
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
    </>
  );
}
