import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';

const app = createApp();
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

async function registerAdmin(email = 'admin@test.dev') {
  const res = await request(app).post('/api/auth/register').send({ name: 'Admin User', email, password: 'Password123' });
  return res.body.data as { token: string; user: any };
}

/** Admin + workspace + project + one member who has logged in. */
async function setup() {
  const admin = await registerAdmin();
  const wsId = admin.user.workspace._id;
  const project = (await request(app).post('/api/projects').set(auth(admin.token)).send({ name: 'Test Project' })).body.data.project;
  await request(app)
    .post(`/api/workspaces/${wsId}/members`)
    .set(auth(admin.token))
    .send({ name: 'Member One', email: 'member@test.dev', password: 'Password123', role: 'MEMBER' });
  const member = (await request(app).post('/api/auth/login').send({ email: 'member@test.dev', password: 'Password123' })).body.data;
  return { admin, member, wsId, project };
}

describe('auth', () => {
  it('registers a user without leaking the password hash', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'Jane Doe', email: 'jane@test.dev', password: 'Password123' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(res.body.data.user.role).toBe('ADMIN');
  });

  it('rejects duplicate emails and invalid input', async () => {
    await registerAdmin();
    expect((await request(app).post('/api/auth/register').send({ name: 'Dup', email: 'admin@test.dev', password: 'Password123' })).status).toBe(409);
    const bad = await request(app).post('/api/auth/register').send({ name: 'X', email: 'nope', password: 'short' });
    expect(bad.status).toBe(400);
    expect(bad.body.success).toBe(false);
    expect(bad.body.errors.length).toBeGreaterThan(0);
  });

  it('logs in with correct credentials only', async () => {
    await registerAdmin();
    const ok = await request(app).post('/api/auth/login').send({ email: 'admin@test.dev', password: 'Password123' });
    expect(ok.status).toBe(200);
    const bad = await request(app).post('/api/auth/login').send({ email: 'admin@test.dev', password: 'WrongPass1' });
    expect(bad.status).toBe(401);
  });

  it('protects /auth/me', async () => {
    expect((await request(app).get('/api/auth/me')).status).toBe(401);
    expect((await request(app).get('/api/auth/me').set(auth('garbage'))).status).toBe(401);
    const { token } = await registerAdmin();
    const res = await request(app).get('/api/auth/me').set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('admin@test.dev');
  });
});

describe('tasks', () => {
  it('creates, updates (with activity log) and deletes a task', async () => {
    const { admin, project } = await setup();
    const created = await request(app)
      .post('/api/tasks')
      .set(auth(admin.token))
      .send({ title: 'Write tests', project: project._id, priority: 'HIGH', tags: ['qa'] });
    expect(created.status).toBe(201);
    const id = created.body.data.task._id;

    const updated = await request(app).patch(`/api/tasks/${id}`).set(auth(admin.token)).send({ status: 'COMPLETED' });
    expect(updated.status).toBe(200);
    expect(updated.body.data.task.status).toBe('COMPLETED');
    expect(updated.body.data.task.completedAt).toBeTruthy();

    const detail = await request(app).get(`/api/tasks/${id}`).set(auth(admin.token));
    expect(detail.body.data.activities.length).toBeGreaterThanOrEqual(2);

    expect((await request(app).delete(`/api/tasks/${id}`).set(auth(admin.token))).status).toBe(200);
    expect((await request(app).get(`/api/tasks/${id}`).set(auth(admin.token))).status).toBe(404);
  });

  it('validates input and supports filtering + pagination', async () => {
    const { admin, project } = await setup();
    const bad = await request(app).post('/api/tasks').set(auth(admin.token)).send({ title: 'ab', project: project._id });
    expect(bad.status).toBe(400);
    for (const [title, priority] of [['Alpha task', 'HIGH'], ['Beta task', 'LOW'], ['Gamma task', 'HIGH']]) {
      await request(app).post('/api/tasks').set(auth(admin.token)).send({ title, project: project._id, priority });
    }
    const res = await request(app).get('/api/tasks?priority=HIGH&limit=1&page=1').set(auth(admin.token));
    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.pagination.total).toBe(2);
    const search = await request(app).get('/api/tasks?search=beta').set(auth(admin.token));
    expect(search.body.data.items).toHaveLength(1);
  });
});

describe('authorization', () => {
  it('blocks members from admin-only workspace actions', async () => {
    const { member, wsId } = await setup();
    const res = await request(app)
      .post(`/api/workspaces/${wsId}/members`)
      .set(auth(member.token))
      .send({ name: 'Sneaky', email: 'sneaky@test.dev', password: 'Password123' });
    expect(res.status).toBe(403);
  });

  it("stops members from deleting or editing tasks they don't own", async () => {
    const { admin, member, project } = await setup();
    const task = (await request(app).post('/api/tasks').set(auth(admin.token)).send({ title: 'Admin task', project: project._id })).body.data.task;
    expect((await request(app).delete(`/api/tasks/${task._id}`).set(auth(member.token))).status).toBe(403);
    expect((await request(app).patch(`/api/tasks/${task._id}`).set(auth(member.token)).send({ priority: 'LOW' })).status).toBe(403);
  });

  it('isolates data between workspaces', async () => {
    const { admin, project } = await setup();
    const other = await registerAdmin('other@test.dev');
    const task = (await request(app).post('/api/tasks').set(auth(admin.token)).send({ title: 'Private task', project: project._id })).body.data.task;
    expect((await request(app).get(`/api/tasks/${task._id}`).set(auth(other.token))).status).toBe(404);
  });
});

describe('notifications & analytics', () => {
  it('notifies an assignee and reports real dashboard numbers', async () => {
    const { admin, member, project } = await setup();
    await request(app).post('/api/tasks').set(auth(admin.token)).send({ title: 'Assigned task', project: project._id, assignedTo: member.user._id });
    const notes = await request(app).get('/api/notifications').set(auth(member.token));
    expect(notes.body.data.unreadCount).toBeGreaterThanOrEqual(1);
    const dash = await request(app).get('/api/analytics/dashboard').set(auth(admin.token));
    expect(dash.status).toBe(200);
    expect(dash.body.data.stats.totalTasks).toBe(1);
  });

  it('returns 503 from the AI assistant when no key is configured', async () => {
    const { admin } = await setup();
    const res = await request(app).post('/api/ai/task-assistant').set(auth(admin.token)).send({ prompt: 'Build authentication system' });
    expect(res.status).toBe(503);
  });
});

describe('subtasks & quick filters', () => {
  it('stores subtasks and filters overdue / unassigned tasks', async () => {
    const { admin, project } = await setup();
    const yesterday = new Date(Date.now() - 86_400_000).toISOString();
    const created = await request(app)
      .post('/api/tasks')
      .set(auth(admin.token))
      .send({ title: 'Late task', project: project._id, dueDate: yesterday, subtasks: [{ title: 'Step one' }, { title: 'Step two', done: true }] });
    expect(created.status).toBe(201);
    expect(created.body.data.task.subtasks).toHaveLength(2);
    await request(app).post('/api/tasks').set(auth(admin.token)).send({ title: 'On time task', project: project._id });

    const overdue = await request(app).get('/api/tasks?overdue=true').set(auth(admin.token));
    expect(overdue.body.data.items.map((t: any) => t.title)).toEqual(['Late task']);
    const unassigned = await request(app).get('/api/tasks?unassigned=true').set(auth(admin.token));
    expect(unassigned.body.data.pagination.total).toBe(2);
  });
});
