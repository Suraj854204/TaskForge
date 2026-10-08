import { z } from 'zod';
import { PRIORITIES, PROJECT_STATUSES, ROLES, TASK_STATUSES } from '../types';

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const optionalDate = z.preprocess(
  (v) => (v === '' || v === undefined ? undefined : v),
  z.union([z.null(), z.coerce.date()]).optional(),
);

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password is too long')
  .regex(/[A-Za-z]/, 'Password needs a letter')
  .regex(/\d/, 'Password needs a number');

const email = z.string().trim().toLowerCase().email('Enter a valid email');

// ---- auth / users ----
export const registerSchema = z.object({
  name: z.string().trim().min(2).max(60),
  email,
  password,
  workspaceName: z.string().trim().min(2).max(80).optional(),
});
export const loginSchema = z.object({ email, password: z.string().min(1, 'Password is required') });
export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  avatar: z.union([z.literal(''), z.string().url().max(500)]).optional(),
});
export const changePasswordSchema = z.object({ currentPassword: z.string().min(1), newPassword: password });

// ---- workspace ----
export const workspaceSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional(),
});
export const updateWorkspaceSchema = workspaceSchema.partial();
export const addMemberSchema = z.object({
  name: z.string().trim().min(2).max(60),
  email,
  password,
  role: z.enum(ROLES).default('MEMBER'),
});
export const changeRoleSchema = z.object({ role: z.enum(ROLES) });

// ---- projects ----
export const projectSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(1000).optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex color').optional(),
  deadline: optionalDate,
  members: z.array(objectId).max(100).optional(),
});
export const updateProjectSchema = projectSchema.partial();

// ---- tasks ----
export const taskSchema = z.object({
  title: z.string().trim().min(3, 'Title needs at least 3 characters').max(120),
  description: z.string().trim().max(2000).optional(),
  project: objectId,
  assignedTo: z.union([objectId, z.null()]).optional(),
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  dueDate: optionalDate,
  tags: z.array(z.string().trim().min(1).max(30)).max(10).optional(),
  estimatedHours: z.number().min(0).max(1000).nullable().optional(),
  actualHours: z.number().min(0).max(1000).nullable().optional(),
});
export const updateTaskSchema = taskSchema.omit({ project: true }).partial();
export const taskQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(10),
  search: z.string().trim().max(100).optional(),
  project: objectId.optional(),
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  assignedTo: z.union([objectId, z.literal('me')]).optional(),
  dueBefore: z.coerce.date().optional(),
  dueAfter: z.coerce.date().optional(),
  sort: z.enum(['newest', 'oldest', 'priority', 'deadline']).default('newest'),
});

// ---- comments / ai ----
export const commentSchema = z.object({ content: z.string().trim().min(1, 'Comment cannot be empty').max(1000) });
export const aiPromptSchema = z.object({ prompt: z.string().trim().min(5, 'Describe the task in a few words').max(500) });
