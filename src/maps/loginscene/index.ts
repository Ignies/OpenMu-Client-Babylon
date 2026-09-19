import { ENUM_WORLD } from '../../common/types';
import type { MapLayer } from '../layer';
import { FULL_TILES } from '../recipes';
import { LOGIN_SCENE_EFFECT_ONLY_TYPES, LOGIN_SCENE_EMISSIONS } from './spec';

/**
 * The login and character-select backdrops - the map entry: identity and the per-world data the
 * renderer, the terrain loader, the weather and the sound tables read.
 * The one object class is in `create.ts`, loaded on demand.
 */

// ---- 1. data ---------------------------------------------------------------

// Worlds 73/74 (`World74`/`World75`) are the Season 4 login and character
// scenes, run by `GMEmpireGuardian4` on the Fortress day-4 hooks; 77/78 are
// the Season 6 pair (`World78`/`World79`), which the original never gives any
// object behaviour. The scene systems own the camera and the line-up; the
// tables here and in `create` are the object half - see `spec.ts`.
const WORLDS: readonly ENUM_WORLD[] = [
  ENUM_WORLD.WD_73NEW_LOGIN_SCENE,
  ENUM_WORLD.WD_74NEW_CHARACTER_SCENE,
  ENUM_WORLD.WD_77NEW_LOGIN_SCENE,
  ENUM_WORLD.WD_78NEW_CHARACTER_SCENE,
];

// ---- 2. state + readers ----------------------------------------------------
// None: the map's runtime state lives in the objects `create` binds.

// ---- 3. the layer ----------------------------------------------------------

export const loginsceneLayer: MapLayer = {
  name: 'loginscene',
  worlds: WORLDS,
  tiles: FULL_TILES,
  effectOnly: LOGIN_SCENE_EFFECT_ONLY_TYPES,
  emissions: LOGIN_SCENE_EMISSIONS,
  create: world => import('./create').then(m => m.createLoginScene(world)),
};
