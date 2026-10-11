import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

const { selectNearest } = await import('./modelLoaderSystem');

describe('selectNearest', () => {
  it('moves the k nearest of the first n to the front, nearest first', () => {
    const list = [9, 4, 7, 1, 8, 2, 0].map(priority => ({ priority }));
    selectNearest(list, 6, 3);
    expect(list.slice(0, 3).map(p => p.priority)).toEqual([1, 2, 4]);
    // Entries past n are left from an earlier frame and never picked.
    expect(list[6].priority).toBe(0);
  });
});
