import { Request, Response } from 'express';
import { generateTaskSuggestion } from '../services/ai';
import { sendSuccess } from '../utils/http';

export async function taskAssistant(req: Request, res: Response) {
  sendSuccess(res, { suggestion: await generateTaskSuggestion(req.body.prompt) }, 'Suggestion generated');
}
