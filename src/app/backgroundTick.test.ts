import { describe, expect, it, vi } from 'vitest';
import { backgroundTick, installBackgroundTick, noteDrawnFrame } from './backgroundTick';

// A windowed original keeps running its scene loop unfocused or minimised (Winmain.cpp:1495).
describe('the background tick', () => {
  it('runs a logic step only once the browser stopped giving frames', () => {
    const step = vi.fn();
    noteDrawnFrame(1000);
    backgroundTick(1100, step);
    expect(step).not.toHaveBeenCalled();
    backgroundTick(1300, step);
    expect(step).toHaveBeenCalledTimes(1);
    expect(step).toHaveBeenCalledWith(1300);
  });

  it('stays out of the way of drawn frames', () => {
    const step = vi.fn();
    for (let now = 2000; now < 3000; now += 16) {
      noteDrawnFrame(now);
      backgroundTick(now + 8, step);
    }
    expect(step).not.toHaveBeenCalled();
  });

  it('does nothing where no worker can start', () => {
    vi.stubGlobal('Worker', undefined);
    expect(() => installBackgroundTick(() => {})).not.toThrow();
    vi.unstubAllGlobals();
  });
});
