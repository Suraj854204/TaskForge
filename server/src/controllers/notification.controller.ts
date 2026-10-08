import { Request, Response } from 'express';
import { Notification, Task, UserDoc } from '../models';
import { ApiError } from '../utils/ApiError';
import { sendSuccess } from '../utils/http';

/** Creates a DEADLINE notification (once per task) for open tasks assigned to the user that are due within 2 days. */
async function syncDeadlineNotifications(user: UserDoc) {
  if (!user.workspace) return;
  const now = new Date();
  const tasks = await Task.find({
    workspace: user.workspace,
    assignedTo: user._id,
    status: { $ne: 'COMPLETED' },
    dueDate: { $gte: now, $lte: new Date(now.getTime() + 2 * 86_400_000) },
  })
    .select('title dueDate')
    .lean();
  for (const t of tasks) {
    const exists = await Notification.exists({ recipient: user._id, type: 'DEADLINE', relatedTask: t._id });
    if (!exists) {
      await Notification.create({
        recipient: user._id,
        type: 'DEADLINE',
        title: 'Deadline approaching',
        message: `"${t.title}" is due ${t.dueDate!.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        relatedTask: t._id,
      });
    }
  }
}

export async function list(req: Request, res: Response) {
  const user = req.user!;
  await syncDeadlineNotifications(user);
  const [notifications, unreadCount] = await Promise.all([
    Notification.find({ recipient: user._id }).sort({ createdAt: -1 }).limit(50),
    Notification.countDocuments({ recipient: user._id, read: false }),
  ]);
  sendSuccess(res, { notifications, unreadCount });
}

export async function markRead(req: Request, res: Response) {
  const n = await Notification.findOneAndUpdate({ _id: req.params.id, recipient: req.user!._id }, { read: true }, { new: true });
  if (!n) throw new ApiError(404, 'Notification not found');
  sendSuccess(res, { notification: n }, 'Marked as read');
}

export async function markAllRead(req: Request, res: Response) {
  await Notification.updateMany({ recipient: req.user!._id, read: false }, { read: true });
  sendSuccess(res, {}, 'All notifications marked as read');
}
