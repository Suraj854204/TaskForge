import { Request, Response } from 'express';
import { getDashboard, getProductivity } from '../services/analytics.service';
import { sendSuccess } from '../utils/http';

export async function dashboard(req: Request, res: Response) {
  sendSuccess(res, await getDashboard(req.user!));
}
export async function productivity(req: Request, res: Response) {
  sendSuccess(res, await getProductivity(req.user!));
}
