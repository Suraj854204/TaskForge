import { Types } from 'mongoose';
import { Activity, Comment, Notification, Project, Task, User, UserDoc } from '../models';
import { ApiError } from '../utils/ApiError';
import { escapeRegex } from '../utils/http';
import { logActivity, notify } from './notification.service';
import { emitToWorkspace } from './realtime';

export const TASK_POPULATE = [
  { path: 'assignedTo', select: 'name email avatar' },
  { path: 'createdBy', select: 'name email avatar' },
  { path: 'project', select: 'name color' },
];

const same = (a: unknown, b: unknown) => String(a ?? '') === String(b ?? '');
const label = (s: string) => s.replace('_', ' ');

async function assertAssignee(userId: string, workspace: unknown) {
  if (!(await User.exists({ _id: userId, workspace }))) {
    throw new ApiError(400, 'Assignee must belong to your workspace');
  }
}

export async function getTaskOr404(id: string, workspace: unknown) {
  const task = await Task.findOne({ _id: id, workspace });
  if (!task) throw new ApiError(404, 'Task not found');
  return task;
}

export async function createTask(user: UserDoc, input: any) {
  const project = await Project.findOne({ _id: input.project, workspace: user.workspace });
  if (!project) throw new ApiError(404, 'Project not found');
  if (input.assignedTo) await assertAssignee(input.assignedTo, user.workspace);

  const task = await Task.create({
    ...input,
    workspace: user.workspace,
    createdBy: user._id,
    completedAt: input.status === 'COMPLETED' ? new Date() : null,
  });
  await logActivity(task._id, user._id, 'CREATED', `${user.name} created this task`);

  if (input.assignedTo) {
    const assignee = await User.findById(input.assignedTo).select('name');
    await logActivity(task._id, user._id, 'ASSIGNED', `${user.name} assigned the task to ${assignee?.name}`);
    await notify({
      recipient: input.assignedTo,
      actor: user._id,
      type: 'TASK_ASSIGNED',
      title: 'New task assigned',
      message: `${user.name} assigned you "${task.title}"`,
      relatedTask: task._id,
    });
  }
  emitToWorkspace(user.workspace, 'tasks:changed', { taskId: String(task._id), projectId: String(task.project) });
  return task.populate(TASK_POPULATE);
}

export async function updateTask(user: UserDoc, taskId: string, patch: any) {
  const task = await getTaskOr404(taskId, user.workspace);
  const canEdit =
    user.role === 'ADMIN' || same(task.createdBy, user._id) || (task.assignedTo && same(task.assignedTo, user._id));
  if (!canEdit) throw new ApiError(403, 'Only admins, the creator or the assignee can edit this task');

  if (patch.status && patch.status !== task.status) {
    await logActivity(
      task._id,
      user._id,
      'STATUS_CHANGED',
      `${user.name} changed status from ${label(task.status)} to ${label(patch.status)}`,
    );
    if (patch.status === 'COMPLETED') {
      task.completedAt = new Date();
      await logActivity(task._id, user._id, 'COMPLETED', `${user.name} completed this task`);
      await notify({
        recipient: task.createdBy,
        actor: user._id,
        type: 'TASK_COMPLETED',
        title: 'Task completed',
        message: `${user.name} completed "${task.title}"`,
        relatedTask: task._id,
      });
    } else {
      task.completedAt = null;
    }
  }
  if (patch.priority && patch.priority !== task.priority) {
    await logActivity(
      task._id,
      user._id,
      'PRIORITY_CHANGED',
      `${user.name} changed priority from ${task.priority} to ${patch.priority}`,
    );
  }
  if (patch.assignedTo !== undefined && !same(patch.assignedTo, task.assignedTo)) {
    if (patch.assignedTo) {
      await assertAssignee(patch.assignedTo, user.workspace);
      const assignee = await User.findById(patch.assignedTo).select('name');
      await logActivity(task._id, user._id, 'ASSIGNED', `${user.name} assigned the task to ${assignee?.name}`);
      await notify({
        recipient: patch.assignedTo,
        actor: user._id,
        type: 'TASK_ASSIGNED',
        title: 'New task assigned',
        message: `${user.name} assigned you "${task.title}"`,
        relatedTask: task._id,
      });
    } else {
      await logActivity(task._id, user._id, 'ASSIGNED', `${user.name} unassigned the task`);
    }
  }
  if (patch.dueDate !== undefined && !same(patch.dueDate && new Date(patch.dueDate).getTime(), task.dueDate?.getTime())) {
    await logActivity(task._id, user._id, 'DUE_DATE_CHANGED', `${user.name} updated the deadline`);
  }
  if (patch.title && patch.title !== task.title) {
    await logActivity(task._id, user._id, 'UPDATED', `${user.name} renamed the task to "${patch.title}"`);
  }

  task.set(patch);
  await task.save();
  emitToWorkspace(user.workspace, 'tasks:changed', { taskId: String(task._id), projectId: String(task.project) });
  return task.populate(TASK_POPULATE);
}

export async function deleteTasks(filter: Record<string, unknown>) {
  const ids = await Task.find(filter).distinct('_id');
  if (!ids.length) return 0;
  await Promise.all([
    Comment.deleteMany({ task: { $in: ids } }),
    Activity.deleteMany({ task: { $in: ids } }),
    Notification.deleteMany({ relatedTask: { $in: ids } }),
  ]);
  await Task.deleteMany({ _id: { $in: ids } });
  return ids.length;
}

export async function deleteTask(user: UserDoc, taskId: string) {
  const task = await getTaskOr404(taskId, user.workspace);
  if (user.role !== 'ADMIN' && !same(task.createdBy, user._id)) {
    throw new ApiError(403, 'Only admins or the creator can delete this task');
  }
  await deleteTasks({ _id: task._id });
  emitToWorkspace(user.workspace, 'tasks:changed', { taskId: String(task._id), projectId: String(task.project) });
}

const SORTS: Record<string, Record<string, 1 | -1>> = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  priority: { priorityRank: -1, createdAt: -1 },
  deadline: { dueSort: 1, createdAt: -1 },
};

export async function listTasks(user: UserDoc, q: any) {
  const filter: Record<string, any> = { workspace: user.workspace };
  if (q.project) filter.project = q.project;
  if (q.status) filter.status = q.status;
  if (q.priority) filter.priority = q.priority;
  if (q.assignedTo) filter.assignedTo = q.assignedTo === 'me' ? user._id : q.assignedTo;
  if (q.dueBefore || q.dueAfter) {
    filter.dueDate = {};
    if (q.dueAfter) filter.dueDate.$gte = q.dueAfter;
    if (q.dueBefore) filter.dueDate.$lte = q.dueBefore;
  }
  if (q.overdue) {
    filter.dueDate = { ...(filter.dueDate ?? {}), $lt: new Date() };
    if (!q.status) filter.status = { $ne: 'COMPLETED' };
  }
  if (q.unassigned) filter.assignedTo = null;
  if (q.search) {
    const rx = new RegExp(escapeRegex(q.search), 'i');
    filter.$or = [{ title: rx }, { description: rx }, { tags: rx }];
  }
  const [items, total] = await Promise.all([
    Task.find(filter)
      .sort(SORTS[q.sort])
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .populate(TASK_POPULATE),
    Task.countDocuments(filter),
  ]);
  return { items, pagination: { page: q.page, limit: q.limit, total, pages: Math.max(1, Math.ceil(total / q.limit)) } };
}

export const toId = (v: unknown) => new Types.ObjectId(String(v));
