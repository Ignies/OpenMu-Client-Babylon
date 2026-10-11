import { afterEach, describe, expect, it, vi } from 'vitest';
import { ENUM_WORLD } from '@/core/types';
import { meshAnimationFor } from '@/controllers/render/meshAnimation';

const LORENCIA = ENUM_WORLD.WD_0LORENCIA;

afterEach(() => vi.restoreAllMocks());

/** The BlendMeshLight `type` rolls, one per `Math.random()` draw. */
function rolls(type: number, draws: readonly number[]): number[] {
  const roll = vi.spyOn(Math, 'random');
  return draws.map(r => {
    roll.mockReturnValueOnce(r);
    return meshAnimationFor(LORENCIA, type)?.light?.(1000) ?? NaN;
  });
}

describe("Lorencia's blend meshes (MoveObject, ZzzObject.cpp:3742-3790)", () => {
  // `case MODEL_HOUSE01 + 2`: `(rand() % 4 + 4) * 0.1f` every frame (:3751-3753), on its BlendMesh 4 (:4554-4555).
  it('flicker House 03 a fresh tenth from 0.4 to 0.7', () => {
    expect(meshAnimationFor(LORENCIA, 117)).toMatchObject({ mesh: 4, kind: 'blend' });
    const got = rolls(117, [0, 0.3, 0.6, 0.9999]);
    [0.4, 0.5, 0.6, 0.7].forEach((want, i) => expect(got[i]).toBeCloseTo(want));
  });

  // `case MODEL_BONFIRE`: `(rand() % 6 + 4) * 0.1f` (:3788), BlendMesh 1 (:4569-4570).
  it('flicker the bonfire a fresh tenth from 0.4 to 0.9', () => {
    expect(meshAnimationFor(LORENCIA, 52)).toMatchObject({ mesh: 1, kind: 'blend' });
    const got = rolls(52, [0, 0.5, 0.9999]);
    [0.4, 0.7, 0.9].forEach((want, i) => expect(got[i]).toBeCloseTo(want));
  });

  // `BlendMeshTexCoordV = -(int)WorldTime % 1000 * 0.001f` (:3747-3749) on BlendMesh 8 and 2 (:4557-4561).
  it('scroll House 04 and 05 down a texture a second', () => {
    for (const [type, mesh] of [[118, 8], [119, 2]]) {
      const row = meshAnimationFor(LORENCIA, type);
      expect(row).toMatchObject({ mesh, kind: 'blend' });
      expect(row?.v?.(250)).toBeCloseTo(-0.25);
      expect(row?.v?.(1750)).toBeCloseTo(-0.75);
    }
  });
});
