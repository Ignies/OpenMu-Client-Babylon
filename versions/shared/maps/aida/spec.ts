import type { Emission } from '@/controllers/fx/effectParticles';
import type { LightEmitter } from '@/controllers/lighting/mapObjectLights';
import type { MeshAnimations } from '@/controllers/render';
import { saw, sawUp, perTick } from '../shared/meshAnimation';

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
 * call on mesh 0) are in the `render.meshAnimations` rows; which mesh is additive comes off
 * the BMD flags.
 */
export const AIDA_BLEND_MESHES: Readonly<Record<number, number>> = {};

/**
 * `MoveAidaObject` :78-86 hides 56, 57, 58, 59, 62, 63, 67, 70, and
 * `RenderAidaObjectVisual` :199-206 hides 60 after its butterfly spawn:
 *
 *  - **56** (×22) `BITMAP_WATERFALL_1` SubType 2, **57** (×23)
 *    `WATERFALL_3` SubType 4 every tick, **58** (×39) `WATERFALL_2` SubType
 *    2 - the three waterfall sheets around 15/150 and 182/113.
 *  - **59** (×20), **62** (×47), **63** (×24): `BITMAP_CLOUD` SubType 1 mist
 *    puffs.
 *  - **60** (×20): butterflies (`MODEL_BUTTERFLY01` SubType 3), an effect
 *    model - empty marker here.
 *  - **67** (×11), **70** (×5): hidden, no effect in the C++.
 */
export const AIDA_EFFECT_ONLY_TYPES: readonly number[] = [
  56, 57, 58, 59, 60, 62, 63, 67, 70,
];

/**
 * The falls, Kanturu's three kinds (:167-184): 56 `WATERFALL_1` SubType 2 one
 * in two, 57 `WATERFALL_3` SubType 4 every tick, 58 `WATERFALL_2` SubType 2
 * one in three, white at `o->Scale`.
 *
 * **59**, **62** and **63** emit nothing. All three bodies are wrapped in
 * `if (pObject->HiddenMesh != -2)` (:184-225) and `MoveAidaObject` (:76-84)
 * sets exactly that on all three every frame, so each fires at most once -
 * the first frame its block enters the frustum - and never again. What it
 * fires is 20 `BITMAP_CLOUD` SubType 1 at light `(0.01, 0.03, 0.05)`,
 * `(0.05, 0.05, 0.05)` and `(0.05, 0.02, 0.02)`: near-black on an additive
 * sprite, and SubType 1 has no init and no move case, so they keep
 * `CreateParticle`'s default `LifeTime = 2` (ZzzEffectParticle.cpp:74) and
 * are gone in two ticks. A stream of white `cloud21` from 91 emitters
 * instead buried the map in cloud.
 */
export const AIDA_EMISSIONS: Partial<Record<number, readonly Emission[]>> = {
  56: [{ kinds: ['waterfall1_2'], every: 2 }],
  57: [{ kinds: ['waterfall3_4'], every: 1 }],
  58: [{ kinds: ['waterfall2_2'], every: 3 }],
};

/** MU units, `[x, y, z]`. */
type Vec3 = readonly [number, number, number];

/**
 * Bones 6, 7, 8, 12, 13 and 17 of the plant rig (Object31 and Object72 share it) with the
 * original's nudges, each the middle of its 13-key sway, at scale 1.
 */
const BULBS: readonly Vec3[] = [
  [32, 2, 54],
  [32, 1, 41],
  [32, 0, 26],
  [-24, 9, 46],
  [-23, 5, 31],
  [-10, -22, 59],
];

/** One `BITMAP_SPARK + 1` card on a bulb, sized without `* o->Scale`. */
const spark = (offset: Vec3, scale: number, color: Vec3): LightEmitter => ({
  offset,
  bone: true,
  sprite: { scale, color, texture: 'spark1', unscaled: true },
});

