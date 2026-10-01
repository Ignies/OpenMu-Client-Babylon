import { describe, expect, it } from 'vitest';
import { isHostilePlayer } from './playerTarget';

const outside = { duelEnemyId: null, ctrl: false };

describe('isHostilePlayer', () => {
  it('refuses a plain player without Ctrl', () => {
    expect(isHostilePlayer({ netId: 10, heroState: 3 }, outside)).toBe(false);
  });

  it('accepts anyone while Ctrl is held', () => {
    expect(isHostilePlayer({ netId: 10, heroState: 3 }, { ...outside, ctrl: true })).toBe(true);
  });

  it('accepts an outlaw without Ctrl', () => {
    expect(isHostilePlayer({ netId: 10, heroState: 6 }, outside)).toBe(true);
    expect(isHostilePlayer({ netId: 10, heroState: 7 }, outside)).toBe(true);
  });

  it('does not count the warning states as outlaw', () => {
    expect(isHostilePlayer({ netId: 10, heroState: 4 }, outside)).toBe(false);
    expect(isHostilePlayer({ netId: 10, heroState: 5 }, outside)).toBe(false);
  });

  it('treats a missing state as neutral', () => {
    expect(isHostilePlayer({ netId: 10 }, outside)).toBe(false);
  });

  describe('in a duel', () => {
    const duel = { duelEnemyId: 20, ctrl: false };

    it('accepts the enemy without Ctrl', () => {
      expect(isHostilePlayer({ netId: 20, heroState: 3 }, duel)).toBe(true);
    });

    it('refuses everyone else, outlaw or under Ctrl', () => {
      expect(isHostilePlayer({ netId: 10, heroState: 6 }, duel)).toBe(false);
      expect(isHostilePlayer({ netId: 10, heroState: 3 }, { ...duel, ctrl: true })).toBe(false);
    });
  });
});
