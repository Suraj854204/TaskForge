import { Request, Response } from 'express';
import { Comment, Task } from '../models';
import { getTaskOr404 } from '../services/task.service';
import { notify } from '../services/notification.service';
import { ApiError } from '../utils/ApiError';
import { sendSuccess } from '../utils/http';

export async function addComment(req: Request, res: Response) {
  const user = req.user!;
  const task = await getTaskOr404(req.params.taskId, user.workspace);
  const comment = await Comment.create({ task: task._id, author: user._id, content: req.body.content });
  const recipients = new Set([String(task.createdBy), String(task.assignedTo ?? '')].filter(Boolean));
  await Promise.all(
    [...recipients].map((r) =>
      notify({
        recipient: r,
        actor: user._id,
        type: 'COMMENT',
        title: 'New comment',
        message: `${user.name} commented on "${task.title}"`,
        relatedTask: task._id,
      }),
    ),
  );
  sendSuccess(res, { comment: await comment.populate('author', 'name avatar') }, 'Comment added', 201);
}

export async function listComments(req: Request, res: Response) {
  const task = await getTaskOr404(req.params.taskId, req.user!.workspace);
  const comments = await Comment.find({ task: task._id }).sort({ createdAt: 1 }).populate('author', 'name avatar');
  sendSuccess(res, { comments });
}

async function ownComment(req: Request, allowAdmin: boolean) {
  const comment = await Comment.findById(req.params.id);
  if (!comment) throw new ApiError(404, 'Comment not found');
  const task = await Task.findOne({ _id: comment.task, workspace: req.user!.workspace });
  if (!task) throw new ApiError(404, 'Comment not found');
  const isAuthor = String(comment.author) === String(req.user!._id);
  if (!isAuthor && !(allowAdmin && req.user!.role === 'ADMIN')) {
    throw new ApiError(403, 'You can only modify your own comments');
  }
  return comment;
}

export async function editComment(req: Request, res: Response) {
  const comment = await ownComment(req, false);
  comment.content = req.body.content;
  await comment.save();
  sendSuccess(res, { comment: await comment.populate('author', 'name avatar') }, 'Comment updated');
}

export async function deleteComment(req: Request, res: Response) {
  const comment = await ownComment(req, true);
  await comment.deleteOne();
  sendSuccess(res, {}, 'Comment deleted');
}
