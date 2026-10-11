import { describe, expect, it } from 'vitest';
import { UIState } from '@/controllers/interface/uiState';
import { buildAction, inGameSession } from './buildCheck';

// A tab left open across a deploy compares its BUILD_ID with the served build.json.
describe('buildAction', () => {
  it('does nothing on the same build or without an answer', () => {
    expect(buildAction('abc', 'abc', false, null)).toBe('none');
    expect(buildAction('abc', null, false, null)).toBe('none');
  });

  it('reloads at once with no game session, and waits for the session to end', () => {
    expect(buildAction('abc', 'def', false, null)).toBe('reload');
    expect(buildAction('abc', 'def', true, null)).toBe('later');
  });

  it('never reloads twice for the same build (a cache that keeps serving the old page)', () => {
    expect(buildAction('abc', 'def', false, 'def')).toBe('none');
    expect(buildAction('abc', 'ghi', false, 'def')).toBe('reload');
  });
});

describe('inGameSession', () => {
  // The server list (also where a disconnect lands) has no game server socket; from the login on there is one.
  it('is false only before the login', () => {
    expect([UIState.Preloader, UIState.Servers].map(inGameSession)).toEqual([false, false]);
    expect([UIState.Login, UIState.Characters, UIState.LoadingWorld, UIState.World].map(inGameSession)).toEqual([
      true,
      true,
      true,
      true,
    ]);
  });
});
