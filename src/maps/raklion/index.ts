import { ENUM_WORLD } from '../../common/types';
import type { MapLayer } from '../layer';
import { FULL_TILES } from '../recipes';
import {
  RAKLION_BLEND_MESHES,
  RAKLION_EFFECT_ONLY_TYPES,
  RAKLION_EMISSIONS,
} from './spec';

/**
 * Raklion (World58 / Object58) — the map entry: identity and the per-world data the
 * renderer, the terrain loader, the weather and the sound tables read.
 *
 * No `create`: every runtime behaviour of this map is table data (spec.ts) or
 * lives in another system; the notes below say what is and is not built.
 *
 * Raklion (`WD_57ICECITY`, `World58`/`Object58`) — the ice field.
 *
 * `CGM_Raklion::CreateObject` (GM_Raklion.cpp:52-84): `MODEL_WARP4` spawns
 * the three-model warp-gate effect (`CreateEffect(MODEL_WARP4/5/6)` 5.2
 * tiles up) — an effect-model stack, not built. `MoveObject` (:244-269) is
 * the two hidden braziers (`spec.ts`) and the 22 sine (`meshAnimation.ts`);
 * `MoveEffect` (:2742) runs the Selupan fight's screen effects only while
 * the boss state machine is live.
 *
 * Snow: `g_Raklion.CreateSnow` is the leaves slot for both Ice City worlds,
 * so the two join `SNOW_MAPS` in `weather/ambientWeather.ts` and get the
 * Devias flakes and snow cap.
 *
 * Sound: no `PlayWorldAmbientSounds` case for 57 (the hatchery has the
 * wind); `PlayObjectSound` (:2671) is the boss room's. `Music/Raklion`.
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
  blendMeshes: RAKLION_BLEND_MESHES,
  effectOnly: RAKLION_EFFECT_ONLY_TYPES,
  emissions: RAKLION_EMISSIONS,
};
