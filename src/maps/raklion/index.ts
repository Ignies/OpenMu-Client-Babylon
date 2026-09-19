import { ENUM_WORLD } from '../../common/types';
import type { MapLayer } from '../layer';
import { FULL_TILES } from '../recipes';
import {
  RAKLION_BLEND_MESHES,
  RAKLION_EFFECT_ONLY_TYPES,
  RAKLION_EMISSIONS,
} from './spec';

/**
 * Raklion (World58 / Object58) - the map entry: identity and the per-world data the
 * renderer, the terrain loader, the weather and the sound tables read.
 *
 * Raklion (`WD_57ICECITY`, `World58`/`Object58`) - the ice field. The object
 * behaviour is in `create.ts`, which also lists what is deliberately left
 * out; the plain tables are in `spec.ts` and `common/meshAnimation.ts`.
 *
 * Snow: `g_Raklion.CreateSnow` (:2257-2280) is the leaves slot for both Ice
 * City worlds, so the two join `SNOW_MAPS` in `weather/ambientWeather.ts` -
 * the sky is snow and rain never falls here. Nothing falls out of it either:
 * see the `SNOWFALL` note below.
 *
 * Sound: no `PlayWorldAmbientSounds` case for 57 (the hatchery has the
 * wind); `PlayObjectSound` (:2728) is an empty body on this map class.
 * `Music/Raklion`.
 */

// ---- 1. data ---------------------------------------------------------------

const WORLDS: readonly ENUM_WORLD[] = [
  ENUM_WORLD.WD_57ICECITY,
];

// OpenMU's spawn gate (VersionSeasonSix/Gates.cs, the `isSpawnGate: true` row), centred.
const SPAWN = { x: 223, y: 211 } as const;

// Open sky ("Later worlds"). The original only rains on a few of the
// Season 2-6 fields (`CreateRain` on the Fortress days 1-3 and Loren Market,
// weather-gated leaves on Crywolf and the Valley); the rest are outdoors in
// the same sense Noria and Tarkan are.
const OUTDOOR = true;

// `g_Raklion.CreateSnow` (ZzzEffectFireLeave.cpp:481): the leaves-slot snow maker.
const SNOW = true;

// No flakes over the ice. The original's Ice City fall is a fast, near-flat
// blizzard (scale 3-12, tilted 50-79 degrees, 30-49 u/tick -
// GM_Raklion.cpp:2262-2277); what we have is the Devias flake, and a slow
// vertical drift over a field that is already white reads as speckle on the
// screen rather than weather. The sky stays snow so rain can never reach the
// ice field, and with no fall nothing settles on it either.
const SNOWFALL = false;

// ---- 2. state + readers ----------------------------------------------------
// None: the map's runtime state lives in the objects `create` binds.

// ---- 3. the layer ----------------------------------------------------------

export const raklionLayer: MapLayer = {
  name: 'raklion',
  worlds: WORLDS,
  tiles: FULL_TILES,
  spawn: SPAWN,
  outdoor: OUTDOOR,
  snow: SNOW,
  snowfall: SNOWFALL,
  blendMeshes: RAKLION_BLEND_MESHES,
  effectOnly: RAKLION_EFFECT_ONLY_TYPES,
  emissions: RAKLION_EMISSIONS,
  create: world => import('./create').then(m => m.createRaklion(world)),
};
