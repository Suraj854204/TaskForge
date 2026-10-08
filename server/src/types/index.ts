export const ROLES = ['ADMIN', 'MEMBER'] as const;
export const PROJECT_STATUSES = ['PLANNING', 'ACTIVE', 'COMPLETED', 'ARCHIVED'] as const;
export const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED'] as const;
export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
export const NOTIFICATION_TYPES = ['TASK_ASSIGNED', 'COMMENT', 'DEADLINE', 'TASK_COMPLETED', 'PROJECT_ADDED'] as const;

export type Role = (typeof ROLES)[number];
export type TaskStatus = (typeof TASK_STATUSES)[number];
export type Priority = (typeof PRIORITIES)[number];

export const PRIORITY_RANK: Record<Priority, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, URGENT: 4 };
