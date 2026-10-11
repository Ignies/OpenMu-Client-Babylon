import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Heartbeat, HEARTBEAT_RETRY_MS } from './heartbeat';

const BEAT_MS = 800;

describe('Heartbeat', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('beats back to back while due, one at a time', () => {
    const play = vi.fn(() => BEAT_MS);
    const heart = new Heartbeat(play);

    heart.set(true);
    expect(play).toHaveBeenCalledTimes(1);

    // More "due" news mid-beat does not stack another one.
    heart.set(true);
    vi.advanceTimersByTime(BEAT_MS - 1);
    expect(play).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1);
    expect(play).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(BEAT_MS * 3);
    expect(play).toHaveBeenCalledTimes(5);
    heart.stop();
  });

  it('lets the beat finish but books no next one once no longer due', () => {
    const play = vi.fn(() => BEAT_MS);
    const heart = new Heartbeat(play);

    heart.set(true);
    heart.set(false);
    vi.advanceTimersByTime(BEAT_MS * 5);
    expect(play).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);

    heart.set(true);
    expect(play).toHaveBeenCalledTimes(2);
    heart.stop();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('waits out the beat still sounding when the bar dips again', () => {
    const play = vi.fn(() => BEAT_MS);
    const heart = new Heartbeat(play);

    heart.set(true);
    heart.set(false);
    heart.set(true);
    expect(play).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(BEAT_MS);
    expect(play).toHaveBeenCalledTimes(2);
    heart.stop();
  });

  it('books the next beat no earlier than the end of a fractional length', () => {
    const play = vi.fn(() => BEAT_MS + 0.4);
    const heart = new Heartbeat(play);

    heart.set(true);
    vi.advanceTimersByTime(BEAT_MS);
    expect(play).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1);
    expect(play).toHaveBeenCalledTimes(2);
    heart.stop();
  });

  it('tries again later when a beat could not start', () => {
    let length = 0;
    const play = vi.fn(() => length);
    const heart = new Heartbeat(play);

    heart.set(true);
    vi.advanceTimersByTime(HEARTBEAT_RETRY_MS - 1);
    expect(play).toHaveBeenCalledTimes(1);

    length = BEAT_MS;
    vi.advanceTimersByTime(1);
    expect(play).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(BEAT_MS);
    expect(play).toHaveBeenCalledTimes(3);
    heart.stop();
  });
});
