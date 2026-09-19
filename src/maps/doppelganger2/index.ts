import { ENUM_WORLD } from '../../common/types';
import type { MapLayer } from '../layer';
import {
  DOPPELGANGER2_BLEND_MESHES,
  DOPPELGANGER2_EFFECT_ONLY_TYPES,
  DOPPELGANGER2_EMISSIONS,
} from './spec';

/**
 * Doppelganger 2 (World67 / Object67) - the map entry: identity and the per-world data the
 * renderer, the terrain loader, the weather and the sound tables read.
 *
 * No `create`: every runtime behaviour of this map is table data (spec.ts) or
 * lives in another system; the notes below say what is and is not built.
 *
 * Doppelganger 2 (`WD_66DOPPLEGANGER2`, `World67`/`Object67`) - the lava
 * arena. Vulcanus' vent tables plus this map's own sheets via `spec.ts`;
 * music `null` (event-gated, see doppelganger1).
 *
 * Not built: `CreateFireSpark` (:656-685, embers drifting past the hero - the
 * leaves slot, a weather recipe), the monster hooks (`MoveMonsterVisual`
 * :80-190, `MoveBlurEffect` :192-229, `RenderMonsterVisual` :549-623), and
 * types **67** and **68** (:261-346), the lava cannon: a scrolling stream
 * mesh, a chrome pass, two `BITMAP_LIGHT` sprites off bone 6 and a smoke
 * plume keyed to animation frames, with a 2-in-1000 roll holding it at frame
 * 1. Neither is placed in World67 and neither has a model in Object67.
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
