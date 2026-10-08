import { z } from 'zod';
import { env } from '../../config/env';
import { ApiError } from '../../utils/ApiError';
import { PRIORITIES } from '../../types';

const suggestionSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().max(2000),
  subtasks: z.array(z.string()).max(12),
  priority: z.enum(PRIORITIES),
  estimatedHours: z.number().min(0).max(1000),
  tags: z.array(z.string()).max(8),
});
export type TaskSuggestion = z.infer<typeof suggestionSchema>;

const SYSTEM = `You are a project-planning assistant. Turn the user's idea into one actionable task.
Reply with ONLY a JSON object, no markdown, using exactly these keys:
{"title": string (<=100 chars), "description": string, "subtasks": string[] (3-8 short items),
 "priority": "LOW"|"MEDIUM"|"HIGH"|"URGENT", "estimatedHours": number, "tags": string[] (1-5 lowercase words)}`;

/** Optional feature: the rest of the app works without AI_API_KEY. */
export const isAiEnabled = () => Boolean(env.aiApiKey);

export async function generateTaskSuggestion(prompt: string): Promise<TaskSuggestion> {
  if (!isAiEnabled()) {
    throw new ApiError(503, 'AI assistant is not configured. Set AI_API_KEY on the server to enable it.');
  }
  let res: Response;
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': env.aiApiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: env.aiModel, max_tokens: 1000, system: SYSTEM, messages: [{ role: 'user', content: prompt }] }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    throw new ApiError(502, 'Could not reach the AI provider');
  }
  if (!res.ok) throw new ApiError(502, 'The AI provider returned an error');

  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  const text = data.content?.find((b) => b.type === 'text')?.text ?? '';
  try {
    return suggestionSchema.parse(JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)));
  } catch {
    throw new ApiError(502, 'The AI response could not be understood, please try again');
  }
}
