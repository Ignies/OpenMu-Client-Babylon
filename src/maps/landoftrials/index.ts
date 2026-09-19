import { ENUM_WORLD } from '../../common/types';
import type { MapLayer } from '../layer';
import { FULL_TILES } from '../recipes';
import {
  LAND_OF_TRIALS_BLEND_MESHES,
  LAND_OF_TRIALS_EFFECT_ONLY_TYPES,
  LAND_OF_TRIALS_EMISSIONS,
} from './spec';

/**
 * Land of Trials (`WD_31HUNTING_GROUND`, `World32`/`Object32`) - the map
 * entry: identity and the per-world data the renderer, the terrain loader,
 * the weather and the sound tables read.
 *
 * No `create`: the hidden emitter/marker types, the brazier light and the
 * crystal flares are all table data in `spec.ts`.
 *
 * `RenderHuntingGroundObjectMesh` (GMHuntingGround.cpp:161-200) gives four
 * types a body light of its own, and none of the four can be expressed yet:
 *
 *  - **10** (×76), :180-188: `BodyLight = (0.56, 0.80, 0.81)` outright - the
 *    canopy light shafts, `sunlights_R`.
 *  - **27** (×28), :165-179: `BodyLight *= sin(Timer + WorldTime * 0.0012)
 *    * 0.5 + 0.9`, `Timer` seeded per object by `CreateHuntingGroundObject`
 *    (:37-40), so they breathe out of step. `angeflo_R`.
 *  - **52** (×73), :189-197: the same at `0.0009`, but `Timer` is never
 *    seeded for 52 and `CreateObject` zeroes it (ZzzObject.cpp:4490), so all
 *    73 breathe in unison. `sunlights_R`.
 *  - **54** (×416), :161-164: the `0.0012` pulse again, phased - the lava
 *    running through the field, `magma_R`.
 *
 * All four are `_R` textures, which `parseTextureScript` marks bright and
 * `createItemMaterial` then composes through `brightOverride`
 * (`common/itemMaterial.ts`) - and that drops the body-light multiply on any
 * bright mesh that does not also scroll. This map has no `meshAnimation` row,
 * so a class writing `metadata.bodyLight` here changes nothing on screen
 * while costing 593 of the map's 7789 records their place in the prop
 * batches. The same term is what makes `TarkanLightShaftObject`'s override a
 * no-op; it is an open entry in the workspace register. When it is restored,
 * these four are ready - the detail to keep is 52's unison against 27/54's
 * per-object seeding.
 *
 * Also not built: type 27's `Position[2] +=` bob (:95-100), which accumulates
 * rather than offsets and is frame-rate dependent by construction; the
 * butterflies on 1/44/45 (`MODEL_BUTTERFLY01`, :55-90), which need an
 * effect-model system; and `CreateMist` (:1002-1071), a weather recipe.
 *
 * `SOUND_BC_HUNTINGGROUND_AMBIENT` is fired once every 300 s
 * (`g_MusicStartStamp`, GMHuntingGround.cpp:112-116); the sample is a long
 * loop, so it is a bed in `ambientBeds.ts`. Music `Music/huntingground`
 * (`MUSIC_BC_HUNTINGGROUND`, SceneManager.cpp:1120-1125).
 */

// ---- 1. data ---------------------------------------------------------------

const WORLDS: readonly ENUM_WORLD[] = [
  ENUM_WORLD.WD_31HUNTING_GROUND,
];

// OpenMU's spawn gate (VersionSeasonSix/Gates.cs, the `isSpawnGate: true` row), centred.
const SPAWN = { x: 64, y: 14 } as const;

// Open sky ("Later worlds"). The original only rains on a few of the
// Season 2-6 fields (`CreateRain` on the Fortress days 1-3 and Loren Market,
// weather-gated leaves on Crywolf and the Valley); the rest are outdoors in
// the same sense Noria and Tarkan are.
const OUTDOOR = true;

// ---- 2. state + readers ----------------------------------------------------
// None: this entry is data only.

// ---- 3. the layer ----------------------------------------------------------

export const landoftrialsLayer: MapLayer = {
  name: 'landoftrials',
  worlds: WORLDS,
  tiles: FULL_TILES,
  spawn: SPAWN,
  outdoor: OUTDOOR,
  blendMeshes: LAND_OF_TRIALS_BLEND_MESHES,
  effectOnly: LAND_OF_TRIALS_EFFECT_ONLY_TYPES,
  emissions: LAND_OF_TRIALS_EMISSIONS,
};
