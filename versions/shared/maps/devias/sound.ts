import type { MapSound } from '@/controllers/sound';
import { WIND } from '../shared/sound';

/** `PositionX` 205-214, `PositionY` 13-31 (SceneManager.cpp:1050-1051). */
const CHURCH = { minX: 205, maxX: 214, minY: 13, maxY: 31 } as const;

/** Devias' sound (`MapLayer.sound`), read by the sound controller. */
export const DEVIAS_SOUND: MapSound = {
  // `HeroTile != 3 && HeroTile < 10` (ZzzCharacter.cpp:5355): the interior floors are boards.
  footsteps: [{ sound: 'Sound/pWalk(Snow)', on: tile => tile !== 3 && tile < 10 }],
  // The same wind, muted on the interior floor tiles. The original's
  // test is `HeroTile == 3 || HeroTile >= 10`, the same one `footsteps.ts`
  // uses to decide snow underfoot.
  beds: [{ ...WIND, mutedOn: tile => tile === 3 || tile >= 10 }],
  music: 'Music/Devias',
  town: {
    tracks: ['Music/Devias', 'Music/Church'],
    at: (x, y) =>
      x >= CHURCH.minX &&
      x <= CHURCH.maxX &&
      y >= CHURCH.minY &&
      y <= CHURCH.maxY
        ? 'Music/Church'
        : 'Music/Devias',
  },
};
