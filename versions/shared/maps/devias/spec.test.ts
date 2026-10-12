import { afterEach, describe, expect, it, vi } from 'vitest';
import { ENUM_WORLD } from '@/core/types';
import { meshAnimationFor } from '@/controllers/render/meshAnimation';

afterEach(() => vi.restoreAllMocks());

describe("Devias' blend meshes (MoveObject, ZzzObject.cpp:3856-3860)", () => {
  // `case 78`: `(rand() % 4 + 4) * 0.1f` every frame, on its BlendMesh 3 (`DEVIAS_BLEND_MESHES`).
  it('flicker 78 a fresh tenth from 0.4 to 0.7', () => {
    const row = meshAnimationFor(ENUM_WORLD.WD_2DEVIAS, 78);
    expect(row).toMatchObject({ mesh: 3, kind: 'blend' });
    const roll = vi.spyOn(Math, 'random');
    for (const [r, want] of [[0, 0.4], [0.3, 0.5], [0.6, 0.6], [0.9999, 0.7]]) {
      roll.mockReturnValueOnce(r);
      expect(row?.light?.(1000)).toBeCloseTo(want);
    }
  });
});

describe("Devias' clear colour (SetWorldClearColor, SceneManager.cpp:433)", () => {
  it('is the dark navy rgb8(0, 0, 10)', async () => {
    const { deviasLayer } = await import('./index');
    expect(deviasLayer.clearColor).toEqual([0, 0, 10]);
  });
});
