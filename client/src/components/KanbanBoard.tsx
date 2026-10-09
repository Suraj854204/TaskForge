import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Task, TaskStatus } from '../types';
import { STATUSES, statusLabel } from '../utils/constants';
import { Avatar, DeadlineBadge, PriorityBadge } from './ui';

const COLUMN_ACCENT: Record<TaskStatus, string> = {
  TODO: 'border-t-slate-400', IN_PROGRESS: 'border-t-steel', IN_REVIEW: 'border-t-brass', COMPLETED: 'border-t-emerald-500',
};

interface Props { tasks: Task[]; onMove: (taskId: string, status: TaskStatus) => void }

/** Native HTML5 drag & drop; each card also has a status select so touch devices can move tasks. */
export default function KanbanBoard({ tasks, onMove }: Props) {
  const [over, setOver] = useState<TaskStatus | null>(null);

  return (
    <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0 xl:grid xl:grid-cols-4 xl:overflow-visible">
      {STATUSES.map((status) => {
        const column = tasks.filter((t) => t.status === status);
        return (
          <section
            key={status}
            aria-label={`${statusLabel(status)} column`}
            onDragOver={(e) => { e.preventDefault(); setOver(status); }}
            onDragLeave={() => setOver((o) => (o === status ? null : o))}
            onDrop={(e) => {
              e.preventDefault();
              setOver(null);
              const id = e.dataTransfer.getData('text/plain');
              const t = tasks.find((x) => x._id === id);
              if (t && t.status !== status) onMove(id, status);
            }}
            className={`min-h-40 w-[82%] shrink-0 snap-start rounded-xl border sm:w-72 xl:w-auto border-t-4 border-slate-200 bg-slate-100/70 p-3 transition ${COLUMN_ACCENT[status]} ${over === status ? 'bg-steel-light ring-2 ring-steel/40' : ''}`}
          >
            <header className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">{statusLabel(status)}</h3>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-500">{column.length}</span>
            </header>
            <div className="space-y-2">
              {column.length === 0 && <p className="py-4 text-center text-xs text-slate-400">Drop tasks here</p>}
              {column.map((t) => (
                <article key={t._id} draggable onDragStart={(e) => e.dataTransfer.setData('text/plain', t._id)} className="cursor-grab rounded-md border border-slate-200 bg-white p-3 shadow-sm active:cursor-grabbing">
                  <Link to={`/tasks/${t._id}`} className="text-sm font-medium text-ink hover:text-steel">{t.title}</Link>
                  <div className="mt-2 flex flex-wrap items-center gap-2"><PriorityBadge priority={t.priority} /><DeadlineBadge task={t} /></div>
                  {t.tags.length > 0 && <p className="mt-2 truncate text-xs text-slate-400">#{t.tags.join(' #')}</p>}
                  <div className="mt-2 flex items-center justify-between">
                    <Avatar user={t.assignedTo} size={24} />
                    <select aria-label={`Move ${t.title}`} value={t.status} onChange={(e) => onMove(t._id, e.target.value as TaskStatus)} className="rounded border border-slate-200 bg-white px-1 py-0.5 text-xs text-slate-600">
                      {STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
                    </select>
                  </div>
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
