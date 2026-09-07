import { ENUM_WORLD } from '../../common/types';
import type { MapLayer } from '../layer';
import {
  ATLANS_BLEND_MESHES,
  ATLANS_EFFECT_ONLY_TYPES,
  ATLANS_EMISSIONS,
} from './spec';

/**
 * Atlans (World8 / Object8) — the map entry: identity and the per-world data the
 * renderer, the terrain loader, the weather and the sound tables read.
 * The object classes and the setup function are in `create.ts`, loaded on demand.
 */

// ---- 1. data ---------------------------------------------------------------

const WORLDS: readonly ENUM_WORLD[] = [
  ENUM_WORLD.WD_7ATLANSE,
];

// World8 has no TileGround02 and no TileWater01: Ground01 / Grass01 stand in
// for slots 3 and 5.
const TILES: readonly string[] = [
  'TileGrass01',
  'TileGrass02',
  'TileGround01',
  'TileGround01',
  'TileGround03',
  'TileGrass01',
  'TileWood01',
  'TileRock01',
  'TileRock02',
  'TileRock03',
  'TileRock04',
];

// OpenMU's spawn gate (VersionSeasonSix/Gates.cs, the `isSpawnGate: true` row), centred.
const SPAWN = { x: 20, y: 20 } as const;

// There is a surface far above, and god-rays (type 38) coming down through
// it, so the map is not an interior. What it is not is a sky anything can
// fall out of - see UNDERWATER.
const OUTDOOR = true;

// Twenty metres down: no rain whatever the weather byte says, and the
// ambient particles are marine snow and bubbles instead of leaves.
const UNDERWATER = true;

// ---- 2. state + readers ----------------------------------------------------
// None: the map's runtime state lives in the objects `create` binds.

// ---- 3. the layer ----------------------------------------------------------

export const atlansLayer: MapLayer = {
  name: 'atlans',
  worlds: WORLDS,
  tiles: TILES,
  spawn: SPAWN,
  outdoor: OUTDOOR,
  underwater: UNDERWATER,
  blendMeshes: ATLANS_BLEND_MESHES,
  effectOnly: ATLANS_EFFECT_ONLY_TYPES,
  emissions: ATLANS_EMISSIONS,
  create: world => import('./create').then(m => m.createAtlans(world)),
};
