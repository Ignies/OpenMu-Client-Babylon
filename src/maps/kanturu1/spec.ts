import type { Emission } from '../../common/effectParticles';
import type { LightEmitter } from '../../lighting/mapObjectLights';

/**
 * Kanturu Ruins (`WD_37KANTURU_1ST`, `World38`/`Object38`), the plain-data
 * half. Nothing here may import the scene.
 *
 * EncTerrain38.obj places 3645 objects of 100 types; Object38 ships 111
 * models and every referenced type has one. The C++ is GM_kanturu_1st.cpp:
 * `CreateKanturu1stObject` (:33, a bare `return true`),
 * `MoveKanturu1stObject` (:41-125) and `RenderKanturu1stObjectVisual`
 * (:127-305).
 *
 * The same `MoveKanturu1stObject` also runs on the GM area (`WD_40AREA_FOR_GM`,
 * `World41`, :43) and `CGMDoppelGanger4::MoveObject` is a line-for-line copy
 * of it (GMDoppelGanger4.cpp:61-133), so `maps/gmarea` and
 * `maps/doppelganger4` import these tables rather than restate them.
 */

/**
 * No `o->BlendMesh` writes. The `BlendMeshLight` sines on 46 and 102 and the
 * V scroll on 77 are in `meshAnimation.ts`; the additive mesh is whichever
 * the BMD flags.
 */
export const KANTURU1_BLEND_MESHES: Readonly<Record<number, number>> = {};

/**
 * `MoveKanturu1stObject` :55-63 hides 59, 62, 81, 82, 83, 107, 108; :74-79
 * hides 60/61 (the brazier lights, see `KANTURU1_LIGHTS`); :116-123 hides
 * 97; `RenderKanturu1stObjectVisual` :136-146 hides 37 after its butterfly
 * spawn.
 *
 *  - **37** (×58): butterflies (`MODEL_BUTTERFLY01`, an effect model) — empty
 *    marker here.
 *  - **59** (×16): `BITMAP_SMOKE` puffs (:148-155).
 *  - **62** (×60), **107** (×77), **108** (×11): `BITMAP_CLOUD` SubType 1
 *    mist, one in eight (:164-172, :272-291).
 *  - **81** (×26) `WATERFALL_1` one in two, **82** (×35) `WATERFALL_3` every
 *    tick, **83** (×52) `WATERFALL_2` one in two (:185-201) — the falls by
 *    the wheel at 55/58.
 *  - **97** (×1): a 10-tick timer, bubbles (`BITMAP_BUBBLE` SubType 5) for
 *    the second half of it — the spring at 207/150.
 */
export const KANTURU1_EFFECT_ONLY_TYPES: readonly number[] = [
  37, 59, 60, 61, 62, 81, 82, 83, 97, 107, 108,
];

/**
 * The emitters. Bubbles have no kind in `effectParticles`; 97 uses the
 * generic rising `smoke0` at a low rate and the 5-of-10 duty cycle is
 * dropped — a single object at the far edge of the map.
 */
export const KANTURU1_EMISSIONS: Partial<Record<number, readonly Emission[]>> =
  {
    59: [{ kinds: ['smoke21'], every: 3 }],
    62: [{ kinds: ['cloud21'], every: 8 }],
    81: [{ kinds: ['waterfall5_9'], every: 2 }],
    82: [{ kinds: ['waterfall5_9'], every: 1 }],
    83: [{ kinds: ['waterfall5_9'], every: 2 }],
    97: [{ kinds: ['smoke0'], every: 6, scale: 0.4 }],
    107: [{ kinds: ['cloud21'], every: 8 }],
    108: [{ kinds: ['cloud21'], every: 8 }],
  };

/**
 * `MoveKanturu1stObject`:
 *  - **60** (×5), :64-70: `L = (rand%4+3)*0.1; AddTerrainLight(x, y,
 *    (0.9L, 0.2L, 0.1L), 3)` + hidden — a deep-red brazier; the render
 *    side (:156-162) adds `BITMAP_TRUE_FIRE` particles.
 *  - **61** (×58), :71-77: the same with `(L, 0.6L, 0.2L)` — the orange
 *    brazier, again `TRUE_FIRE` (:156-162).
 *  - **70** (×0 placed, table kept to match the source), :80-88: `Velocity
 *    0.04` and a pulsing `(1.4, 0.7, 0.4) * (sin(t*0.002)*0.45+0.55)` at
 *    range 4, plus two sprites at bone 6.
 *  - **105** (×0 placed) and **110** (×0 placed): sprites only (:238-268,
 *    :292-302).
 */
export const KANTURU1_LIGHTS: Partial<Record<number, readonly LightEmitter[]>> =
  {
    60: [
      {
        pointRange: 5,
        terrain: {
          range: 3,
          color: [0.9, 0.2, 0.1],
          flicker: { min: 0.3, max: 0.6, steps: 4 },
        },
        emissions: [{ kinds: ['fire1', 'fire3'], every: 2, jitter: 6 }],
      },
    ],
    61: [
      {
        pointRange: 5,
        terrain: {
          range: 3,
          color: [1, 0.6, 0.2],
          flicker: { min: 0.3, max: 0.6, steps: 4 },
        },
        emissions: [{ kinds: ['fire1', 'fire3'], every: 2, jitter: 6 }],
      },
    ],
    70: [
      {
        pointRange: 6,
        terrain: {
          range: 4,
          color: [1.4, 0.7, 0.4],
          flicker: { min: 0.1, max: 1, steps: 6 },
        },
        sprite: {
          scale: 2,
          color: [1, 0.6, 0.3],
          pulse: { speed: 2, amount: 0.45, base: 0.55 },
        },
      },
    ],
  };
