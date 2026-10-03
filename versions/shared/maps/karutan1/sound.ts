import { MonsterActionType } from '@versions/shared/objects/enum';
import type { MapSound, VoiceSet } from '@/controllers/sound';
import { ATTACK_1_2, smallLoop } from '../shared/sound';

const A = MonsterActionType;

/** `CGMKarutan1::PlayMonsterSound` (GMKarutan1.cpp:737-869). Range is 600. */
export const KARUTAN: VoiceSet = {
  // VENOMOUS_CHAIN_SCORPION
  209: [
    { on: ATTACK_1_2, play: 'Sound/Karutan/ToxyChainScorpion_attack' },
    { on: [A.Die], play: 'Sound/Karutan/ToxyChainScorpion_death' },
    { on: [A.Shock], play: 'Sound/Karutan/ToxyChainScorpion_hit' },
  ],
  // BONE_SCORPION
  210: [
    { on: ATTACK_1_2, play: 'Sound/Karutan/BoneScorpion_attack' },
    { on: [A.Die], play: 'Sound/Karutan/BoneScorpion_death' },
    { on: [A.Shock], play: 'Sound/Karutan/BoneScorpion_hit' },
  ],
  // ORCUS
  211: [
    { on: [A.Walk], play: 'Sound/Karutan/Orcus_move1', frame: [1, 2] },
    { on: [A.Walk], play: 'Sound/Karutan/Orcus_move2', frame: [7, 8] },
    { on: [A.Attack1], play: 'Sound/Karutan/Orcus_attack_1' },
    { on: [A.Attack2], play: 'Sound/Karutan/Orcus_attack_2' },
    { on: [A.Die], play: 'Sound/Karutan/Orcus_death' },
  ],
  // GOLLOCK
  212: [
    { on: [A.Walk], play: 'Sound/Karutan/Goloch_move1', frame: [1, 2] },
    { on: [A.Walk], play: 'Sound/Karutan/Goloch_move2', frame: [7, 8] },
    { on: ATTACK_1_2, play: 'Sound/Karutan/Goloch_attack' },
    { on: [A.Die], play: 'Sound/Karutan/Goloch_death' },
  ],
  // CRYPTA
  213: [
    { on: [A.Walk], play: 'Sound/Karutan/Crypta_move1', frame: [1, 2] },
    { on: [A.Walk], play: 'Sound/Karutan/Crypta_move2', frame: [7, 8] },
    { on: ATTACK_1_2, play: 'Sound/Karutan/Crypta_attack' },
    { on: [A.Die], play: 'Sound/Karutan/Crypta_death' },
  ],
  // CRYPOS - dies with Crypta's line
  214: [
    { on: [A.Walk], play: 'Sound/Karutan/Crypos_move1', frame: [1, 2] },
    { on: [A.Walk], play: 'Sound/Karutan/Crypos_move2', frame: [7, 8] },
    { on: [A.Attack1], play: 'Sound/Karutan/Crypos_attack_1' },
    { on: [A.Attack2], play: 'Sound/Karutan/Crypos_attack_2' },
    { on: [A.Die], play: 'Sound/Karutan/Crypta_death' },
  ],
  // CONDRA
  215: [
    { on: [A.Walk], play: 'Sound/Karutan/Condra_move1', frame: [1, 2] },
    { on: [A.Walk], play: 'Sound/Karutan/Condra_move2', frame: [7, 8] },
    { on: ATTACK_1_2, play: 'Sound/Karutan/Condra_attack' },
    { on: [A.Die], play: 'Sound/Karutan/Condra_death' },
  ],
  // NACONDRA - Condra's steps and death, its own attack
  216: [
    { on: [A.Walk], play: 'Sound/Karutan/Condra_move1', frame: [1, 2] },
    { on: [A.Walk], play: 'Sound/Karutan/Condra_move2', frame: [7, 8] },
    { on: ATTACK_1_2, play: 'Sound/Karutan/NarCondra_attack' },
    { on: [A.Die], play: 'Sound/Karutan/Condra_death' },
  ],
};

/** Karutan 1's sound (`MapLayer.sound`), read by the sound controller. */
export const KARUTAN_1_SOUND: MapSound = {
  // SceneManager.cpp:630-645 (ASG_ADD_MAP_KARUTAN): the desert loop.
  beds: [{ sound: 'Sound/Karutan/Karutan_desert_env', volume: 0.4 }],
  music: 'Music/Karutan_A',
  // GMKarutan1.cpp:349-357 (`PlayObjectSound`).
  objectLoops: [smallLoop([58, 66], 'Sound/Karutan/Karutan_insect_env', 0.3)],
  // `IsKarutanMap()` (GMKarutan1.cpp:876-879).
  monsterCues: KARUTAN,
};
