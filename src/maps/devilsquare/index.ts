import { ENUM_WORLD } from '../../common/types';
import type { MapLayer } from '../layer';
import {
  DEVIL_SQUARE_BLEND_MESHES,
  DEVIL_SQUARE_EFFECT_ONLY_TYPES,
  DEVIL_SQUARE_EMISSIONS,
} from './spec';

/**
 * Devil Square (World10 / Object10) - the map entry: identity and the
 * per-world data the renderer, the terrain loader, the weather and the sound
 * tables read.
 *
 * Devil Square is `WD_9DEVILSQUARE` (world 9) plus OpenMU's map 32 for
 * squares 5-7. There is no `World33` anywhere: the original's `LoadWorld`
 * folds 32 into 9 outright (MapManager.cpp:1178), so `assetWorldNum`
 * (worldAssets.ts) draws map 32 from this same `World10`/`Object10` and every
 * per-world registry row is spread over `DEVIL_SQUARE_WORLDS`.
 *
 * Every one of the 564 objects is the default `MapTileObject` - see
 * `create.ts` for why - and the map's own runtime is one thing:
 * `DevilSquareStorm`, the lightning `MoveObject` runs over the hero
 * (ZzzObject.cpp:3630-3644). The waves, the timer and the rank table are the
 * *event*, and live in `events/devilSquare.ts`.
 *
 * Weather: it always rains here, and not because of any packet.
 * `CreateDevilSquareRain` (ZzzEffectFireLeave.cpp:120-127) checks the world
 * and nothing else - the `weather` byte only gates its Crywolf half - and
 * `MoveLeaves` hands this world the full `MAX_LEAVES` budget (:428) where
 * every other map gets 80. `weather/rainState.ts` has the world in
 * `ALWAYS_RAINING` for exactly that; `outdoor` here is what lets the rain
 * slot run at all.
 *
 * Sound: no `PlayWorldAmbientSounds` case, but `MoveObject` `PlayBuffer`s
 * `SOUND_RAIN01` every frame and `StopInactiveAmbientSounds`
 * (SceneManager.cpp:658) is the one place that spares the rain loop here, so
 * the `aRain` bed in `sound/ambientBeds.ts` is the original's. No music
 * (`ManageBackgroundMusic` has no case; `devil_square_intro/outro.ogg` are
 * the event's stingers, not a map track).
 *
 * The four arenas share one terrain: (44-87, 72-110), (118-152, 72-110),
 * (44-87, 140-184) and (118-152, 140-184) - the server picks the square by
 * ticket level and sends the spawn with the warp. Offline lands in the
 * north-east one.
 */

// ---- 1. data ---------------------------------------------------------------

// Squares 1-4 (map 9) and 5-7 (OpenMU map 32): `LoadWorld` folds 32 into 9
// (MapManager.cpp:1178) - one terrain, one object set, one entry.
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

// The north-east arena floor (x 118-152, y 72-110); which Devil Square level
// that is depends on the ticket the server took.
const SPAWN = { x: 133, y: 86 } as const;

// There is a sky and rain falls out of it (`MoveLeaves`,
// ZzzEffectFireLeave.cpp:428).
const OUTDOOR = true;

// ---- 2. state + readers ----------------------------------------------------
// None: the map's runtime state is the storm's, and it owns it.

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
  create: world => import('./create').then(m => m.createDevilSquare(world)),
};
