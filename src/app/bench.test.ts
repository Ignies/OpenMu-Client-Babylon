import { describe, expect, it, vi } from 'vitest';

vi.stubGlobal('location', { search: '?offline&bench', hostname: 'localhost', href: 'http://localhost/' });
// Skills first: they keep the app import cycle in order (versions/shared/skills/readme.md).
await import('@versions/shared/skills/skillVisuals');
const { rng } = await import('./bench');

describe('the offline bench (?offline&bench, dev build only)', () => {
  it('spawns the same crowd every run (a seeded generator)', () => {
    const a = rng(1);
    const b = rng(1);
    const first = [a(), a(), a()];
    expect([b(), b(), b()]).toEqual(first);
    expect(first.every(v => v >= 0 && v < 1)).toBe(true);
    expect(rng(2)()).not.toBe(first[0]);
  });
});
