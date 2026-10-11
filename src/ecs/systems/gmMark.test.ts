import { describe, expect, it, vi } from 'vitest';
import type { Entity } from '../world';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

const { wantsGmMark } = await import('./gmMark');

const player = (buffs: number[], localPlayer = false) =>
  ({ buffs: new Set(buffs), ...(localPlayer && { localPlayer: true }) }) as unknown as Entity;

// CSParts.cpp:28-46 (ShouldAssignWebzenPart): the GM buff, or the hero's operator CtlCode, puts
// the Webzen mark on; RenderParts draws nothing while cloaked (:131-134).
describe('wantsGmMark', () => {
  it('follows the GM buff', () => {
    expect(wantsGmMark(player([28]), false)).toBe(true);
    expect(wantsGmMark(player([1, 2]), false)).toBe(false);
  });

  it('marks the hero who is a game master', () => {
    expect(wantsGmMark(player([], true), true)).toBe(true);
    expect(wantsGmMark(player([], false), true)).toBe(false);
  });

  it('hides it while cloaked', () => {
    expect(wantsGmMark(player([28, 18]), false)).toBe(false);
  });
});