/** Each bulb's big tinted spark over its 3.0 one. */
const bulbs = (big: readonly number[], tints: readonly Vec3[], small: Vec3) =>
  BULBS.flatMap((at, i) => [spark(at, big[i], tints[i]), spark(at, 3, small)]);

const BLUE: Vec3 = [0.1, 0.1, 0.3];
const RED: Vec3 = [0.25, 0, 0];

/**
 * `MoveAidaObject`:
 *  - **30** (×155), :58-64: `L = (rand%5)*0.01; AddTerrainLight(x, y,
 *    (L+0.4, L+0.6, L+0.4), 2)` - a pale green glow under the luminous
 *    plants, plus (`RenderAidaObjectVisual` :106-150) a pair of
 *    `BITMAP_SPARK+1` (Spark03.jpg) sprites on each bulb (`BULBS`): blue
 *    `(0.1, 0.1, 0.3)` at 5.5 / 4.5 / 4 over grey `(0.15, 0.15, 0.15)` at 3.
 *  - **71** (×28), :65-71: the same with `(L+0.9, L+0.2, L+0.2)` - the red
 *    crystals - and the same bulbs (:259-303): red `(0.5, 0, 0)` at 6 on the
 *    first, `(0.25, 0, 0)` at 5.5 / 5 on the rest, over `(0.15, 0, 0)` at 3.
 *  - **75** (×1), :304-311: a `BITMAP_FLARE` (Flare.jpg's own warm star) at
 *    bone 4 (201 up at scale 1), white - the `fLumi` tint is overwritten by
 *    `(1, 1, 1)` - 3 across with no `* o->Scale`, turning a smooth `WorldTime / 10`
 *    degrees: the one torch.
 *
 * The plants stand at scale 0.56-2.84 (most 2-2.5): the bulbs grow with them,
 * the sparks keep their size. The `rand() % 5 * 0.01` jitter is ±0.05 - a
 * static light in practice, so no flicker block.
 */
export const AIDA_LIGHTS: Partial<Record<number, readonly LightEmitter[]>> = {
  30: [
    { pointRange: 4, terrain: { range: 2, color: [0.42, 0.62, 0.42] } },
    ...bulbs([5.5, 4.5, 4, 4.5, 4, 4], Array(6).fill(BLUE), [0.15, 0.15, 0.15]),
  ],
  71: [
    { pointRange: 4, terrain: { range: 2, color: [0.92, 0.22, 0.22] } },
    ...bulbs([6, 5.5, 5, 5.5, 5, 5], [[0.5, 0, 0], ...Array(5).fill(RED)], [0.15, 0, 0]),
  ],
  75: [
    {
      offset: [0, -1, 201],
      bone: true,
      sprite: { scale: 3, color: [1, 1, 1], texture: 'flare', unscaled: true, spin: 0.1, smoothSpin: true },
    },
  ],
};

/**
 * Aida (GMAida.cpp:49-54, :283-320). 25/28 scroll V down `0.015`/tick;
 * 65/66 and 77/78 are drawn by `RenderAidaObjectVisual` with an explicit
 * `RenderMesh(0, RENDER_TEXTURE, …, U)` - a plain textured pass, so
 * `stream` rather than `blend`. Mesh indices for 25/28 are not set in the
 * C++ (the BMD's own blend flag decides); 0 is the single-mesh case.
 */
const SCROLL_25 = perTick(0.015);

export const AIDA_MESH_ANIMATIONS: MeshAnimations = {
  25: { mesh: 0, kind: 'blend', v: t => -SCROLL_25(t) },
  28: { mesh: 0, kind: 'blend', v: t => -SCROLL_25(t) },
  65: { mesh: 0, kind: 'stream', u: saw(100000, 0.00005) },
  66: { mesh: 0, kind: 'stream', u: saw(100000, 0.00005) },
  77: { mesh: 0, kind: 'stream', u: sawUp(100000, 0.0002) },
  78: { mesh: 0, kind: 'stream', u: sawUp(100000, 0.0002) },
};
