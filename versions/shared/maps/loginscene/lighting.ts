import type { MapLighting } from '@/controllers/lighting';
import { ENUM_WORLD } from '@/core/types';
import { sun } from '../shared/looks';
import { EMPIRE_GUARDIAN_4_LIGHTS } from '../empireguardian4/spec';

/** The login backdrops' lighting (`MapLayer.lighting`), read by the lighting controller. */
export const LOGIN_SCENE_LIGHTING: MapLighting = {
  /**
   * The login and character-select backdrops: the Fortress set at night,
   * torch-lit under its own roofs, seen by a flying camera far enough for any
   * open haze cap. No haze, no sky, the room key - the enclosed look with a
   * key of its own. The interior sun's 0.15 share left the hall's cascades at
   * a cut the eye does not register; a low key from across the carpet lays
   * the pedestals, the arches and the chandeliers out on the floor, which is
   * what a tour shot at head height looks at.
   */
  look: { over: 'enclosed', ev: 1.0, sun: sun(60, 40, 0.45) },
  // The Fortress day 4 set, on the two scenes built from it.
  objectLights: {
    byWorld: {
      [ENUM_WORLD.WD_73NEW_LOGIN_SCENE]: EMPIRE_GUARDIAN_4_LIGHTS,
      [ENUM_WORLD.WD_74NEW_CHARACTER_SCENE]: EMPIRE_GUARDIAN_4_LIGHTS,
    },
  },
};
