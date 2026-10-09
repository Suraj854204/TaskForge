import { Activity, Project, Task, UserDoc } from '../models';
import { PRIORITIES, TASK_STATUSES } from '../types';

const DAY = 86_400_000;
const startOfWeek = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); // Monday
  return x;
};
const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

function weeklyBuckets(weeks: number) {
  const first = startOfWeek(new Date(Date.now() - (weeks - 1) * 7 * DAY));
  return Array.from({ length: weeks }, (_, i) => {
    const start = new Date(first.getTime() + i * 7 * DAY);
    return { start, end: new Date(start.getTime() + 7 * DAY), week: fmt(start) };
  });
}

const countsToList = (rows: { _id: string; count: number }[], keys: readonly string[]) =>
  keys.map((k) => ({ name: k, value: rows.find((r) => r._id === k)?.count ?? 0 }));

async function projectProgress(workspace: unknown) {
  const [projects, rows] = await Promise.all([
    Project.find({ workspace }).select('name color').lean(),
    Task.aggregate([
      { $match: { workspace } },
      { $group: { _id: { p: '$project', done: { $eq: ['$status', 'COMPLETED'] } }, c: { $sum: 1 } } },
    ]),
  ]);
  return projects.map((p) => {
    const mine = rows.filter((r) => String(r._id.p) === String(p._id));
    const total = mine.reduce((s, r) => s + r.c, 0);
    const completed = mine.filter((r) => r._id.done).reduce((s, r) => s + r.c, 0);
    return {
      name: p.name,
      color: p.color,
      total,
      completed,
      progress: total ? Math.round((completed / total) * 100) : 0,
    };
  });
}

export async function getDashboard(user: UserDoc) {
  const workspace = user.workspace;
  const now = new Date();
  const open = { $ne: 'COMPLETED' };
  const group = (field: string) => Task.aggregate([{ $match: { workspace } }, { $group: { _id: `$${field}`, count: { $sum: 1 } } }]);

  const [totalProjects, totalTasks, completed, overdue, assignedToMe, highPriority, byStatus, byPriority, progress, completedRows, upcoming, recentActivity] =
    await Promise.all([
      Project.countDocuments({ workspace }),
      Task.countDocuments({ workspace }),
      Task.countDocuments({ workspace, status: 'COMPLETED' }),
      Task.countDocuments({ workspace, status: open, dueDate: { $lt: now } }),
      Task.countDocuments({ workspace, assignedTo: user._id, status: open }),
      Task.countDocuments({ workspace, status: open, priority: { $in: ['HIGH', 'URGENT'] } }),
      group('status'),
      group('priority'),
      projectProgress(workspace),
      Task.find({ workspace, status: 'COMPLETED', completedAt: { $gte: new Date(Date.now() - 8 * 7 * DAY) } })
        .select('completedAt')
        .lean(),
      Task.find({ workspace, status: open, dueDate: { $ne: null } })
        .sort({ dueDate: 1 })
        .limit(6)
        .select('title dueDate priority status project assignedTo createdAt')
        .populate('assignedTo', 'name avatar')
        .populate('project', 'name color')
        .lean(),
      Task.find({ workspace })
        .distinct('_id')
        .then((ids) =>
          Activity.find({ task: { $in: ids } })
            .sort({ createdAt: -1 })
            .limit(8)
            .populate('actor', 'name avatar')
            .populate('task', 'title')
            .lean(),
        ),
    ]);

  const buckets = weeklyBuckets(8);
  return {
    stats: {
      totalProjects,
      totalTasks,
      completedTasks: completed,
      pendingTasks: totalTasks - completed,
      overdueTasks: overdue,
      assignedToMe,
      highPriorityTasks: highPriority,
      completionPercentage: totalTasks ? Math.round((completed / totalTasks) * 100) : 0,
    },
    charts: {
      tasksByStatus: countsToList(byStatus, TASK_STATUSES),
      tasksByPriority: countsToList(byPriority, PRIORITIES),
      weeklyCompleted: buckets.map((b) => ({
        week: b.week,
        completed: completedRows.filter((t) => t.completedAt! >= b.start && t.completedAt! < b.end).length,
      })),
      projectProgress: progress,
    },
    upcoming,
    recentActivity,
  };
}

export async function getProductivity(user: UserDoc) {
  const workspace = user.workspace;
  const now = new Date();
  const open = { $ne: 'COMPLETED' };
  const weekStart = startOfWeek(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const group = (field: string) => Task.aggregate([{ $match: { workspace } }, { $group: { _id: `$${field}`, count: { $sum: 1 } } }]);

  const [total, completed, overdue, thisWeek, thisMonth, avg, byStatus, byPriority, progress, recent] = await Promise.all([
    Task.countDocuments({ workspace }),
    Task.countDocuments({ workspace, status: 'COMPLETED' }),
    Task.countDocuments({ workspace, status: open, dueDate: { $lt: now } }),
    Task.countDocuments({ workspace, status: 'COMPLETED', completedAt: { $gte: weekStart } }),
    Task.countDocuments({ workspace, status: 'COMPLETED', completedAt: { $gte: monthStart } }),
    Task.aggregate([
      { $match: { workspace, status: 'COMPLETED', completedAt: { $ne: null } } },
      { $group: { _id: null, avgMs: { $avg: { $subtract: ['$completedAt', '$createdAt'] } } } },
    ]),
    group('status'),
    group('priority'),
    projectProgress(workspace),
    Task.find({ workspace, $or: [{ completedAt: { $gte: new Date(Date.now() - 8 * 7 * DAY) } }, { createdAt: { $gte: new Date(Date.now() - 8 * 7 * DAY) } }] })
      .select('completedAt createdAt')
      .lean(),
  ]);

  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);
  return {
    metrics: {
      completionRate: pct(completed),
      averageCompletionHours: avg[0] ? Math.round((avg[0].avgMs / 3_600_000) * 10) / 10 : 0,
      completedThisWeek: thisWeek,
      completedThisMonth: thisMonth,
      overduePercentage: pct(overdue),
    },
    charts: {
      productivityTrend: weeklyBuckets(8).map((b) => ({
        week: b.week,
        completed: recent.filter((t) => t.completedAt && t.completedAt >= b.start && t.completedAt < b.end).length,
        created: recent.filter((t) => t.createdAt >= b.start && t.createdAt < b.end).length,
      })),
      statusDistribution: countsToList(byStatus, TASK_STATUSES),
      priorityDistribution: countsToList(byPriority, PRIORITIES),
      projectCompletion: progress,
    },
  };
}
