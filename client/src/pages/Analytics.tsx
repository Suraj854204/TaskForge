import { PriorityBars, ProjectProgressChart, ProjectProgressRow, Slice, StatusPie, TrendLine } from '../components/charts';
import { AsyncView, PageHeader, StatCard } from '../components/ui';
import { useAsync } from '../hooks/useAsync';
import { get } from '../services/api';

interface Productivity {
  metrics: { completionRate: number; averageCompletionHours: number; completedThisWeek: number; completedThisMonth: number; overduePercentage: number };
  charts: { productivityTrend: { week: string; completed: number; created: number }[]; statusDistribution: Slice[]; priorityDistribution: Slice[]; projectCompletion: ProjectProgressRow[] };
}

const avgLabel = (h: number) => (h >= 48 ? `${(h / 24).toFixed(1)} days` : `${h} hrs`);

export default function Analytics() {
  const { data, loading, error, reload } = useAsync(() => get<Productivity>('/analytics/productivity'));
  const m = data?.metrics;
  return (
    <>
      <PageHeader title="Analytics" subtitle="Productivity metrics calculated from your workspace data" />
      <AsyncView loading={loading} error={error} onRetry={reload} errorTitle="Unable to load analytics">
        {data && m && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <StatCard label="Completion rate" value={`${m.completionRate}%`} />
              <StatCard label="Avg. completion time" value={m.averageCompletionHours ? avgLabel(m.averageCompletionHours) : '—'} />
              <StatCard label="Done this week" value={m.completedThisWeek} />
              <StatCard label="Done this month" value={m.completedThisMonth} />
              <StatCard label="Overdue" value={`${m.overduePercentage}%`} accent={m.overduePercentage > 0} />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <TrendLine data={data.charts.productivityTrend} />
              <StatusPie data={data.charts.statusDistribution} title="Status distribution" />
              <PriorityBars data={data.charts.priorityDistribution} title="Priority distribution" />
              <ProjectProgressChart data={data.charts.projectCompletion} title="Project completion" />
            </div>
          </div>
        )}
      </AsyncView>
    </>
  );
}
