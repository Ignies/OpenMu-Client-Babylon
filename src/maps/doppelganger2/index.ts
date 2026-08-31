import { ENUM_WORLD } from '../../common/types';
import type { MapLayer } from '../layer';
import {
  DOPPELGANGER2_BLEND_MESHES,
  DOPPELGANGER2_EFFECT_ONLY_TYPES,
  DOPPELGANGER2_EMISSIONS,
} from './spec';

/**
 * Doppelganger 2 (World67 / Object67) — the map entry: identity and the per-world data the
 * renderer, the terrain loader, the weather and the sound tables read.
 *
 * No `create`: every runtime behaviour of this map is table data (spec.ts) or
 * lives in another system; the notes below say what is and is not built.
 *
 * Doppelganger 2 (`WD_66DOPPLEGANGER2`, `World67`/`Object67`) — the lava
 * arena. Vulcanus' tables via `spec.ts`; `CreateFireSpark` embers not built;
 * music `null` (event-gated, see doppelganger1).
 */

// ---- 1. data ---------------------------------------------------------------

const WORLDS: readonly ENUM_WORLD[] = [
  ENUM_WORLD.WD_66DOPPLEGANGER2,
];

// The Vulcanus list: slot 11 is `song_lava1.jpg` here too (MapManager.cpp:1424,
// `IsDoppelGanger2()`), TileWater02 stands in; slot 12 Rock04 for the unbound Rock06.
const TILES: readonly string[] = [
  'TileGrass01',
  'TileGrass02',
  'TileGround01',
  'TileGround02',
  'TileGround03',
  'TileWater01',
  'TileWood01',
  'TileRock01',
  'TileRock02',
  'TileRock03',
  'TileRock04',
  'TileWater02',
  'TileRock04',
];

// OpenMU's spawn gate (VersionSeasonSix/Gates.cs, the `isSpawnGate: true` row), centred.
const SPAWN = { x: 136, y: 71 } as const;

// ---- 2. state + readers ----------------------------------------------------
// None: the map's runtime state lives in the objects `create` binds.

// ---- 3. the layer ----------------------------------------------------------

export const doppelganger2Layer: MapLayer = {
  name: 'doppelganger2',
  worlds: WORLDS,
  tiles: TILES,
  spawn: SPAWN,
  blendMeshes: DOPPELGANGER2_BLEND_MESHES,
  effectOnly: DOPPELGANGER2_EFFECT_ONLY_TYPES,
  emissions: DOPPELGANGER2_EMISSIONS,
};
