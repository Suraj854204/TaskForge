import { describe, expect, it } from 'vitest';
import { parseSuggestion } from '../src/services/ai/taskAssistant';

const wrap = (text: string) => ({ candidates: [{ content: { parts: [{ text }] } }] });

describe('Gemini response parsing', () => {
  it('parses a valid suggestion, even with surrounding text', () => {
    const json = JSON.stringify({ title: 'Build auth system', description: 'JWT based auth', subtasks: ['Models', 'Routes'], priority: 'HIGH', estimatedHours: 12, tags: ['auth'] });
    const result = parseSuggestion(wrap(`Here you go:\n${json}`));
    expect(result.priority).toBe('HIGH');
    expect(result.subtasks).toHaveLength(2);
  });

  it('rejects empty, malformed or schema-invalid responses', () => {
    expect(() => parseSuggestion({})).toThrow();
    expect(() => parseSuggestion(wrap('not json'))).toThrow();
    expect(() => parseSuggestion(wrap('{"title":"x"}'))).toThrow();
  });
});
