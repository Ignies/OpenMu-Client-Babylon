import { describe, expect, it } from 'vitest';
import { SlidingWindow } from './window';

describe('sliding window', () => {
  it('counts what happened in the last second and forgets the rest', () => {
    const w = new SlidingWindow(100, 10);
    let now = 5000;
    for (let i = 0; i < 10; i++) {
      w.add(now, 3);
      now += 100;
    }
    // now = 6000: the first bucket (5000-5099) has just fallen out.
    expect(w.sum(now)).toBe(27);
    now += 500;
    expect(w.sum(now)).toBe(12);
    now += 1000;
    expect(w.sum(now)).toBe(0);
  });

  it('reuses a bucket that comes round again', () => {
    const w = new SlidingWindow(100, 10);
    w.add(1000, 5);
    expect(w.add(2000, 1)).toBe(1);
    expect(w.sum(2050)).toBe(1);
  });

  it('starts empty and can be reset', () => {
    const w = new SlidingWindow();
    expect(w.sum(0)).toBe(0);
    w.add(10, 4);
    w.reset();
    expect(w.sum(10)).toBe(0);
  });
});
