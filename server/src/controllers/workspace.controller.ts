import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Comment, Notification, Project, Task, User, Workspace, Activity } from '../models';
import { hashPassword, publicUser } from '../services/auth.service';
import { ApiError } from '../utils/ApiError';
import { sendSuccess } from '../utils/http';

async function ownWorkspace(req: Request) {
  if (String(req.user!.workspace) !== req.params.id) throw new ApiError(403, 'You are not a member of this workspace');
  const ws = await Workspace.findById(req.params.id);
  if (!ws) throw new ApiError(404, 'Workspace not found');
  return ws;
}

export async function createWorkspace(req: Request, res: Response) {
  const user = req.user!;
  if (user.workspace) throw new ApiError(409, 'You already belong to a workspace');
  const ws = await Workspace.create({ ...req.body, owner: user._id, members: [user._id] });
  user.workspace = ws._id;
  user.role = 'ADMIN';
  await user.save();
  sendSuccess(res, { workspace: ws, user: await publicUser(user._id) }, 'Workspace created', 201);
}

export async function getWorkspace(req: Request, res: Response) {
  sendSuccess(res, { workspace: await ownWorkspace(req) });
}

export async function updateWorkspace(req: Request, res: Response) {
  const ws = await ownWorkspace(req);
  ws.set(req.body);
  await ws.save();
  sendSuccess(res, { workspace: ws }, 'Workspace updated');
}

export async function deleteWorkspace(req: Request, res: Response) {
  const ws = await ownWorkspace(req);
  if (String(ws.owner) !== String(req.user!._id)) throw new ApiError(403, 'Only the workspace owner can delete it');
  const taskIds = await Task.find({ workspace: ws._id }).distinct('_id');
  await Promise.all([
    Comment.deleteMany({ task: { $in: taskIds } }),
    Activity.deleteMany({ task: { $in: taskIds } }),
    Notification.deleteMany({ relatedTask: { $in: taskIds } }),
    Task.deleteMany({ workspace: ws._id }),
    Project.deleteMany({ workspace: ws._id }),
    User.updateMany({ workspace: ws._id }, { workspace: null, role: 'MEMBER' }),
  ]);
  await ws.deleteOne();
  sendSuccess(res, {}, 'Workspace deleted');
}

export async function listMembers(req: Request, res: Response) {
  const ws = await ownWorkspace(req);
  const members = await User.find({ _id: { $in: ws.members } })
    .select('name email avatar role createdAt')
    .sort({ name: 1 });
  sendSuccess(res, { members, ownerId: ws.owner });
}

export async function addMember(req: Request, res: Response) {
  const ws = await ownWorkspace(req);
  const { name, email, password, role } = req.body;
  let member = await User.findOne({ email });
  if (member) {
    if (member.workspace) throw new ApiError(409, 'That user already belongs to a workspace');
    member.workspace = ws._id;
    member.role = role;
    await member.save();
  } else {
    member = await User.create({ name, email, passwordHash: await hashPassword(password), role, workspace: ws._id });
  }
  ws.members.push(member._id);
  await ws.save();
  sendSuccess(res, { member }, 'Member added', 201);
}

export async function changeMemberRole(req: Request, res: Response) {
  const ws = await ownWorkspace(req);
  if (String(ws.owner) === req.params.userId) throw new ApiError(400, "The owner's role cannot be changed");
  const member = await User.findOne({ _id: req.params.userId, workspace: ws._id });
  if (!member) throw new ApiError(404, 'Member not found');
  member.role = req.body.role;
  await member.save();
  sendSuccess(res, { member }, 'Role updated');
}

export async function removeMember(req: Request, res: Response) {
  const ws = await ownWorkspace(req);
  const { userId } = req.params;
  if (String(ws.owner) === userId) throw new ApiError(400, 'The workspace owner cannot be removed');
  const member = await User.findOne({ _id: userId, workspace: ws._id });
  if (!member) throw new ApiError(404, 'Member not found');
  member.workspace = null;
  member.role = 'MEMBER';
  await member.save();
  ws.members = ws.members.filter((m) => String(m) !== userId) as Types.DocumentArray<Types.ObjectId>;
  await ws.save();
  await Promise.all([
    Task.updateMany({ workspace: ws._id, assignedTo: userId }, { assignedTo: null }),
    Project.updateMany({ workspace: ws._id }, { $pull: { members: member._id } }),
  ]);
  sendSuccess(res, {}, 'Member removed');
}
