import { describe, expect, it } from 'vitest';
import { buildAction } from './buildCheck';

// A tab left open across a deploy compares its BUILD_ID with the served build.json.
describe('buildAction', () => {
  it('does nothing on the same build or without an answer', () => {
    expect(buildAction('abc', 'abc', false, null)).toBe('none');
    expect(buildAction('abc', null, false, null)).toBe('none');
  });

  it('reloads at once outside the world, and waits for the player to leave it', () => {
    expect(buildAction('abc', 'def', false, null)).toBe('reload');
    expect(buildAction('abc', 'def', true, null)).toBe('later');
  });

  it('never reloads twice for the same build (a cache that keeps serving the old page)', () => {
    expect(buildAction('abc', 'def', false, 'def')).toBe('none');
    expect(buildAction('abc', 'ghi', false, 'def')).toBe('reload');
  });
});
