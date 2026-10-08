import { Schema, model } from 'mongoose';
import { NOTIFICATION_TYPES } from '../types';

const notificationSchema = new Schema(
  {
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    relatedTask: { type: Schema.Types.ObjectId, ref: 'Task', default: null },
    relatedProject: { type: Schema.Types.ObjectId, ref: 'Project', default: null },
  },
  { timestamps: true },
);
notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

export const Notification = model('Notification', notificationSchema);
