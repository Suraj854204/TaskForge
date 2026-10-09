
import bcrypt from 'bcryptjs';
import { Request, Response } from 'express';
import { User } from '../models';
import { hashPassword, publicUser } from '../services/auth.service';
import { ApiError } from '../utils/ApiError';
import { sendSuccess } from '../utils/http';

export async function getMe(req: Request, res: Response) {
  sendSuccess(res, {
    user: await publicUser(req.user!._id),
  });
}

export async function updateMe(req: Request, res: Response) {
  const user = req.user!;

  if (req.body.name !== undefined) {
    user.name = req.body.name;
  }

  if (req.body.avatar !== undefined) {
    user.avatar = req.body.avatar;
  }

  await user.save();

  sendSuccess(
    res,
    { user: await publicUser(user._id) },
    'Profile updated',
  );
}

export async function changePassword(req: Request, res: Response) {
  const user = await User.findById(req.user!._id).select('+passwordHash');

  if (
    !user ||
    typeof req.body.currentPassword !== 'string' ||
    typeof user.passwordHash !== 'string' ||
    !(await bcrypt.compare(
      req.body.currentPassword,
      user.passwordHash,
    ))
  ) {
    throw new ApiError(400, 'Current password is incorrect');
  }

  user.passwordHash = await hashPassword(req.body.newPassword);
  await user.save();

  sendSuccess(res, {}, 'Password updated');
}