import { afterAll, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
const { Scene } = await import('@babylonjs/core/scene');
const { petFactoryFor, petSpec } = await import('./pets');

const engine = new NullEngine();
const scene = new Scene(engine);
afterAll(() => engine.dispose());

/** The Classic shadow a pet item's model casts: `[casts, meshes, from the ground]`. */
function shadowOf(num: number, excellentFlags = 0) {
  const spec = petSpec({ group: 13, num, excellentFlags } as Parameters<typeof petSpec>[0]);
  if (!spec) throw new Error(`no pet ${num}`);
  const pet = new (petFactoryFor(spec))(scene);
  return [pet.ClassicShadow, pet.ShadowMeshes, pet.ShadowFromGround];
}

// Draw_RenderObject shadows the Dark Horse's mesh 8 (RenderBodyShadow(-1, -1, 8, 9), the end not drawn,
// ZzzObject.cpp:790, ZzzBMD.cpp:2718), the Fenrirs whole (:857) and the Dark Raven from the ground (:979-986);
// no other pet casts one.
describe('the Classic shadow of a pet', () => {
  it('is the Dark Horse mesh 8, every Fenrir and the Dark Raven from the ground, and nothing else', () => {
    expect(shadowOf(4)).toEqual([true, [8], false]);
    for (const flags of [0, 1, 2, 4]) expect(shadowOf(37, flags)).toEqual([true, null, false]);
    expect(shadowOf(5)).toEqual([true, null, true]);
    for (const num of [0, 1, 2, 3, 64, 65, 67, 80, 106, 123]) expect(shadowOf(num)[0]).toBe(false);
  });
});
