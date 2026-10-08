import { Schema, model, InferSchemaType, HydratedDocument } from 'mongoose';
import { ROLES } from '../types';

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    avatar: { type: String, default: '' },
    role: { type: String, enum: ROLES, default: 'MEMBER' },
    workspace: { type: Schema.Types.ObjectId, ref: 'Workspace', default: null, index: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        const r = ret as Record<string, unknown>;
        delete r.passwordHash;
        delete r.__v;
        return r;
      },
    },
  },
);

export type UserDoc = HydratedDocument<InferSchemaType<typeof userSchema>>;
export const User = model('User', userSchema);
