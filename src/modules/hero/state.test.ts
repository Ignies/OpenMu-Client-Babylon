import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});
import { Hero } from './state';

describe('the hero state', () => {
  it('keeps no tile of its own: the hero entity is where it stands (`_api/ports.ts` hero())', () => {
    expect(['x', 'y', 'setPosition'].filter(key => key in Hero)).toEqual([]);
  });
});
