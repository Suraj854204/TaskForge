import { Request, Response } from 'express';
import { Activity } from '../models';
import { createTask, deleteTask, getTaskOr404, listTasks, TASK_POPULATE, updateTask } from '../services/task.service';
import { sendSuccess } from '../utils/http';

export async function create(req: Request, res: Response) {
  sendSuccess(res, { task: await createTask(req.user!, req.body) }, 'Task created successfully', 201);
}
export async function list(req: Request, res: Response) {
  sendSuccess(res, await listTasks(req.user!, req.query));
}
export async function getOne(req: Request, res: Response) {
  const task = await (await getTaskOr404(req.params.id, req.user!.workspace)).populate(TASK_POPULATE);
  const activities = await Activity.find({ task: task._id }).sort({ createdAt: -1 }).populate('actor', 'name avatar');
  sendSuccess(res, { task, activities });
}
export async function update(req: Request, res: Response) {
  sendSuccess(res, { task: await updateTask(req.user!, req.params.id, req.body) }, 'Task updated successfully');
}
export async function remove(req: Request, res: Response) {
  await deleteTask(req.user!, req.params.id);
  sendSuccess(res, {}, 'Task deleted successfully');
}
