import { describe, expect, it } from 'vitest';
import { clearTimers, delay, fxNow, stepClock } from './core';

const TICK = 1 / 25;

/** Frames of `dt` until a `seconds` delay fires; the delay starts after `before` frames. */
function framesUntil(seconds: number, before = 0, dt = TICK): number {
  clearTimers();
  for (let i = 0; i < before; i++) stepClock(dt);
  let fired = false;
  delay(seconds, () => (fired = true));
  for (let frame = 1; frame <= 200; frame++) {
    stepClock(dt);
    if (fired) return frame;
  }
  return -1;
}

describe('the effects clock', () => {
  it('fires an n-tick delay on the n-th tick at 25 fps, whatever the clock read when it started', () => {
    for (const n of [1, 3, 7, 14, 15, 20, 30]) {
      for (const before of [0, 1, 7, 33, 101]) expect(framesUntil(n * 0.04, before)).toBe(n);
    }
  });

  it('still fires a delay on the first frame it is due at 60 fps', () => {
    expect(framesUntil(14 * 0.04, 0, 1 / 60)).toBe(34);
  });

  it('reads seconds', () => {
    const t0 = fxNow();
    for (let i = 0; i < 25; i++) stepClock(TICK);
    expect(fxNow() - t0).toBeCloseTo(1, 9);
  });
});
