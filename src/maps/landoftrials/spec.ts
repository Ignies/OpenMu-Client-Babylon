import type { Emission } from '../../common/effectParticles';
import type { LightEmitter } from '../../lighting/mapObjectLights';

/**
 * Land of Trials (`WD_31HUNTING_GROUND`, `World32`/`Object32`), the plain-data
 * half. Nothing here may import the scene.
 *
 * EncTerrain32.obj places 7789 objects of 57 types - the densest map in the
 * data. The bulk is scenery with no code behind it: 13 (x1126,
 * `grass011.OZT`), 12 (x663, `hugerock02`), 24 (x535, `HugeRock03`), 48
 * (x466, `galdae02`) and 54 (x416, `magma_R`). `Object32` ships exactly the
 * 57 models the map indexes, so nothing here fails to load.
 *
 * The C++ is GMHuntingGround.cpp: `CreateHuntingGroundObject` (:30-44),
 * `MoveHuntingGroundObject` (:45-118), `RenderHuntingGroundObjectVisual`
 * (:120-160) and `RenderHuntingGroundObjectMesh` (:161-200). The last one is
 * the only part that needs classes - see `create.ts`.
 */

/** `CreateHuntingGroundObject` sets no blend mesh. */
export const LAND_OF_TRIALS_BLEND_MESHES: Readonly<Record<number, number>> = {};

/**
 * `MoveHuntingGroundObject`: `HiddenMesh = -2` on
 *
 *  - **1** (x57), **44** (x67), **45** (x68) (:55-90): butterfly spawners -
 *    every ~1 s (`timeGetTime() % 1024 < 10`) a `MODEL_BUTTERFLY01` effect
 *    model of SubType 0/1/2. No effect-model system here; they stay empty
 *    markers.
 *  - **3** (x298) and **53** (x318) (:91-94): `BITMAP_WATERFALL_3` SubType 3
 *    mist wisps and `BITMAP_SMOKE` SubType 22, both from
 *    `RenderHuntingGroundObjectVisual`.
 *  - **42** (x55) (:101-108): the brazier - red terrain light, see
 *    `LAND_OF_TRIALS_LIGHTS`.
 */
export const LAND_OF_TRIALS_EFFECT_ONLY_TYPES: readonly number[] = [
  1, 3, 42, 44, 45, 53,
];

/**
 * Types 3 and 53 (`RenderHuntingGroundObjectVisual` :129-142). Both are
 * `rand_fps_check(3)`, i.e. `every: 3`; they are halved to 6 because there
 * are 616 of the two between them and the densest 32-tile window holds 18
 * and 33. `smoke21` is the generic slow puff and `waterfall5_9` the only
 * falling kind - the mist wisp of `WATERFALL_3` SubType 3 rises, so the
 * substitution is the weaker of the two.
 */
export const LAND_OF_TRIALS_EMISSIONS: Partial<
  Record<number, readonly Emission[]>
> = {
  3: [{ kinds: ['waterfall5_9'], every: 6, scale: 0.4 }],
  53: [{ kinds: ['smoke21'], every: 6 }],
};

/**
 * Type 42 (x55), `MoveHuntingGroundObject` :101-108:
 * `L = (rand%4+3) * 0.1; AddTerrainLight(x, y, (0.9L, 0.2L, 0.1L), 3)` -
 * a deep-red brazier, hidden mesh, no sprite. Type 49 (x18),
 * `RenderHuntingGroundObjectVisual` :143-156: two `BITMAP_LIGHT` sprites and
 * a spinning `SHINY` at bone 3, white, sized by a sine - the crystal orbs;
 * no terrain light.
 *
 * The 42 point light is ours (the original has no dynamic lights); 55 of them
 * in the open at range 3, at most 6 in a 32-tile window, is well under the
 * pool.
 */
export const LAND_OF_TRIALS_LIGHTS: Partial<
  Record<number, readonly LightEmitter[]>
> = {
  42: [
    {
      pointRange: 5,
      terrain: {
        range: 3,
        color: [0.9, 0.2, 0.1],
        flicker: { min: 0.3, max: 0.6, steps: 4 },
      },
      emissions: [{ kinds: ['fire1', 'fire3'], every: 3, jitter: 6 }],
    },
  ],
  49: [
    {
      sprite: {
        scale: 1.5,
        color: [1, 1, 1],
        pulse: { speed: 1, amount: 0.4, base: 0.8 },
      },
    },
  ],
};
