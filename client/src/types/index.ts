export type Role = 'ADMIN' | 'MEMBER';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type ProjectStatus = 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';

export interface UserLite { _id: string; name: string; email?: string; avatar?: string; role?: Role }
export interface User extends UserLite {
  email: string;
  role: Role;
  workspace: { _id: string; name: string; description?: string } | null;
  createdAt: string;
}
export interface Project {
  _id: string; name: string; description: string; status: ProjectStatus; color: string; deadline: string | null;
  owner: UserLite; members: UserLite[]; progress: number; taskCount: number; completedCount: number;
}
export interface Task {
  _id: string; title: string; description: string; status: TaskStatus; priority: Priority;
  project: { _id: string; name: string; color: string }; assignedTo: UserLite | null; createdBy: UserLite;
  dueDate: string | null; tags: string[]; estimatedHours: number | null; actualHours: number | null;
  createdAt: string; completedAt: string | null; subtasks: { title: string; done: boolean }[];
}
export interface Comment { _id: string; content: string; author: UserLite; createdAt: string; updatedAt: string }
export interface Activity { _id: string; message: string; action: string; actor: UserLite; createdAt: string }
export interface NotificationItem {
  _id: string; type: string; title: string; message: string; read: boolean; relatedTask: string | null; createdAt: string;
}
export interface Paginated<T> { items: T[]; pagination: { page: number; limit: number; total: number; pages: number } }
