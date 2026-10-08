import { Schema, model } from 'mongoose';

const activitySchema = new Schema(
  {
    task: { type: Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    actor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true }, // CREATED | ASSIGNED | STATUS_CHANGED | PRIORITY_CHANGED | DUE_DATE_CHANGED | COMPLETED | UPDATED
    message: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const Activity = model('Activity', activitySchema);
