import { describe, expect, it } from 'vitest';
import { framePacer } from './fpsLimit';
import { GameOptions } from '@/controllers/settings';
import type { Entity } from '@/ecs/world';
import { nextShedLevel, othersShedFully, shedLevel } from './loadShed';

describe('load shedding', () => {
  it('steps down as the frame rate falls under the target', () => {
    expect(nextShedLevel(58, 60, 0)).toBe(0);
    expect(nextShedLevel(35, 60, 0)).toBe(1);
    expect(nextShedLevel(15, 60, 0)).toBe(2);
    // Against the target: 25 is fine under a 30 cap.
    expect(nextShedLevel(25, 30, 0)).toBe(0);
  });

  it('comes back one step at a time, past its own threshold', () => {
    expect(nextShedLevel(45, 60, 1)).toBe(1);
    expect(nextShedLevel(55, 60, 1)).toBe(0);
    expect(nextShedLevel(30, 60, 2)).toBe(2);
    expect(nextShedLevel(55, 60, 2)).toBe(1);
  });

  it('changes nothing without a reading', () => {
    expect(nextShedLevel(0, 60, 2)).toBe(2);
  });

  it('reads the drawn frame rate at most twice a second', () => {
    framePacer.fps = 10;
    expect(shedLevel(1_000_000)).toBe(2);
    framePacer.fps = 60;
    expect(shedLevel(1_000_100)).toBe(2);
    expect(shedLevel(1_000_600)).toBe(1);
    expect(shedLevel(1_001_100)).toBe(0);
  });
});

describe('other players at level 2', () => {
  it('drops only other players, only with the option on', () => {
    const other = { playerAnimation: {} } as unknown as Entity;
    const hero = { playerAnimation: {}, localPlayer: true } as unknown as Entity;
    GameOptions.effectShedding = true;
    framePacer.fps = 10;
    expect(othersShedFully(other, 2_000_000)).toBe(true);
    expect(othersShedFully(hero, 2_000_000)).toBe(false);
    GameOptions.effectShedding = false;
    expect(othersShedFully(other, 2_000_000)).toBe(false);
  });
});
