import { Schema, model } from 'mongoose';
import { PRIORITIES, PRIORITY_RANK, TASK_STATUSES } from '../types';

const FAR_FUTURE = new Date('9999-12-31T00:00:00.000Z');

const taskSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 120 },
    description: { type: String, default: '', maxlength: 2000 },
    project: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    workspace: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    status: { type: String, enum: TASK_STATUSES, default: 'TODO' },
    priority: { type: String, enum: PRIORITIES, default: 'MEDIUM' },
    priorityRank: { type: Number, default: 2 }, // derived; enables sorting by priority
    dueDate: { type: Date, default: null },
    dueSort: { type: Date, default: FAR_FUTURE }, // derived; keeps tasks without deadline last when sorting
    tags: [{ type: String, trim: true, lowercase: true, maxlength: 30 }],
    estimatedHours: { type: Number, min: 0, max: 1000, default: null },
    actualHours: { type: Number, min: 0, max: 1000, default: null },
    attachments: [{ name: String, url: String }],
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

taskSchema.index({ workspace: 1, status: 1, priority: 1 });
taskSchema.index({ workspace: 1, createdAt: -1 });
taskSchema.index({ workspace: 1, dueSort: 1 });
taskSchema.index({ tags: 1 });

taskSchema.pre('validate', function (next) {
  this.priorityRank = PRIORITY_RANK[this.priority as keyof typeof PRIORITY_RANK] ?? 2;
  this.dueSort = this.dueDate ?? FAR_FUTURE;
  next();
});

export const Task = model('Task', taskSchema);
