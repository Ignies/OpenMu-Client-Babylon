import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NetStats } from './netStats';

/** Drives `performance.now()` so a pair can be closed at an exact distance. */
let clock = 0;

function at(ms: number): void {
  clock = ms;
}

beforeEach(() => {
  clock = 0;
  vi.spyOn(performance, 'now').mockImplementation(() => clock);
  NetStats.reset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** One closed pair of `kind`, `ms` apart. */
function sample(kind: 'chat' | 'itemMove' | 'warp', ms: number): void {
  const start = clock;
  NetStats.markSent(kind);
  at(start + ms);
  NetStats.markAnswered(kind);
}

describe('netStats', () => {
  it('has no round trip before the first sample', () => {
    expect(NetStats.roundTripMs).toBeNull();
    expect(NetStats.sampleCount).toBe(0);
  });

  it('times a request against its answer', () => {
    sample('chat', 120);
    expect(NetStats.roundTripMs).toBe(120);
  });

  it('ignores an answer nothing asked for', () => {
    NetStats.markAnswered('warp');
    expect(NetStats.roundTripMs).toBeNull();
  });

  it('keeps the kinds apart', () => {
    NetStats.markSent('chat');
    at(300);
    // The item move never went out, so its answer pairs with nothing.
    NetStats.markAnswered('itemMove');
    expect(NetStats.roundTripMs).toBeNull();

    NetStats.markAnswered('chat');
    expect(NetStats.roundTripMs).toBe(300);
  });

  it('pairs answers with the requests in the order they were sent', () => {
    NetStats.markSent('chat');
    at(50);
    NetStats.markSent('chat');
    at(100);
    NetStats.markAnswered('chat'); // the first line: 100 ms
    at(160);
    NetStats.markAnswered('chat'); // the second line: 110 ms

    expect(NetStats.sampleCount).toBe(2);
    expect(NetStats.roundTripMs).toBe(105);
  });

  it('drops a request that was never answered', () => {
    // Five sends with only four pending slots: the oldest is forgotten, so
    // the answer pairs with the second one.
    for (let i = 0; i < 5; i++) {
      at(i * 10);
      NetStats.markSent('warp');
    }
    at(1000);
    NetStats.markAnswered('warp');

    expect(NetStats.roundTripMs).toBe(990);
  });

  it('throws away a sample slower than the stall cap', () => {
    sample('warp', 9000);
    expect(NetStats.roundTripMs).toBeNull();
    expect(NetStats.sampleCount).toBe(0);
  });

  it('takes the median, so one spike does not move the figure', () => {
    sample('chat', 100);
    sample('chat', 110);
    sample('chat', 4000);

    expect(NetStats.roundTripMs).toBe(110);
  });

  it('averages the middle two on an even count', () => {
    sample('chat', 100);
    sample('chat', 200);

    expect(NetStats.roundTripMs).toBe(150);
  });

  it('holds only the recent samples', () => {
    for (let i = 0; i < 7; i++) sample('chat', 1000);
    expect(NetStats.roundTripMs).toBe(1000);

    // Seven fresh ones push every 1000 out of the window.
    for (let i = 0; i < 7; i++) sample('chat', 40);
    expect(NetStats.sampleCount).toBe(7);
    expect(NetStats.roundTripMs).toBe(40);
  });

  it('goes back to no round trip on reset', () => {
    sample('chat', 80);
    NetStats.reset();

    expect(NetStats.roundTripMs).toBeNull();
    expect(NetStats.sampleCount).toBe(0);
  });
});
