import type { Emission } from '../../common/effectParticles';
import type { LightEmitter } from '../../lighting/mapObjectLights';

/**
 * Aida (`WD_33AIDA`, `World34`/`Object34`), the plain-data half. Nothing here
 * may import the scene.
 *
 * EncTerrain34.obj places 3752 objects of 74 types (five type-6 records fall
 * outside the block grid and are dropped by the loader). Object34 ships 83
 * models and every referenced type has one. The C++ is GMAida.cpp:
 * `CreateAidaObject` (:30, a bare `return true`), `MoveAidaObject` (:38-95)
 * and `RenderAidaObjectVisual` (:97-320).
 */

/**
 * `CreateAidaObject` sets no `o->BlendMesh`. The scrolls on 25/28 (V) and
 * 65/66/77/78 (U, applied inside `RenderAidaObjectVisual`'s own `RenderMesh`
 * call on mesh 0) are in `meshAnimation.ts`; which mesh is additive comes off
 * the BMD flags.
 */
export const AIDA_BLEND_MESHES: Readonly<Record<number, number>> = {};

/**
 * `MoveAidaObject` :78-86 hides 56, 57, 58, 59, 62, 63, 67, 70, and
 * `RenderAidaObjectVisual` :199-206 hides 60 after its butterfly spawn:
 *
 *  - **56** (×22) `BITMAP_WATERFALL_1` SubType 2, **57** (×23)
 *    `WATERFALL_3` SubType 4 every tick, **58** (×39) `WATERFALL_2` SubType
 *    2 — the three waterfall sheets around 15/150 and 182/113.
 *  - **59** (×20), **62** (×47), **63** (×24): `BITMAP_CLOUD` SubType 1 mist
 *    puffs.
 *  - **60** (×20): butterflies (`MODEL_BUTTERFLY01` SubType 3), an effect
 *    model — empty marker here.
 *  - **67** (×11), **70** (×5): hidden, no effect in the C++.
 */
export const AIDA_EFFECT_ONLY_TYPES: readonly number[] = [
  56, 57, 58, 59, 60, 62, 63, 67, 70,
];

/**
 * The falls and the mist. `every` is the C++ `rand_fps_check` divisor where
 * one is given (:169, :180: 56/58 spawn one in two; 57 every tick; the cloud
 * types one in eight). `cloud21` is the same `BITMAP_CLOUD` texture.
 */
export const AIDA_EMISSIONS: Partial<Record<number, readonly Emission[]>> = {
  56: [{ kinds: ['waterfall5_9'], every: 2 }],
  57: [{ kinds: ['waterfall5_9'], every: 1 }],
  58: [{ kinds: ['waterfall5_9'], every: 2 }],
  59: [{ kinds: ['cloud21'], every: 8 }],
  62: [{ kinds: ['cloud21'], every: 8 }],
  63: [{ kinds: ['cloud21'], every: 8 }],
};

/**
 * `MoveAidaObject`:
 *  - **30** (×155), :55-60: `L = (rand%5)*0.01; AddTerrainLight(x, y,
 *    (L+0.4, L+0.6, L+0.4), 2)` — a pale green glow under the luminous
 *    plants, plus (`RenderAidaObjectVisual` :106-150) a pair of
 *    `BITMAP_SPARK+1` sprites at each of bones 6/7/8/12/13/17, blue-tinted
 *    `(0.1, 0.1, 0.3)` over grey `(0.15, 0.15, 0.15)`. The sprites are
 *    reduced to one flare at the origin; the light is what reads.
 *  - **71** (×28), :62-67: the same with `(L+0.9, L+0.2, L+0.2)` — the red
 *    crystals — and the same bone sprites (:236-282).
 *  - **75** (×1), :208-217: a rotating `BITMAP_FLARE` at bone 4, `(1, 0.6,
 *    0.2)` scale 3 — the one torch.
 *
 * The `rand() % 5 * 0.01` jitter is ±0.05 — a static light in practice, so no
 * flicker block.
 */
export const AIDA_LIGHTS: Partial<Record<number, readonly LightEmitter[]>> = {
  30: [
    {
      pointRange: 4,
      terrain: { range: 2, color: [0.42, 0.62, 0.42] },
      sprite: { scale: 1.2, color: [0.1, 0.1, 0.3] },
    },
  ],
  71: [
    {
      pointRange: 4,
      terrain: { range: 2, color: [0.92, 0.22, 0.22] },
      sprite: { scale: 1.2, color: [0.3, 0.1, 0.1] },
    },
  ],
  75: [
    {
      offset: [0, 0, 120],
      sprite: { scale: 3, color: [1, 0.6, 0.2] },
    },
  ],
};
