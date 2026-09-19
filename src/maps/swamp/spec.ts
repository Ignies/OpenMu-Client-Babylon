import type { Emission } from '../../common/effectParticles';
import type { LightEmitter } from '../../lighting/mapObjectLights';

/**
 * Swamp of Calmness (`WD_56MAP_SWAMP_OF_QUIET`, `World57`/`Object57`), the
 * plain-data half. Nothing here may import the scene.
 *
 * EncTerrain57.obj places 4176 objects of 87 types (fourteen records outside
 * the block grid). Object57 ships 91 models; types 58, 59 and 64 (one record
 * each, by the shrine at 15/83 and 12/110) have no model. The C++ is
 * GMSwampOfQuiet.cpp: `CreateObject` (:54-67, empty - the 103 operate box is
 * commented out), `MoveObject` (:69-107), `RenderObjectVisual` (:130-202).
 */

/** No `o->BlendMesh` writes in the Swamp code. */
export const SWAMP_BLEND_MESHES: Readonly<Record<number, number>> = {};

/**
 * `MoveObject` :81-104 hides 57, 71, 72, 73, 74, 77, 78:
 *  - **57** (×18): the brazier - see `SWAMP_LIGHTS`.
 *  - **71** (×8): `BITMAP_TRUE_FIRE` SubType 5 - fire without light.
 *  - **72** (×59): `BITMAP_SMOKE` SubType 49 lifted 50 - marsh gas, in
 *    `marshGasObject.ts` because of that lift.
 *  - **73** (×51): hidden, nothing drawn (:171-172 is a bare `break`).
 *  - **74** (×11): `BITMAP_SMOKE` SubType 21 at twice scale.
 *  - **77** (×87), **78** (×117): `BITMAP_CLOUD` SubType 20 - the fog
 *    banks that make the map.
 */
export const SWAMP_EFFECT_ONLY_TYPES: readonly number[] = [
  57, 71, 72, 73, 74, 77, 78,
];

/**
 * The vents, `RenderObjectVisual` :149-199. 72 is not here: its plume spawns
 * half a tile above the marker and that needs a class (`marshGasObject.ts`).
 *
 * 77/78 are 204 emitters, and they do repeat - `rand_fps_check(6)` with no
 * `HiddenMesh` guard (:182-199) - so what keeps them off the screen is the
 * light the C++ gives them, `(0.04, 0.06, 0.03)` and `(0.03, 0.03, 0.05)`.
 * On an additive sprite that is a breath of colour over the ground; the white
 * they defaulted to before was 204 searchlights.
 *
 * Both fog banks are `BITMAP_CLOUD` SubType **20**, and `cloud21` is SubType
 * 21 (ZzzEffectParticle.cpp:3028-3062, :7833-7864): same sheet, same shape,
 * a third of the life (100 ticks against 300), half the scatter (±100 against
 * ±250) and twice the climb. The bank turns over faster than the original's
 * and holds fewer cards at once; no kind in `effectParticles` is the slow
 * one, and adding one is a shared-file change.
 */
export const SWAMP_EMISSIONS: Partial<Record<number, readonly Emission[]>> = {
  71: [{ kinds: ['fire1', 'fire2'], every: 3, light: [1, 0.6, 0.3] }],
  74: [{ kinds: ['smoke21'], every: 3, scale: 2 }],
  77: [{ kinds: ['cloud21'], every: 6, light: [0.04, 0.06, 0.03] }],
  78: [{ kinds: ['cloud21'], every: 6, light: [0.03, 0.03, 0.05] }],
};

/**
 * Type 57 (×18), `MoveObject` :81-86: `L = (rand%4+3)*0.1;
 * AddTerrainLight(x, y, (L, 0.6L, 0.2L), 3)` + hidden; the render side
 * (:139-148) adds `TRUE_FIRE` SubType 5 and `SMOKE` SubType 21, both at
 * `rand_fps_check(3)`. The point light and the 2/6 split of that one rate
 * are this port's, not the original's: a brazier reads as a flame with smoke
 * drifting off it rather than as equal parts of both.
 */
export const SWAMP_LIGHTS: Partial<Record<number, readonly LightEmitter[]>> = {
  57: [
    {
      pointRange: 5,
      terrain: {
        range: 3,
        color: [1, 0.6, 0.2],
        flicker: { min: 0.3, max: 0.6, steps: 4 },
      },
      emissions: [
        { kinds: ['fire1', 'fire3'], every: 2, jitter: 6 },
        { kinds: ['smoke21'], every: 6 },
      ],
    },
  ],
};
