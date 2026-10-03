import type { MapSound } from '@/controllers/sound';
import { ENUM_WORLD } from '@/core/types';

/** The login backdrops' sound (`MapLayer.sound`), read by the sound controller. */
export const LOGIN_SCENE_SOUND: MapSound = {
  // `MUSIC_LOGIN_THEME` (LoginScene.cpp:300): the login backdrop and the
  // character select are one scene under one theme - `controllers/sound/loginMusic.ts`
  // starts it before the world exists; this row keeps the map loop from
  // stopping it once the backdrop's terrain loads.
  music: {
    byWorld: {
      [ENUM_WORLD.WD_73NEW_LOGIN_SCENE]: 'Music/login_theme',
      [ENUM_WORLD.WD_74NEW_CHARACTER_SCENE]: 'Music/login_theme',
    },
  },
};
