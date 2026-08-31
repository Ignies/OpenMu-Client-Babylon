import { ENUM_WORLD } from '../../common/types';
import type { MapLayer } from '../layer';
import { FULL_TILES } from '../recipes';
import {
  EMPIRE_GUARDIAN_4_EFFECT_ONLY_TYPES,
  EMPIRE_GUARDIAN_4_EMISSIONS,
} from '../empireguardian/spec';

/**
 * The login and character-select backdrops — the map entry: identity and the per-world data the
 * renderer, the terrain loader, the weather and the sound tables read.
 * No object classes of its own.
 */

// ---- 1. data ---------------------------------------------------------------

// Worlds 73/74 (`World74`/`World75`) are the Season 4 login and character
// scenes, drawn on the Fortress day-4 art set (`loginSceneSystem`); 77/78 are
// the Season 6 ones (`World78`/`World79`), only ever asked for a tile list.
// No `create`: the scene systems own their objects.
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
  // The day-4 tables (73/74 only, in the original registries; harmless on 77/78).
  effectOnly: EMPIRE_GUARDIAN_4_EFFECT_ONLY_TYPES,
  emissions: EMPIRE_GUARDIAN_4_EMISSIONS,
};
