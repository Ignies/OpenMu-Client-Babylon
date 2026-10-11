import { describe, expect, it } from 'vitest';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { ModelObject } from '../render/modelObject';
import { ammoGoldWanted, paintAmmo } from './ammoGold';

// MODEL_BOLT / MODEL_ARROWS while eBuff_InfinityArrow holds: BodyLight (1, 0.8, 0.2), then a RENDER_CHROME | RENDER_BRIGHT
// pass in it (ZzzObject.cpp:8023-8030).
describe('the Infinity Arrow quiver', () => {
  const bolt = { group: 4, num: 7 };
  const arrows = { group: 4, num: 15 };
  const bow = { group: 4, num: 3 };
  const buffed = new Set([6]);

  it('is gold only on bolts and arrows while the buff holds', () => {
    expect([bolt, arrows, bow].map(i => ammoGoldWanted(buffed, i as never))).toEqual([true, true, false]);
    expect(ammoGoldWanted(new Set([5]), bolt as never)).toBe(false);
    expect(ammoGoldWanted(undefined, bolt as never)).toBe(false);
    expect(ammoGoldWanted(buffed, null)).toBe(false);
  });

  it('draws the part in gold with chrome, and gives back its own light after', () => {
    const light = new Vector3(0.5, 0.5, 0.5);
    const shine = { tint: new Vector3(), star: false };
    const meshes = [{ metadata: { bodyLight: light, bodyShine: shine } }, { metadata: { bodyLight: light, bodyShine: shine } }];
    const part = { getMeshes: () => meshes } as unknown as ModelObject;
    paintAmmo(part, true);
    for (const m of meshes) {
      const md = m.metadata as unknown as { bodyLight: Vector3; bodyShine: { tint: Vector3; chromeOnly: boolean } };
      expect([md.bodyLight.asArray(), md.bodyShine.tint.asArray(), md.bodyShine.chromeOnly]).toEqual([[1, 0.8, 0.2], [1, 0.8, 0.2], true]);
    }
    paintAmmo(part, true);
    paintAmmo(part, false);
    for (const m of meshes) expect([m.metadata.bodyLight, m.metadata.bodyShine]).toEqual([light, shine]);
  });
});
