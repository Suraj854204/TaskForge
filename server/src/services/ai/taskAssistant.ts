import { z } from 'zod';
import { env } from '../../config/env';
import { PRIORITIES } from '../../types';
import { ApiError } from '../../utils/ApiError';

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
Reply with ONLY a JSON object using exactly these keys:
{"title": string (<=100 chars), "description": string, "subtasks": string[] (3-8 short items),
 "priority": "LOW"|"MEDIUM"|"HIGH"|"URGENT", "estimatedHours": number, "tags": string[] (1-5 lowercase words)}`;

/** Optional feature: the rest of the app works without AI_API_KEY (a Google Gemini API key). */
export const isAiEnabled = () => Boolean(env.aiApiKey);

/** Extracts and validates the task JSON from a Gemini generateContent response. Throws on anything unexpected. */
export function parseSuggestion(data: any): TaskSuggestion {
  const parts: { text?: string }[] = data?.candidates?.[0]?.content?.parts ?? [];
  const text = parts.map((p) => p?.text ?? '').join('');
  return suggestionSchema.parse(JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)));
}

export async function generateTaskSuggestion(prompt: string): Promise<TaskSuggestion> {
  if (!isAiEnabled()) {
    throw new ApiError(503, 'AI assistant is not configured. Set AI_API_KEY (a Gemini API key) on the server to enable it.');
  }
  let res: Response;
  try {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(env.aiModel)}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': env.aiApiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.4, maxOutputTokens: 2048 },
      }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    throw new ApiError(502, 'Could not reach the AI provider');
  }
  if (res.status === 429) throw new ApiError(429, 'AI rate limit reached, please try again in a minute');
  if (!res.ok) throw new ApiError(502, 'The AI provider returned an error. Check AI_API_KEY and AI_MODEL.');

  try {
    return parseSuggestion(await res.json());
  } catch {
    throw new ApiError(502, 'The AI response could not be understood, please try again');
  }
}
