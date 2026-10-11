import type { MapSound } from '@/controllers/sound';
import { GRASS_STEPS, WIND } from '../shared/sound';

/**
 * `HeroTile == 4` (ZzzInterface.cpp:3315-3318): the plank floor of the
 * Lorencia pub and of the cabin at (75-81, 146-157).
 */
const PUB_TILE = 4;

/** Lorencia's sound (`MapLayer.sound`), read by the sound controller. */
export const LORENCIA_SOUND: MapSound = {
  footsteps: GRASS_STEPS,
  // Wind outdoors, cut inside the buildings (tile 4,
  // SceneManager.cpp:885-895). No rain bed: the town stays dry.
  beds: [{ ...WIND, mutedOn: tile => tile === 4 }],
  // The town's outdoor track; `town` picks the spot and only starts it in
  // the safe zone.
  music: 'Music/main_theme',
  town: {
    tracks: ['Music/main_theme', 'Music/Pub'],
    at: (_x, _y, tile) =>
      tile === PUB_TILE ? 'Music/Pub' : 'Music/main_theme',
  },
};
