import { MonsterActionType } from '@versions/shared/objects/enum';
import type { MonsterCue, MapSound, VoiceSet } from '@/controllers/sound';
import { ATTACK_1_2, oneChannel } from '../shared/sound';

const A = MonsterActionType;

/** `GMSwampOfQuiet::PlayMonsterSound` (GMSwampOfQuiet.cpp). */
const SAPI: readonly MonsterCue[] = [
  { on: ATTACK_1_2, play: 'Sound/w57/Sapi-Attack', chance: 3 },
  { on: [A.Die], play: 'Sound/w57/Sapi-Death', chance: 3 },
];
const NAPIN_ATTACK_DIE: readonly MonsterCue[] = [
  { on: ATTACK_1_2, play: 'Sound/w57/Naipin-Attack' },
  { on: [A.Die], play: 'Sound/w57/Naipin-Death' },
];
const SHADOW_DIE: MonsterCue = { on: [A.Die], play: 'Sound/w57/Shadow-Death' };

// One channel each (ZzzOpenData.cpp:3955-3992).
const SWAMP_OF_QUIET: VoiceSet = oneChannel({
  // SAPIUNUS / SAPIDUO
  136: SAPI,
  137: SAPI,
  // SAPITRES
  138: [
    { on: ATTACK_1_2, play: 'Sound/w57/Sapi-Attack1', chance: 3 },
    { on: [A.Die], play: 'Sound/w57/Sapi-Death', chance: 3 },
  ],
  // SHADOW_PAWN
  139: [{ on: ATTACK_1_2, play: 'Sound/w57/ShadowPawn-Attack' }, SHADOW_DIE],
  // SHADOW_KNIGHT
  140: [{ on: ATTACK_1_2, play: 'Sound/w57/ShadowKnight-Attack' }, SHADOW_DIE],
  // SHADOW_LOOK
  141: [{ on: ATTACK_1_2, play: 'Sound/w57/ShadowRook-Attack' }, SHADOW_DIE],
  // NAPIN
  142: [
    { on: [A.Walk], play: 'Sound/w57/Naipin-Thunder', chance: 100 },
    ...NAPIN_ATTACK_DIE,
  ],
  // GHOST_NAPIN
  143: [
    { on: [A.Walk], play: 'Sound/w57/Naipin-Ghost', chance: 100 },
    ...NAPIN_ATTACK_DIE,
  ],
  // BLAZE_NAPIN
  144: [
    { on: [A.Walk], play: 'Sound/w57/Naipin-Blaze', chance: 100 },
    ...NAPIN_ATTACK_DIE,
  ],
  // SAPI_QUEEN / WOLF_STATUS
  201: SAPI,
  204: SAPI,
  // ICE_NAPIN - shares the Blaze line, as the original does
  202: [
    { on: [A.Walk], play: 'Sound/w57/Naipin-Blaze', chance: 100 },
    ...NAPIN_ATTACK_DIE,
  ],
  // SHADOW_MASTER
  203: [{ on: ATTACK_1_2, play: 'Sound/w57/ShadowRook-Attack' }, SHADOW_DIE],
});

/** The Swamp of Calmness' sound (`MapLayer.sound`), read by the sound controller. */
export const SWAMP_SOUND: MapSound = {
  music: 'Music/SwampOfCalmness',
  monsterCues: SWAMP_OF_QUIET,
};
