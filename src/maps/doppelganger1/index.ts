import { ENUM_WORLD } from '../../common/types';
import type { MapLayer } from '../layer';
import { FULL_TILES } from '../recipes';
import {
  DOPPELGANGER1_BLEND_MESHES,
  DOPPELGANGER1_EFFECT_ONLY_TYPES,
  DOPPELGANGER1_EMISSIONS,
} from './spec';

/**
 * Doppelganger 1 (World66 / Object66) — the map entry: identity and the per-world data the
 * renderer, the terrain loader, the weather and the sound tables read.
 *
 * No `create`: every runtime behaviour of this map is table data (spec.ts) or
 * lives in another system; the notes below say what is and is not built.
 *
 * Doppelganger 1 (`WD_65DOPPLEGANGER1`, `World66`/`Object66`) — the first
 * of the four Mirror-of-Illusion arenas, built from Raklion's art.
 *
 * Tables in `spec.ts`. Not built: the event (`g_pDoppelGangerFrame`), the
 * mirror-image player monsters (`CreateMonster`, :53-168 — server
 * characters), and `PlayBGM`'s `iDoppelganger`, which the original only
 * starts while the event is enabled (:669-693) — so `null` in `music.ts`.
 * Clear colour `(148, 179, 223)/256` (SceneManager.cpp:365) is set by
 * `loadMapIntoScene`.
 */

// ---- 1. data ---------------------------------------------------------------

const WORLDS: readonly ENUM_WORLD[] = [
  ENUM_WORLD.WD_65DOPPLEGANGER1,
];

// OpenMU's spawn gate (VersionSeasonSix/Gates.cs, the `isSpawnGate: true` row), centred.
const SPAWN = { x: 196, y: 29 } as const;

// Open sky ("Later worlds"). The original only rains on a few of the
// Season 2-6 fields (`CreateRain` on the Fortress days 1-3 and Loren Market,
// weather-gated leaves on Crywolf and the Valley); the rest are outdoors in
// the same sense Noria and Tarkan are.
const OUTDOOR = true;

// SceneManager.cpp:365 — the one arena with a daylight sky colour.
const CLEAR_COLOR = [148, 179, 223] as const;

// ---- 2. state + readers ----------------------------------------------------
// None: the map's runtime state lives in the objects `create` binds.

// ---- 3. the layer ----------------------------------------------------------

export const doppelganger1Layer: MapLayer = {
  name: 'doppelganger1',
  worlds: WORLDS,
  tiles: FULL_TILES,
  spawn: SPAWN,
  outdoor: OUTDOOR,
  // Event set-piece: an authored moment, not a place with days.
  dayCycle: 0,
  clearColor: CLEAR_COLOR,
  blendMeshes: DOPPELGANGER1_BLEND_MESHES,
  effectOnly: DOPPELGANGER1_EFFECT_ONLY_TYPES,
  emissions: DOPPELGANGER1_EMISSIONS,
};
