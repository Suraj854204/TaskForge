import { Types } from 'mongoose';
import { Activity, Notification } from '../models';
import { NOTIFICATION_TYPES } from '../types';

type Id = Types.ObjectId | string;

export async function notify(p: {
  recipient: Id;
  actor?: Id;
  type: (typeof NOTIFICATION_TYPES)[number];
  title: string;
  message: string;
  relatedTask?: Id | null;
  relatedProject?: Id | null;
}) {
  if (p.actor && String(p.actor) === String(p.recipient)) return; // never notify yourself
  await Notification.create({
    recipient: p.recipient,
    type: p.type,
    title: p.title,
    message: p.message,
    relatedTask: p.relatedTask ?? null,
    relatedProject: p.relatedProject ?? null,
  });
}

export const logActivity = (task: Id, actor: Id, action: string, message: string) =>
  Activity.create({ task, actor, action, message });
