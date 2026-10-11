import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

const { SHADOW_FOLD } = await import('./objectShadow');

const SX = 20;
const SY = 40;

/** The vertex shader's fold, run as JS: its GLSL reads the same with these two helpers. */
function fold(shadowY: number, shadowA: number): number {
  const min = Math.min;
  const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
  return new Function('min', 'clamp', 'shadowY', 'shadowA', 'shadowSX', 'shadowSY', `return ${SHADOW_FOLD};`)(min, clamp, shadowY, shadowA, SX, SY);
}

// CalcShadowPosition: x += z * (x + sx) / (z - sy), sx 2000, sy 4000 (ZzzBMD.cpp:2620-2638).
describe('the Classic shadow fold', () => {
  it('folds a body as the original does', () => {
    for (const [y, a] of [[0.5, 0.3], [3, -0.4], [6, 1]]) {
      expect(fold(y, a)).toBeCloseTo((y * (a + SX)) / (y - SY), 5);
    }
  });

  it('throws no vertex of a tall object more than five tiles', () => {
    for (const y of [25, 39.9, 40, 45, 120]) {
      expect(Math.abs(fold(y, 0.5))).toBeLessThanOrEqual(5);
    }
  });
});
