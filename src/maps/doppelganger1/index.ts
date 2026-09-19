import { ENUM_WORLD } from '../../common/types';
import type { MapLayer } from '../layer';
import { FULL_TILES } from '../recipes';
import {
  DOPPELGANGER1_BLEND_MESHES,
  DOPPELGANGER1_EFFECT_ONLY_TYPES,
  DOPPELGANGER1_EMISSIONS,
} from './spec';

/**
 * Doppelganger 1 (World66 / Object66) - the map entry: identity and the per-world data the
 * renderer, the terrain loader, the weather and the sound tables read.
 *
 * No `create`: every runtime behaviour of this map is table data (spec.ts) or
 * lives in another system; the notes below say what is and is not built.
 *
 * Doppelganger 1 (`WD_65DOPPLEGANGER1`, `World66`/`Object66`) - the first
 * of the four Mirror-of-Illusion arenas, built from Raklion's art.
 *
 * Tables in `spec.ts`. Not built: the event (`g_pDoppelGangerFrame`), the
 * mirror-image player monsters (`CreateMonster`, :49-163 - server
 * characters), everything hung off the monster models (`MoveMonsterVisual`
 * :190-301, `MoveBlurEffect` :303-340, `RenderMonsterVisual` :492-566 and
 * `PlayMonsterSound` :618-688 - the ice walker, the two butchers and the
 * doppelganger itself), and `PlayBGM`'s `MUSIC_DOPPELGANGER`, which the
 * original only starts while the event is enabled (:692-718) - so `null` in
 * `music.ts`. Clear colour `(148, 179, 223)/256` (SceneManager.cpp:365) is
 * set by `loadMapIntoScene`.
 *
 * `CreateObject` (:40-47) is empty and nothing sets `Alpha` or `Velocity` per
 * type, so this map owns no entity and needs no `create.ts`.
 *
 * EncTerrain66.obj also carries three records of **type 247**, which is past
 * `MAX_WORLD_OBJECTS` (160, `_enum.h:851`). Nothing range-checks it:
 * `OpenObjectsEnc` reads the type as a `short` and `CreateObject`
 * (ZzzObject.cpp:4437-4471) stores whatever it is, while `LoadWorld` only
 * fills model slots 0-159 from `Object<n>` (MapManager.cpp:1096). Slot 247 is
 * `MODEL_SKELETON_PCBANG`, the PC-bang skeleton from `Data\Skill\Skeleton03`
 * that is registered globally (ZzzOpenData.cpp:4185), so the original draws
 * three of those - all three at tile 162/83 with z exactly 0, i.e. stacked at
 * the world floor under the terrain. Editor spill, not a map object; nothing
 * is ported for it.
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

// SceneManager.cpp:365 - the one arena with a daylight sky colour.
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
  clearColor: CLEAR_COLOR,
  blendMeshes: DOPPELGANGER1_BLEND_MESHES,
  effectOnly: DOPPELGANGER1_EFFECT_ONLY_TYPES,
  emissions: DOPPELGANGER1_EMISSIONS,
  create: world => import('./create').then(m => m.createDoppelganger1(world)),
};
