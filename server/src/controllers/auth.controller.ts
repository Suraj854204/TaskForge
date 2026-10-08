import { Request, Response } from 'express';
import { loginUser, publicUser, registerUser } from '../services/auth.service';
import { sendSuccess } from '../utils/http';

export async function register(req: Request, res: Response) {
  sendSuccess(res, await registerUser(req.body), 'Registered successfully', 201);
}
export async function login(req: Request, res: Response) {
  sendSuccess(res, await loginUser(req.body.email, req.body.password), 'Logged in successfully');
}
export async function logout(_req: Request, res: Response) {
  // JWTs are stateless; the client discards the token. Endpoint exists for a uniform API.
  sendSuccess(res, {}, 'Logged out successfully');
}
export async function me(req: Request, res: Response) {
  sendSuccess(res, { user: await publicUser(req.user!._id) });
}
