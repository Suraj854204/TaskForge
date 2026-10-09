import mongoose from 'mongoose';
import { connectDB } from './config/db';
import { Activity, Comment, Notification, Project, Task, User, Workspace } from './models';
import { hashPassword } from './services/auth.service';

const DAY = 86_400_000;
const daysFromNow = (n: number) => new Date(Date.now() + n * DAY);

async function seed() {
  await connectDB();
  await Promise.all([Activity, Comment, Notification, Project, Task, User, Workspace].map((m) => m.deleteMany({})));

  const passwordHash = await hashPassword('Password123');
  const [admin, priya, rahul] = await User.create([
    { name: 'Suraj Singh', email: 'admin@taskforge.dev', passwordHash, role: 'ADMIN' },
    { name: 'Priya Sharma', email: 'priya@taskforge.dev', passwordHash, role: 'MEMBER' },
    { name: 'Rahul Verma', email: 'rahul@taskforge.dev', passwordHash, role: 'MEMBER' },
  ]);
  const ws = await Workspace.create({
    name: 'Forge Labs',
    description: 'Demo workspace',
    owner: admin._id,
    members: [admin._id, priya._id, rahul._id],
  });
  await User.updateMany({ _id: { $in: [admin._id, priya._id, rahul._id] } }, { workspace: ws._id });

  const [web, api] = await Project.create([
    { name: 'Website Redesign', description: 'Refresh the marketing site', workspace: ws._id, owner: admin._id, members: [admin._id, priya._id], status: 'ACTIVE', color: '#2E6A9E', deadline: daysFromNow(30) },
    { name: 'Mobile API v2', description: 'Rebuild the public REST API', workspace: ws._id, owner: admin._id, members: [admin._id, rahul._id, priya._id], status: 'PLANNING', color: '#C98A2B', deadline: daysFromNow(60) },
  ]);

  type Seed = [string, any, string, string, any, number | null, string[], number];
  const defs: Seed[] = [
    ['Design new landing page', web, 'COMPLETED', 'HIGH', priya, -5, ['design', 'ui'], 8],
    ['Write homepage copy', web, 'COMPLETED', 'MEDIUM', admin, -3, ['content'], 4],
    ['Implement responsive navbar', web, 'IN_REVIEW', 'MEDIUM', priya, 2, ['frontend'], 5],
    ['Optimize image loading', web, 'IN_PROGRESS', 'HIGH', rahul, 1, ['performance'], 6],
    ['Set up analytics tracking', web, 'TODO', 'LOW', priya, 10, ['analytics'], 3],
    ['Fix contact form validation', web, 'TODO', 'URGENT', admin, -2, ['bug', 'forms'], 2],
    ['Define API versioning strategy', api, 'COMPLETED', 'HIGH', rahul, -7, ['architecture'], 6],
    ['Design authentication endpoints', api, 'IN_PROGRESS', 'URGENT', rahul, 3, ['auth', 'backend'], 10],
    ['Write OpenAPI specification', api, 'IN_PROGRESS', 'MEDIUM', admin, 7, ['docs'], 8],
    ['Add rate limiting middleware', api, 'TODO', 'HIGH', rahul, 5, ['security'], 4],
    ['Set up CI pipeline', api, 'IN_REVIEW', 'MEDIUM', priya, 4, ['devops'], 6],
    ['Load test staging environment', api, 'TODO', 'LOW', null, 20, ['testing'], 12],
    ['Migrate legacy user table', api, 'TODO', 'HIGH', rahul, -1, ['database'], 9],
    ['Review security checklist', api, 'COMPLETED', 'MEDIUM', admin, -10, ['security'], 3],
  ];

  const tasks = [];
  for (const [title, project, status, priority, assignee, due, tags, est] of defs) {
    const createdAt = daysFromNow(-14 + Math.floor(Math.random() * 6));
    const t = await Task.create({
      title, project: project._id, workspace: ws._id, createdBy: admin._id,
      assignedTo: assignee?._id ?? null, status, priority, tags, estimatedHours: est,
      description: `${title} for ${project.name}.`,
      dueDate: due === null ? null : daysFromNow(due),
      completedAt: status === 'COMPLETED' ? daysFromNow(-Math.floor(Math.random() * 12)) : null,
      createdAt,
    });
    tasks.push(t);
    await Activity.create({ task: t._id, actor: admin._id, action: 'CREATED', message: `${admin.name} created this task` });
    if (assignee) {
      await Activity.create({ task: t._id, actor: admin._id, action: 'ASSIGNED', message: `${admin.name} assigned the task to ${assignee.name}` });
    }
    if (status !== 'TODO') {
      await Activity.create({ task: t._id, actor: assignee?._id ?? admin._id, action: 'STATUS_CHANGED', message: `${assignee?.name ?? admin.name} changed status from TODO to ${status.replace('_', ' ')}` });
    }
  }

  await Comment.create([
    { task: tasks[2]._id, author: priya._id, content: 'Mobile menu is done, ready for review.' },
    { task: tasks[2]._id, author: admin._id, content: 'Looks good — checking the tablet breakpoint.' },
    { task: tasks[7]._id, author: rahul._id, content: 'Using JWT with 7 day expiry. Thoughts on refresh tokens?' },
    { task: tasks[7]._id, author: admin._id, content: "Let's ship access tokens first, refresh later." },
    { task: tasks[5]._id, author: admin._id, content: 'This is blocking the launch, please prioritize.' },
  ]);

  await Notification.create([
    { recipient: priya._id, type: 'TASK_ASSIGNED', title: 'New task assigned', message: `${admin.name} assigned you "Implement responsive navbar"`, relatedTask: tasks[2]._id },
    { recipient: rahul._id, type: 'TASK_ASSIGNED', title: 'New task assigned', message: `${admin.name} assigned you "Design authentication endpoints"`, relatedTask: tasks[7]._id },
    { recipient: admin._id, type: 'COMMENT', title: 'New comment', message: 'Rahul Verma commented on "Design authentication endpoints"', relatedTask: tasks[7]._id },
    { recipient: admin._id, type: 'TASK_COMPLETED', title: 'Task completed', message: 'Priya Sharma completed "Design new landing page"', relatedTask: tasks[0]._id, read: true },
    { recipient: rahul._id, type: 'PROJECT_ADDED', title: 'Added to a project', message: `${admin.name} added you to "Mobile API v2"`, relatedProject: api._id },
  ]);

  console.log('Seed complete. Login with admin@taskforge.dev / Password123 (also priya@ and rahul@taskforge.dev)');
  await mongoose.disconnect();
}

seed().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
