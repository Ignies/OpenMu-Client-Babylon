import { describe, expect, test } from 'bun:test';
import { Backoff, CLAIM_TTL_MS, PENDING_TTL_MS, decide } from './dispatch';

/**
 * The policy that keeps one dead listing from starving the queue: what the
 * worker does with a piece of work given the listing's state, whether the
 * person it has to meet is online, and how long the row has been waiting.
 */

const NOW = 1_700_000_000_000;
const fresh = (state: 'pending' | 'claimed' | 'returning') => ({
  id: 'L1',
  state,
  updatedAt: NOW - 1000,
});

describe('a pending listing', () => {
  test('is collected when the seller is online', () => {
    expect(decide(fresh('pending'), true, NOW)).toEqual({ kind: 'go' });
  });

  test('is tried anyway when presence cannot say', () => {
    expect(decide(fresh('pending'), null, NOW)).toEqual({ kind: 'go' });
  });

  test('waits while the seller is offline, and costs no warp', () => {
    expect(decide(fresh('pending'), false, NOW).kind).toBe('wait');
  });

  test('expires once the seller has had long enough, online or not', () => {
    const old = { ...fresh('pending'), updatedAt: NOW - PENDING_TTL_MS - 1 };
    expect(decide(old, true, NOW).kind).toBe('expire');
    expect(decide(old, false, NOW).kind).toBe('expire');
  });
});

describe('a claimed listing', () => {
  test('is delivered when the buyer is online', () => {
    expect(decide(fresh('claimed'), true, NOW)).toEqual({ kind: 'go' });
  });

  test('is released at once when the buyer is offline: the claim blocks the catalogue', () => {
    expect(decide(fresh('claimed'), false, NOW).kind).toBe('release');
  });

  test('is released when the buyer never came, even if they are online', () => {
    const old = { ...fresh('claimed'), updatedAt: NOW - CLAIM_TTL_MS - 1 };
    expect(decide(old, true, NOW).kind).toBe('release');
  });
});

describe('a player on another game server', () => {
  test('is another bot\'s customer: the work waits, whatever its state', () => {
    for (const state of ['pending', 'claimed', 'returning'] as const) {
      const d = decide(fresh(state), true, NOW, false);
      expect(d.kind).toBe('wait');
      expect((d as { reason: string }).reason).toMatch(/another game server/);
    }
  });

  test('is served when they are here, or when presence cannot say where', () => {
    expect(decide(fresh('pending'), true, NOW, true)).toEqual({ kind: 'go' });
    expect(decide(fresh('pending'), true, NOW, null)).toEqual({ kind: 'go' });
  });

  test('still loses a claim to its own deadline', () => {
    const old = { ...fresh('claimed'), updatedAt: NOW - CLAIM_TTL_MS - 1 };
    expect(decide(old, true, NOW, false).kind).toBe('release');
  });
});

describe('a returning listing', () => {
  test('waits for the seller and never expires: the item is theirs', () => {
    const old = { ...fresh('returning'), updatedAt: NOW - 100 * PENDING_TTL_MS };
    expect(decide(old, false, NOW).kind).toBe('wait');
    expect(decide(old, true, NOW)).toEqual({ kind: 'go' });
  });
});

describe('backoff', () => {
  test('unknown work is due at once', () => {
    expect(new Backoff().due('x', NOW)).toBe(true);
  });

  test('a failure pushes the next try out, and each failure doubles the wait', () => {
    const b = new Backoff();
    b.failed('x', NOW);
    expect(b.due('x', NOW)).toBe(false);
    const first = b.remaining('x', NOW);
    expect(first).toBeGreaterThan(0);

    b.failed('x', NOW);
    expect(b.remaining('x', NOW)).toBe(first * 2);
  });

  test('the wait is capped', () => {
    const b = new Backoff();
    for (let i = 0; i < 20; i++) b.failed('x', NOW);
    expect(b.remaining('x', NOW)).toBeLessThanOrEqual(5 * 60_000);
  });

  test('success clears it', () => {
    const b = new Backoff();
    b.failed('x', NOW);
    b.succeeded('x');
    expect(b.due('x', NOW)).toBe(true);
  });

  test('work that left the queue is forgotten', () => {
    const b = new Backoff();
    b.failed('gone', NOW);
    b.failed('kept', NOW);
    b.keepOnly(['kept']);
    expect(b.due('gone', NOW)).toBe(true);
    expect(b.due('kept', NOW)).toBe(false);
  });
});
