import { Request, Response } from 'express';
import { Project, Task, User } from '../models';
import { deleteTasks } from '../services/task.service';
import { notify } from '../services/notification.service';
import { ApiError } from '../utils/ApiError';
import { sendSuccess } from '../utils/http';

const POPULATE = [
  { path: 'owner', select: 'name email avatar' },
  { path: 'members', select: 'name email avatar role' },
];

async function progressFor(ids: unknown[]) {
  const rows = await Task.aggregate([
    { $match: { project: { $in: ids } } },
    { $group: { _id: { p: '$project', done: { $eq: ['$status', 'COMPLETED'] } }, c: { $sum: 1 } } },
  ]);
  return (id: unknown) => {
    const mine = rows.filter((r) => String(r._id.p) === String(id));
    const taskCount = mine.reduce((s, r) => s + r.c, 0);
    const completedCount = mine.filter((r) => r._id.done).reduce((s, r) => s + r.c, 0);
    return { taskCount, completedCount, progress: taskCount ? Math.round((completedCount / taskCount) * 100) : 0 };
  };
}

async function assertMembers(ids: string[], workspace: unknown) {
  if (ids.length && (await User.countDocuments({ _id: { $in: ids }, workspace })) !== new Set(ids).size) {
    throw new ApiError(400, 'All project members must belong to your workspace');
  }
}

async function loadProject(req: Request) {
  const project = await Project.findOne({ _id: req.params.id, workspace: req.user!.workspace });
  if (!project) throw new ApiError(404, 'Project not found');
  return project;
}

function assertCanManage(req: Request, project: { owner: unknown }) {
  if (req.user!.role !== 'ADMIN' && String(project.owner) !== String(req.user!._id)) {
    throw new ApiError(403, 'Only admins or the project owner can do this');
  }
}

export async function createProject(req: Request, res: Response) {
  const user = req.user!;
  const members = [...new Set([String(user._id), ...(req.body.members ?? [])])];
  await assertMembers(members, user.workspace);
  const project = await Project.create({ ...req.body, members, workspace: user.workspace, owner: user._id });
  await Promise.all(
    members.map((m) =>
      notify({
        recipient: m,
        actor: user._id,
        type: 'PROJECT_ADDED',
        title: 'Added to a project',
        message: `${user.name} added you to "${project.name}"`,
        relatedProject: project._id,
      }),
    ),
  );
  sendSuccess(res, { project: await project.populate(POPULATE) }, 'Project created successfully', 201);
}

export async function listProjects(req: Request, res: Response) {
  const filter: Record<string, unknown> = { workspace: req.user!.workspace };
  if (typeof req.query.status === 'string') filter.status = req.query.status;
  const projects = await Project.find(filter).sort({ createdAt: -1 }).populate(POPULATE);
  const prog = await progressFor(projects.map((p) => p._id));
  sendSuccess(res, { projects: projects.map((p) => ({ ...p.toJSON(), ...prog(p._id) })) });
}

export async function getProject(req: Request, res: Response) {
  const project = await (await loadProject(req)).populate(POPULATE);
  const prog = await progressFor([project._id]);
  sendSuccess(res, { project: { ...project.toJSON(), ...prog(project._id) } });
}

export async function updateProject(req: Request, res: Response) {
  const project = await loadProject(req);
  assertCanManage(req, project);
  const before = project.members.map(String);
  if (req.body.members) {
    req.body.members = [...new Set([String(project.owner), ...req.body.members])];
    await assertMembers(req.body.members, req.user!.workspace);
  }
  project.set(req.body);
  await project.save();
  for (const m of (req.body.members ?? []).filter((m: string) => !before.includes(m))) {
    await notify({
      recipient: m,
      actor: req.user!._id,
      type: 'PROJECT_ADDED',
      title: 'Added to a project',
      message: `${req.user!.name} added you to "${project.name}"`,
      relatedProject: project._id,
    });
  }
  sendSuccess(res, { project: await project.populate(POPULATE) }, 'Project updated successfully');
}

export async function deleteProject(req: Request, res: Response) {
  const project = await loadProject(req);
  assertCanManage(req, project);
  await deleteTasks({ project: project._id });
  await project.deleteOne();
  sendSuccess(res, {}, 'Project deleted successfully');
}
