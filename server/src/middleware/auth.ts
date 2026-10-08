import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { User, UserDoc } from '../models';
import { Role } from '../types';
import { ApiError } from '../utils/ApiError';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: UserDoc;
    }
  }
}

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw new ApiError(401, 'Authentication required');
    let payload: jwt.JwtPayload;
    try {
      payload = jwt.verify(header.slice(7), env.jwtSecret) as jwt.JwtPayload;
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) throw new ApiError(401, 'Token expired, please log in again');
      throw new ApiError(401, 'Invalid token');
    }
    const user = await User.findById(payload.sub);
    if (!user) throw new ApiError(401, 'User no longer exists');
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

export const requireRole =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role as Role)) {
      return next(new ApiError(403, 'You do not have permission to perform this action'));
    }
    next();
  };

export function requireWorkspace(req: Request, _res: Response, next: NextFunction) {
  if (!req.user?.workspace) return next(new ApiError(403, 'Create or join a workspace first'));
  next();
}
