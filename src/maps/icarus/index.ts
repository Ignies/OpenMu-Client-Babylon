import { ENUM_WORLD } from '../../common/types';
import type { MapLayer } from '../layer';
import {
  ICARUS_BLEND_MESHES,
  ICARUS_EMISSIONS,
} from './spec';

/**
 * Icarus (World11 / Object11) — the map entry: identity and the per-world data the
 * renderer, the terrain loader, the weather and the sound tables read.
 * The object classes and the setup function are in `create.ts`, loaded on demand.
 */

// ---- 1. data ---------------------------------------------------------------

const WORLDS: readonly ENUM_WORLD[] = [
  ENUM_WORLD.WD_10ICARUS,
];

// The terrain mesh is never drawn (`RenderTerrain` is skipped for this world,
// MainScene.cpp:402); one slot keeps the loader happy.
const TILES: readonly string[] = [
  'TileGrass01',
];

const SPAWN = { x: 14, y: 12 } as const;

// It rains without stopping: `MoveLeaves` forces `RainTarget = MAX_LEAVES / 2`
// for this world (ZzzEffectFireLeave.cpp:424).
const OUTDOOR = true;

// The original's exact clear colour (SceneManager.cpp:336), a dark navy void.
const CLEAR_COLOR = [3, 25, 44] as const;

// ---- 2. state + readers ----------------------------------------------------
// None: the map's runtime state lives in the objects `create` binds.

// ---- 3. the layer ----------------------------------------------------------

export const icarusLayer: MapLayer = {
  name: 'icarus',
  worlds: WORLDS,
  tiles: TILES,
  spawn: SPAWN,
  outdoor: OUTDOOR,
  // Above the clouds the navy void is the map's identity; the cycle only
  // breathes over it rather than repainting it.
  dayCycle: 0.4,
  clearColor: CLEAR_COLOR,
  // `ICARUS_EFFECT_ONLY_TYPES` (the six cloud boxes) is bound by `create` as
  // `IcarusCloudObject`, which skips the model itself — not an effect-only row.
  blendMeshes: ICARUS_BLEND_MESHES,
  emissions: ICARUS_EMISSIONS,
  create: world => import('./create').then(m => m.createIcarus(world)),
};
