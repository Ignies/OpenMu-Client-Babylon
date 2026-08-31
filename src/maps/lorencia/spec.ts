import type { Emission } from '../../common/effectParticles';

/**
 * Lorencia (`WD_0LORENCIA`, `World1`/`Object1`), the plain-data half: the
 * per-type tables the renderer reads through the `maps` facade. Nothing here
 * may import the scene.
 */

/** `CreateObject`'s `BlendMesh` assignments for Object1 (ZzzObject.cpp:4643-4651). */
export const LORENCIA_BLEND_MESHES: Readonly<Record<number, number>> = {
  117: 4,
  118: 8,
  119: 2,
  122: 4,
  105: 3,
  52: 1,
  98: 2,
  90: 1,
  150: 1,
};

/** The three chimney / vent types drawn as smoke only. */
export const LORENCIA_EFFECT_ONLY_TYPES: readonly number[] = [130, 131, 132];

export const LORENCIA_EMISSIONS: Partial<Record<number, readonly Emission[]>> = {
  131: [{ kinds: ['smoke0'], every: 2, jitter: 8 }],

  132: [{ kinds: ['smoke2'], every: 2, jitter: 8 }],
};
