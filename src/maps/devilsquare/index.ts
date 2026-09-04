import { ENUM_WORLD } from '../../common/types';
import type { MapLayer } from '../layer';
import {
  DEVIL_SQUARE_BLEND_MESHES,
  DEVIL_SQUARE_EFFECT_ONLY_TYPES,
  DEVIL_SQUARE_EMISSIONS,
} from './spec';

/**
 * Devil Square (World10 / Object10) — the map entry: identity and the per-world data the
 * renderer, the terrain loader, the weather and the sound tables read.
 *
 * No `create`: every runtime behaviour of this map is table data (spec.ts) or
 * lives in another system; the notes below say what is and is not built.
 *
 * Devil Square (`WD_9DEVILSQUARE`, world 9 / `World10` + `Object10`).
 *
 * The whole map is the default `MapTileObject`: `CreateObject` and `MoveObject`
 * have no case for it, and its single `RenderObjectVisual` case — the rain
 * ripples on the 200 fence pillars — is documented and deliberately skipped in
 * `spec.ts`. What the square does at runtime is the *event*: the waves, the
 * timer and the rank table live in `events/devilSquare.ts`, and the rain in
 * the weather layer (the square is `outdoor` on its entry, per
 * `MoveLeaves`'s `MAX_LEAVES` budget for it).
 *
 * Sound: no `PlayWorldAmbientSounds` case, but `StopInactiveAmbientSounds`
 * (SceneManager.cpp:658) is the one place that spares the rain loop here, so
 * the `aRain` bed in `sound/ambientBeds.ts` is the original's, and there is no
 * music (`ManageBackgroundMusic` has no case; `devil_square_intro/outro.ogg`
 * are the event's stingers, not a map track).
 *
 * The four arenas share one terrain: DS1 at (44-87, 72-110), DS2 (118-152,
 * 72-110), DS3 (44-87, 140-184), DS4 (118-152, 140-184) — the server picks the
 * square by ticket level and sends the spawn with the warp. Offline lands in
 * DS1 at (133, 86).
 *
 * Squares 5-7 are OpenMU's map 32 (`WD_32DEVILSQUARE_5_7`). There is no
 * `World33` anywhere - the original's `LoadWorld` folds 32 into 9
 * (MapManager.cpp:1177) - so `assetWorldNum` (worldAssets.ts) draws map 32
 * from this same `World10`/`Object10`, and every per-world registry row is
 * spread over `DEVIL_SQUARE_WORLDS`.
 */

// ---- 1. data ---------------------------------------------------------------

// Squares 1-4 (map 9) and 5-7 (OpenMU map 32): `LoadWorld` folds 32 into 9
// (MapManager.cpp:1177) — one terrain, one object set, one entry.
const WORLDS: readonly ENUM_WORLD[] = [
  ENUM_WORLD.WD_9DEVILSQUARE,
  ENUM_WORLD.WD_32DEVILSQUARE_5_7,
];

// Map 32 has no `World33`; both draw `World10` / `Object10`.
const ASSET_WORLD = ENUM_WORLD.WD_9DEVILSQUARE + 1;

// World10 has no TileGround02 and no TileWater01: Ground01 / Grass01 stand in
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

// Devil Square 1 arena floor (the four squares share World10; DS1 is the
// north-east one at x 118-152, y 72-110).
const SPAWN = { x: 133, y: 86 } as const;

// `MoveLeaves` gives the square the full `MAX_LEAVES` rain budget
// (ZzzEffectFireLeave.cpp:422): it rains here whenever the packet says so.
const OUTDOOR = true;

// ---- 2. state + readers ----------------------------------------------------
// None: the map's runtime state lives in the objects `create` binds.

// ---- 3. the layer ----------------------------------------------------------

export const devilsquareLayer: MapLayer = {
  name: 'devilsquare',
  worlds: WORLDS,
  assetWorld: ASSET_WORLD,
  tiles: TILES,
  spawn: SPAWN,
  outdoor: OUTDOOR,
  blendMeshes: DEVIL_SQUARE_BLEND_MESHES,
  effectOnly: DEVIL_SQUARE_EFFECT_ONLY_TYPES,
  emissions: DEVIL_SQUARE_EMISSIONS,
};
