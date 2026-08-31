import { ENUM_WORLD } from '../../common/types';
import type { MapLayer } from '../layer';
import { FULL_TILES } from '../recipes';
import {
  LAND_OF_TRIALS_BLEND_MESHES,
  LAND_OF_TRIALS_EFFECT_ONLY_TYPES,
  LAND_OF_TRIALS_EMISSIONS,
} from './spec';

/**
 * Land of Trials (World32 / Object32) — the map entry: identity and the per-world data the
 * renderer, the terrain loader, the weather and the sound tables read.
 *
 * No `create`: every runtime behaviour of this map is table data (spec.ts) or
 * lives in another system; the notes below say what is and is not built.
 *
 * Land of Trials (`WD_31HUNTING_GROUND`, `World32`/`Object32`).
 *
 * Every runtime behaviour is table data in `spec.ts` — the six hidden
 * emitter/marker types, the brazier light and the crystal flares.
 *
 * Not built:
 *  - **Type 27** (×28): `Position[2] += sin(Timer + t*0.0024) * 0.3` per
 *    frame — a ±0.3 MU (0.003 tile) bob that is below what the camera can
 *    resolve; `CreateHuntingGroundObject` seeds `Timer` only for this and 54.
 *  - **The butterflies** on 1/44/45 (effect models) and **`CreateMist`**
 *    (the leaves slot, GMHuntingGround.cpp) — the first needs an effect-model
 *    system, the second is a weather-layer recipe.
 *  - `SOUND_BC_HUNTINGGROUND_AMBIENT` is fired once every 300 s
 *    (`g_MusicStartStamp`, :109-112); the sample is a long loop, so it is a
 *    bed in `ambientBeds.ts`. Music `Music/huntingground`.
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
// None: the map's runtime state lives in the objects `create` binds.

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
