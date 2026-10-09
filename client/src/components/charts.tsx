import { ReactNode } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CHART_COLORS, PRIORITY_COLORS, statusLabel } from '../utils/constants';

export type Slice = { name: string; value: number };
export type ProjectProgressRow = { name: string; color: string; progress: number; completed: number; total: number };

export const ChartCard = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="card">
    <h3 className="mb-3 text-sm font-semibold text-slate-700">{title}</h3>
    <div className="h-64">{children}</div>
  </div>
);

const NoData = () => <div className="flex h-full items-center justify-center text-sm text-slate-400">No data yet</div>;

export function StatusPie({ data, title = 'Tasks by status' }: { data: Slice[]; title?: string }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <ChartCard title={title}>
      {total === 0 ? <NoData /> : (
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data.map((d) => ({ ...d, name: statusLabel(d.name) }))} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
              {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

export function PriorityBars({ data, title = 'Tasks by priority' }: { data: Slice[]; title?: string }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <ChartCard title={title}>
      {total === 0 ? <NoData /> : (
        <ResponsiveContainer>
          <BarChart data={data.map((d) => ({ ...d, name: statusLabel(d.name) }))}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="value" name="Tasks" radius={[4, 4, 0, 0]}>
              {data.map((_, i) => <Cell key={i} fill={PRIORITY_COLORS[i]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

export function WeeklyBars({ data, title = 'Weekly completed tasks' }: { data: { week: string; completed: number }[]; title?: string }) {
  return (
    <ChartCard title={title}>
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="week" tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Bar dataKey="completed" name="Completed" fill="#2E6A9E" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function ProjectProgressChart({ data, title = 'Project progress' }: { data: ProjectProgressRow[]; title?: string }) {
  return (
    <ChartCard title={title}>
      {data.length === 0 ? <NoData /> : (
        <ResponsiveContainer>
          <BarChart data={data} layout="vertical" margin={{ left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 12 }} />
            <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v) => `${v}%`} />
            <Bar dataKey="progress" name="Progress" radius={[0, 4, 4, 0]}>
              {data.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

export function TrendLine({ data }: { data: { week: string; completed: number; created: number }[] }) {
  return (
    <ChartCard title="Productivity trend">
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="week" tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="created" name="Created" stroke="#C98A2B" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="completed" name="Completed" stroke="#2E6A9E" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
