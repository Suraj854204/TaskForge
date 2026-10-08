import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { User, UserDoc, Workspace } from '../models';
import { ApiError } from '../utils/ApiError';

const rounds = env.nodeEnv === 'test' ? 4 : 12;
export const hashPassword = (plain: string) => bcrypt.hash(plain, rounds);

export const signToken = (user: UserDoc) =>
  jwt.sign({ sub: String(user._id), role: user.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });

/** User JSON with the workspace populated ({ _id, name, description }). */
export async function publicUser(id: unknown) {
  const user = await User.findById(id).populate('workspace', 'name description');
  if (!user) throw new ApiError(404, 'User not found');
  return user.toJSON();
}

export async function registerUser(input: { name: string; email: string; password: string; workspaceName?: string }) {
  if (await User.exists({ email: input.email })) throw new ApiError(409, 'Email is already registered');
  const user = await User.create({
    name: input.name,
    email: input.email,
    passwordHash: await hashPassword(input.password),
    role: 'ADMIN',
  });
  const workspace = await Workspace.create({
    name: input.workspaceName || `${input.name.split(' ')[0]}'s Workspace`,
    owner: user._id,
    members: [user._id],
  });
  user.workspace = workspace._id;
  await user.save();
  return { token: signToken(user), user: await publicUser(user._id) };
}

export async function loginUser(email: string, password: string) {
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new ApiError(401, 'Invalid email or password');
  }
  return { token: signToken(user), user: await publicUser(user._id) };
}
