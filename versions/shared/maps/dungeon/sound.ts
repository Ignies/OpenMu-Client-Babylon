import type { MapSound } from '@/controllers/sound';

/** Dungeon rats alive at once: `MoveFishs`' three slots (GOBoid.cpp:1660-1667). */
const RATS = 3;

/**
 * The original's boids spawn within `rand() % 1024 - 512` units of the hero
 * (GOBoid.cpp:1300, 1678) - ±5.12 tiles - and only voice within 600 units.
 */
const BOID_SPREAD_TILES = 5;

/** The Dungeon's sound (`MapLayer.sound`), read by the sound controller. */
export const DUNGEON_SOUND: MapSound = {
  beds: [{ sound: 'Sound/aDungeon', volume: 0.4 }],
  oneShots: [
    // Rats underfoot (GOBoid.cpp:1717); the bats overhead call from their
    // boids. A Dungeon rat (`MODEL_RAT01`, `aMouse.wav`): each one within 600
    // units rolls 1-in-256 (GOBoid.cpp:1868-1869), so one roll stands in for
    // all three. `MoveFishs` runs only under `GetRenderAllEffects` (:1653),
    // the same gate as the bats' `MoveBoids`.
    {
      sound: 'Sound/aMouse',
      oneIn: 256 / RATS,
      volume: 0.4,
      spread: BOID_SPREAD_TILES,
      when: 'ambientParticles',
    },
  ],
  // `WD_1DUNGEON || WD_5UNKNOWN` (SceneManager.cpp:1076).
  music: 'Music/Dungeon',
};
