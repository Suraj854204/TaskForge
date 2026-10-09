import { describe, expect, it } from 'vitest';
import { deadlineInfo } from './date';

const now = new Date('2026-10-09T12:00:00Z');
const base = { status: 'TODO', createdAt: '2026-10-01T12:00:00Z' };

describe('deadlineInfo', () => {
  it('reports overdue days', () => {
    expect(deadlineInfo({ ...base, dueDate: '2026-10-06T12:00:00Z' }, now)).toEqual({ label: 'Overdue by 3 days', tone: 'danger' });
  });
  it('reports days remaining', () => {
    expect(deadlineInfo({ ...base, dueDate: '2026-10-14T12:00:00Z' }, now)?.label).toBe('Due in 5 days');
  });
  it('reports completion time', () => {
    const r = deadlineInfo({ ...base, status: 'COMPLETED', completedAt: '2026-10-03T12:00:00Z' }, now);
    expect(r?.label).toBe('Completed in 2 days');
  });
  it('returns null without a deadline', () => {
    expect(deadlineInfo(base, now)).toBeNull();
  });
});
