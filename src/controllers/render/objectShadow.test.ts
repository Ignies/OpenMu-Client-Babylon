import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

const { SHADOW_FOLD, blobShadowsActive, setShadowWorld, shadowLean } = await import('./objectShadow');
const { ENUM_WORLD } = await import('../../core/types');

// RenderBodyShadow's sx: 2500 in Battle Castle, 2000 elsewhere (ZzzBMD.cpp:2784).
describe('the shadow lean', () => {
  it('is 25 tiles in Valley of Loren and 20 elsewhere', () => {
    const lean = (world: number) => (setShadowWorld(world), shadowLean());
    expect([lean(ENUM_WORLD.WD_30BATTLECASTLE), lean(ENUM_WORLD.WD_0LORENCIA)]).toEqual([25, 20]);
  });
});

// Kalima draws no shadow at all: InHellas() in RenderCharacter (ZzzCharacter.cpp:8590) and RenderPartObjectEffect (ZzzObject.cpp:9378).
describe('the worlds with no shadow', () => {
  it('are Icarus and every Kalima floor', () => {
    const on = (world: number) => (setShadowWorld(world), blobShadowsActive());
    expect([ENUM_WORLD.WD_10ICARUS, ENUM_WORLD.WD_24HELLAS, ENUM_WORLD.WD_24HELLAS_END, ENUM_WORLD.WD_24HELLAS_7].map(on)).toEqual([false, false, false, false]);
    expect([ENUM_WORLD.WD_0LORENCIA, ENUM_WORLD.WD_11BLOODCASTLE1].map(on)).toEqual([true, true]);
  });
});

const SX = 20;
const SY = 40;

/** The vertex shader's fold, run as JS: its GLSL reads the same. */
function fold(shadowY: number, shadowA: number): number {
  return new Function('shadowY', 'shadowA', 'shadowSX', 'shadowSY', `return ${SHADOW_FOLD};`)(shadowY, shadowA, SX, SY);
}

// CalcShadowPosition: x += z * (x + sx) / (z - sy), sx 2000, sy 4000 (ZzzBMD.cpp:2620-2638).
describe('the Classic shadow fold', () => {
  // No limit: a tall caster's top streaks as far as the original throws it (Selupan's reaches 26 tiles up).
  it('folds every vertex as the original does, a tall one too', () => {
    for (const [y, a] of [[0.5, 0.3], [3, -0.4], [6, 1], [26, 0.5], [35, -1]]) {
      expect(fold(y, a)).toBeCloseTo((y * (a + SX)) / (y - SY), 5);
    }
  });
});
