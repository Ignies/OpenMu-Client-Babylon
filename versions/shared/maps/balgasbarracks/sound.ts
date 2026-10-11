import type { HeroContext, MapObjectLoop, MapSound, VoiceSet } from '@/controllers/sound';
import { largeLoop, smallLoop } from '../shared/sound';
import { BALRAM, DARK_ELF, DEATH_SPIRIT, SORAM } from '../crywolf/sound';

/**
 * GM3rdChangeUp.cpp:364-367: the pillar sounds only while its flame sine
 * (`(sin(WorldTime * 0.0005) + 1) / 2`) is above 0.9 - a burst every ~12.6 s.
 */
const firePillarBurning = (h: HeroContext): boolean =>
  (Math.sin(h.time * 0.0005) + 1) * 0.5 > 0.9;

/**
 * GM3rdChangeUp.cpp:352-371 (`PlayEffectSound`), run by `MoveObject` on the
 * Barracks and the Refuge alike (:57-62); cage01/02 are the original's coin
 * flip per call - one file per cage type here so the two never fight for one
 * channel. The Refuge is where the volcano and the fire pillars stand.
 */
export const CHANGE_UP_LOOPS: readonly MapObjectLoop[] = [
  smallLoop([74], 'Sound/w42/cage01', 0.3),
  smallLoop([75], 'Sound/w42/cage02', 0.3),
  largeLoop([79], 'Sound/w42/volcano', 0.4),
  smallLoop([92], 'Sound/w42/firepillar', 0.35, firePillarBurning),
];

/**
 * `CGM3rdChangeUp::RenderBalgasBarrackMonsterVisual` (GM3rdChangeUp.cpp:808-1010),
 * the barrack and the refuge: Crywolf's lines again, the quest's Dark Elf too.
 */
export const BALGAS_BARRACK: VoiceSet = {
  91: BALRAM,
  93: DEATH_SPIRIT,
  94: SORAM,
  // DARK_ELF
  126: DARK_ELF,
};

/** Balgas Barracks' sound (`MapLayer.sound`), read by the sound controller. */
export const BALGAS_BARRACKS_SOUND: MapSound = {
  music: 'Music/BalgasBarrack',
  objectLoops: CHANGE_UP_LOOPS,
  // `IsBalgasBarrackMap() || IsBalgasRefugeMap()` (GM3rdChangeUp.cpp:810).
  monsterCues: BALGAS_BARRACK,
};
