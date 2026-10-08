import { Schema, model } from 'mongoose';
import { PROJECT_STATUSES } from '../types';

const projectSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    description: { type: String, default: '', maxlength: 1000 },
    workspace: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    status: { type: String, enum: PROJECT_STATUSES, default: 'PLANNING' },
    color: { type: String, default: '#2E6A9E' },
    deadline: { type: Date, default: null },
  },
  { timestamps: true },
);
projectSchema.index({ workspace: 1, status: 1 });

export const Project = model('Project', projectSchema);
