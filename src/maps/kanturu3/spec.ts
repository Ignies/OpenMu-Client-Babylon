import type { Emission } from '../../common/effectParticles';
import type { LightEmitter } from '../../lighting/mapObjectLights';

/**
 * Kanturu Remain (`WD_39KANTURU_3RD`, `World40`/`Object40`), the plain-data
 * half. Nothing here may import the scene.
 *
 * EncTerrain40.obj places 1459 objects of 68 types; Object40 ships 81 models
 * and every referenced type has one. The C++ is GM_Kanturu_3rd.cpp:
 * `CreateKanturu3rdObject` (:92-116), `MoveKanturu3rdObject` (:118-196),
 * `RenderKanturu3rdObjectVisual` (:198-393).
 */

/** No `o->BlendMesh` writes in the Kanturu 3rd code. */
export const KANTURU3_BLEND_MESHES: Readonly<Record<number, number>> = {};

/**
 * `CreateKanturu3rdObject` :101-110 hides 32, 47, 51, 52, 53, 54, 57, 58,
 * 70 at creation; `MoveKanturu3rdObject` :158-161 hides 48 and :147-157 hides
 * 45 (one tick in three, i.e. always, after the first hit); the render side
 * hides 1, 11, 46, 49, 50 on their first frame and 74.
 *
 *  - **1** (×21) / **11** (×50) / **46** (×49) / **49** (×24) / **50**
 *    (×20): `BITMAP_CLOUD` SubType 1/3/7/1/4 — the tower's steam.
 *  - **32** (×5): `BITMAP_TWINTAIL_WATER`; **52** (×8): `BITMAP_TRUE_BLUE`;
 *    **53** (×32): `BITMAP_SMOKE` SubType 46.
 *  - **45** (×26), **50**, **54** (×45): white terrain-light flashes, see
 *    `KANTURU3_LIGHTS`.
 *  - **47** (×105), **48** (×13), **51** (×0), **57** and **58** (×1 each),
 *    **70** (×1), **74** (×12): hidden, no effect.
 */
export const KANTURU3_EFFECT_ONLY_TYPES: readonly number[] = [
  1, 11, 32, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 57, 58, 70, 74,
];

/** The steam and the sprays. */
export const KANTURU3_EMISSIONS: Partial<Record<number, readonly Emission[]>> =
  {
    1: [{ kinds: ['cloud21'], every: 8 }],
    11: [{ kinds: ['cloud21'], every: 6 }],
    32: [{ kinds: ['waterfall5_9'], every: 3, scale: 0.5 }],
    46: [{ kinds: ['cloud21'], every: 4 }],
    49: [{ kinds: ['cloud21'], every: 8 }],
    50: [{ kinds: ['cloud21'], every: 6 }],
    52: [{ kinds: ['wingFlareBlue'], every: 3 }],
    53: [{ kinds: ['smoke21'], every: 3 }],
  };

/**
 * `MoveKanturu3rdObject`:
 *  - **45** (×26), :147-157: one tick in three, `L = (rand%4+3)*0.3` white
 *    at range `1 + scale/2` — the machinery's arc lights.
 *  - **50** (×20), :163-171: one in three, `L = (rand%10)*0.2` white at
 *    range `1 + scale` — harsher, flickering to black.
 *  - **54** (×45), :173-184: a single flash on the first frame, then hidden
 *    — a one-shot, reduced here to a dim steady glow.
 *  - **5** (×13, `RenderKanturu3rdObjectVisual` :262-272): `BITMAP_LIGHT`
 *    plus two counter-spinning `SHINY` sprites at bone 1 — the crystal
 *    lamps, no terrain light.
 *
 * `range` is fixed at the scale-1 value; the objects sit at 1.0-1.9.
 */
export const KANTURU3_LIGHTS: Partial<Record<number, readonly LightEmitter[]>> =
  {
    45: [
      {
        pointRange: 3,
        terrain: {
          range: 2,
          color: [1, 1, 1],
          flicker: { min: 0.5, max: 1, steps: 4 },
        },
      },
    ],
    50: [
      {
        pointRange: 3,
        terrain: {
          range: 2,
          color: [1, 1, 1],
          flicker: { min: 0, max: 1, steps: 6 },
        },
      },
    ],
    54: [
      {
        terrain: { range: 2, color: [0.4, 0.4, 0.4] },
      },
    ],
    5: [
      {
        sprite: {
          scale: 1.4,
          color: [0.7, 0.8, 1],
          pulse: { speed: 1.5, amount: 0.3, base: 0.8 },
        },
      },
    ],
  };
