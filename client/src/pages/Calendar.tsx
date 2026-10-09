import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AsyncView, DeadlineBadge, EmptyState, PageHeader, PriorityBadge } from '../components/ui';
import { useAsync } from '../hooks/useAsync';
import { get } from '../services/api';
import type { Paginated, Task } from '../types';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const keyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const DOT: Record<string, string> = { LOW: 'bg-slate-400', MEDIUM: 'bg-sky-500', HIGH: 'bg-orange-500', URGENT: 'bg-red-600' };

export default function Calendar() {
  const [cursor, setCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [mine, setMine] = useState(false);
  const [selected, setSelected] = useState(() => keyOf(new Date()));

  const from = cursor;
  const to = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59, 999);
  const { data, loading, error, reload } = useAsync(
    async () => (await get<Paginated<Task>>('/tasks', { dueAfter: from.toISOString(), dueBefore: to.toISOString(), limit: 200, sort: 'deadline', ...(mine ? { assignedTo: 'me' } : {}) })).items,
    [cursor.getTime(), mine],
  );

  const byDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    data?.forEach((t) => { if (t.dueDate) { const k = keyOf(new Date(t.dueDate)); map.set(k, [...(map.get(k) ?? []), t]); } });
    return map;
  }, [data]);

  const lead = (cursor.getDay() + 6) % 7;
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => new Date(cursor.getFullYear(), cursor.getMonth(), i + 1))];
  const today = keyOf(new Date());
  const shift = (n: number) => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + n, 1));
  const dayTasks = byDay.get(selected) ?? [];

  return (
    <>
      <PageHeader title="Calendar" subtitle="Task deadlines by day"
        actions={<label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} />Only my tasks</label>} />
      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">{cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
          <div className="flex gap-1">
            <button className="btn-secondary !p-2" onClick={() => shift(-1)} aria-label="Previous month"><ChevronLeft className="h-4 w-4" /></button>
            <button className="btn-secondary" onClick={() => { const d = new Date(); setCursor(new Date(d.getFullYear(), d.getMonth(), 1)); setSelected(keyOf(d)); }}>Today</button>
            <button className="btn-secondary !p-2" onClick={() => shift(1)} aria-label="Next month"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
        <AsyncView loading={loading} error={error} onRetry={reload} errorTitle="Unable to load calendar">
          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 text-xs">
            {WEEKDAYS.map((d) => <div key={d} className="bg-slate-50 py-2 text-center font-medium text-slate-500">{d}</div>)}
            {cells.map((d, i) => {
              if (!d) return <div key={`b${i}`} className="min-h-14 bg-slate-50 sm:min-h-24" />;
              const k = keyOf(d);
              const items = byDay.get(k) ?? [];
              return (
                <button key={k} onClick={() => setSelected(k)} aria-label={`${d.toDateString()}, ${items.length} tasks`}
                  className={`min-h-14 bg-white p-1 text-left align-top transition hover:bg-slate-50 sm:min-h-24 sm:p-1.5 ${selected === k ? 'ring-2 ring-inset ring-steel' : ''}`}>
                  <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${k === today ? 'bg-brass text-ink' : 'text-slate-600'}`}>{d.getDate()}</span>
                  <div className="mt-1 hidden space-y-0.5 sm:block">
                    {items.slice(0, 2).map((t) => <div key={t._id} className={`truncate rounded px-1 py-0.5 text-[11px] ${t.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700 line-through' : 'bg-steel-light text-steel-dark'}`}>{t.title}</div>)}
                    {items.length > 2 && <div className="px-1 text-[11px] text-slate-400">+{items.length - 2} more</div>}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-0.5 sm:hidden">{items.slice(0, 4).map((t) => <span key={t._id} className={`h-1.5 w-1.5 rounded-full ${DOT[t.priority]}`} />)}</div>
                </button>
              );
            })}
          </div>
        </AsyncView>
      </div>

      <div className="card mt-4">
        <h2 className="mb-3 font-semibold text-ink">{new Date(`${selected}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h2>
        {dayTasks.length === 0 ? <EmptyState title="No tasks due" hint="Pick another day, or add a deadline to a task." /> : (
          <ul className="divide-y divide-slate-100">
            {dayTasks.map((t) => (
              <li key={t._id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div className="min-w-0"><Link to={`/tasks/${t._id}`} className="text-sm font-medium text-ink hover:text-steel">{t.title}</Link><p className="text-xs text-slate-400">{t.project.name}</p></div>
                <div className="flex items-center gap-2"><DeadlineBadge task={t} /><PriorityBadge priority={t.priority} /></div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
