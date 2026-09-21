import { beforeEach, describe, expect, it } from 'vitest';
import {
  NET_BURST_MS,
  netStats,
  recordSocketDrain,
  resetNetStats,
  setNetClock,
} from './netStats';

let clock = 0;

beforeEach(() => {
  clock = 0;
  setNetClock(() => clock);
  resetNetStats();
});

describe('netStats', () => {
  it('says offline until a packet has arrived', () => {
    expect(netStats().live).toBe(false);
  });

  it('reports the rate and the thread time of a closed window', () => {
    // Ten drains over the first second, then one at exactly 1000 to close it.
    for (let i = 0; i < 10; i++) {
      recordSocketDrain(512, 0.2);
      clock += 100;
    }

    recordSocketDrain(0, 0);

    const n = netStats();

    expect(n.live).toBe(true);
    expect(n.rate).toBeCloseTo(10, 5);
    expect(n.kbps).toBeCloseTo(5, 5);
    expect(n.msPerSecond).toBeCloseTo(2, 5);
  });

  it('divides by the span a window really covered, not by the nominal second', () => {
    recordSocketDrain(1024, 10);
    // Nothing for four seconds: the window closes late and the rate has to
    // reflect that, or a quiet stretch reads as a busy one.
    clock += 4000;
    recordSocketDrain(0, 0);

    const n = netStats();

    expect(n.rate).toBeCloseTo(0.25, 5);
    expect(n.msPerSecond).toBeCloseTo(2.5, 5);
  });

  it('keeps the worst single drain, not the average', () => {
    recordSocketDrain(10, 0.1);
    clock += 10;
    recordSocketDrain(10, 37);
    clock += 10;
    recordSocketDrain(10, 0.1);

    clock += 1000;
    recordSocketDrain(0, 0);

    expect(netStats().worstMs).toBe(37);
  });

  it('counts the drains long enough to drop a frame', () => {
    recordSocketDrain(10, NET_BURST_MS + 1);
    clock += 10;
    recordSocketDrain(10, NET_BURST_MS - 1);
    clock += 10;
    recordSocketDrain(10, NET_BURST_MS + 20);

    clock += 1000;
    recordSocketDrain(0, 0);

    expect(netStats().bursts).toBe(2);
  });

  it('does not carry a burst into the next window', () => {
    recordSocketDrain(10, 50);
    clock += 1000;
    recordSocketDrain(10, 0.1);

    // Close the second window too.
    clock += 1000;
    recordSocketDrain(0, 0);

    expect(netStats().worstMs).toBeCloseTo(0.1, 5);
    expect(netStats().bursts).toBe(0);
  });

  it('reports the window in progress before the first one closes', () => {
    clock += 100;
    recordSocketDrain(1024, 1);

    const n = netStats();

    expect(n.live).toBe(true);
    expect(n.rate).toBeGreaterThan(0);
  });

  it('forgets everything on reset', () => {
    recordSocketDrain(1024, 9);
    resetNetStats();

    expect(netStats().live).toBe(false);
    expect(netStats().worstMs).toBe(0);
  });
});
