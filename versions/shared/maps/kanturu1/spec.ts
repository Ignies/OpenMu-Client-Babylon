import type { Emission } from '@/controllers/fx/effectParticles';
import type { LightEmitter } from '@/controllers/lighting/mapObjectLights';
import type { MeshAnimations } from '@/controllers/render';
import { isOn } from '@/controllers/fidelity';
import { saw } from '../shared/meshAnimation';

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
 * of it (GMDoppelGanger4.cpp:61-133), so `versions/shared/maps/gmarea` and
 * `versions/shared/maps/doppelganger4` import these tables rather than restate them.
 */

/**
 * No `o->BlendMesh` writes. The `BlendMeshLight` sines on 46 and 102 and the
 * V scroll on 77 are in the `render.meshAnimations` rows; the additive mesh is whichever
 * the BMD flags.
 */
export const KANTURU1_BLEND_MESHES: Readonly<Record<number, number>> = {};

/**
 * `MoveKanturu1stObject` :55-63 hides 59, 62, 81, 82, 83, 107, 108; :74-79
 * hides 60/61 (the brazier lights, see `KANTURU1_LIGHTS`); :116-123 hides
 * 97; `RenderKanturu1stObjectVisual` :136-146 hides 37 after its butterfly
 * spawn.
 *
 *  - **37** (×58): butterflies (`MODEL_BUTTERFLY01`, an effect model) - empty
 *    marker here.
 *  - **59** (×16): `BITMAP_SMOKE` puffs (:148-155).
 *  - **62** (×60), **107** (×77), **108** (×11): `BITMAP_CLOUD` SubType 1
 *    mist, one in eight (:164-172, :272-291).
 *  - **81** (×26) `WATERFALL_1` one in two, **82** (×35) `WATERFALL_3` every
 *    tick, **83** (×52) `WATERFALL_2` one in two (:185-201) - the falls by
 *    the wheel at 55/58.
 *  - **97** (×1): a 10-tick timer, bubbles (`BITMAP_BUBBLE` SubType 5) for
 *    the second half of it - the spring at 207/150.
 */
export const KANTURU1_EFFECT_ONLY_TYPES: readonly number[] = [
  37, 59, 60, 61, 62, 81, 82, 83, 97, 107, 108,
];

/**
 * The emitters. Bubbles have no kind in `effectParticles`; 97 uses the
 * generic rising `smoke0` at a low rate and the 5-of-10 duty cycle is
 * dropped - a single object at the far edge of the map.
 *
 * **62**, **107** and **108** emit nothing. Each body sits behind
 * `if (pObject->HiddenMesh != -2)` (:164-172, :272-291) and the move hook
 * sets that on all three every frame, so each fires once at most: 20
 * `BITMAP_CLOUD` at `(0.04)`, `(0.06)` and `(0.2)` grey, which is near-black
 * on an additive sprite and gone in two ticks besides (the SubType has no
 * init, so `LifeTime` stays `CreateParticle`'s default 2). 148 emitters
 * streaming white `cloud21` instead is a fog bank over the whole map.
 */
export const KANTURU1_EMISSIONS: Partial<Record<number, readonly Emission[]>> =
  {
    59: [{ kinds: ['smoke21'], every: 3 }],
    81: [{ kinds: ['waterfall5_9'], every: 2 }],
    82: [{ kinds: ['waterfall5_9'], every: 1 }],
    83: [{ kinds: ['waterfall5_9'], every: 2 }],
    97: [{ kinds: ['smoke0'], every: 6, scale: 0.4 }],
  };

/**
 * `MoveKanturu1stObject`:
 *  - **60** (×5), :71-77: `L = (rand%4+3)*0.1; AddTerrainLight(x, y,
 *    (0.9L, 0.2L, 0.1L), 3)` + hidden - a deep-red brazier. Nothing renders
 *    it: its fire is ours (`lampFlares`).
 *  - **61** (×58), :78-84: the same with `(L, 0.6L, 0.2L)` - the orange
 *    brazier; the render side (:158-164) adds a `BITMAP_TRUE_FIRE` particle
 *    one tick in three. Its sheet, fantaF.jpg, has no kind: `fire1`/`fire3`
 *    stand in. 60's fire (ours) is the same.
 *  - **70** (×0 placed here, in the GM area and on Doppelganger 4; table
 *    kept to match the source), :85-91: `Velocity 0.04` and a pulsing
 *    `(1.4, 0.7, 0.4) * (sin(t*0.002)*0.45+0.55)` at range 4, plus
 *    (`RenderKanturu1stObjectVisual` :175-186) two `BITMAP_SPARK + 1`
 *    (Spark03.jpg) sprites at bone 6, `(0.8, 0.4, 0.2)` at `L * 7` over grey
 *    0.65 at `L * 4`, `L = sin(WorldTime * 0.002) + 1.8`: the size breathes,
 *    not the colour, and there is no `* o->Scale`.
 *  - **105** (×0 placed) and **110** (×0 placed): sprites only (:238-268,
 *    :292-302).
 */
const LAMP_GROW = { speed: 0.002, amount: 1, base: 0.8 };

/** Ours (`lampFlares`, none on Classic): the original hides 60 and draws nothing there (:71-77). */
const DEEP_RED_FIRE: readonly Emission[] = [{ kinds: ['fire1', 'fire3'], every: 3, jitter: 6 }];

/** One of 70's two sparks on bone 6, at its rest height. */
const lampSpark = (
  scale: number,
  color: readonly [number, number, number]
): LightEmitter => ({
  offset: [0, -1, 200],
  bone: true,
  sprite: { scale, color, grow: LAMP_GROW, texture: 'spark1', unscaled: true },
});

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
        get emissions() {
          return isOn('lampFlares') ? DEEP_RED_FIRE : undefined;
        },
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
        emissions: [{ kinds: ['fire1', 'fire3'], every: 3, jitter: 6 }],
      },
    ],
    70: [
      {
        pointRange: 6,
        terrain: {
          range: 4,
          color: [1.4, 0.7, 0.4],
          pulse: { speed: 0.002, amount: 0.45, base: 0.1 },
        },
      },
      lampSpark(7, [0.8, 0.4, 0.2]),
      lampSpark(4, [0.65, 0.65, 0.65]),
    ],
  };

/**
 * Kanturu Ruins (GM_kanturu_1st.cpp:64-69, :92-96, :113-115): the great
 * wheel's glow (46), the waterfall sheet (77) and the crystal (102). Shared
 * with the GM area (40) and Doppelganger 4 (GMDoppelGanger4.cpp:88-133).
 */
export const KANTURU1_MESH_ANIMATIONS: MeshAnimations = {
  46: { mesh: 0, kind: 'blend', light: t => Math.sin(t * 0.0015) * 0.8 + 1 },
  77: { mesh: 0, kind: 'blend', v: saw(10000, 0.0002) },
  102: { mesh: 0, kind: 'blend', light: t => Math.sin(t * 0.001) + 1 },
};
