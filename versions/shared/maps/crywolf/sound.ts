import { MonsterActionType } from '@versions/shared/objects/enum';
import type { MonsterCue, MapSound, Sounds, VoiceSet } from '@/controllers/sound';
import {
  ATTACK_1_2,
  ATTACK_EFFECT,
  hookOnce,
  hookPlay,
  hookWalk,
  type Play,
} from '../shared/sound';

const A = MonsterActionType;

/** The standard Crywolf line: walk chatter, then attack / death once per idle. */
const crywolfLine = (walk: Play, at1: Sounds, at2: Sounds, die: Sounds): MonsterCue[] => [
  hookWalk(walk),
  hookOnce([A.Attack1], at1),
  hookOnce([A.Attack2], at2),
  hookOnce([A.Die], die),
];

export const BALRAM = crywolfLine(
  ['Sound/w35/balram_idle1', 'Sound/w35/balram_idle2'],
  'Sound/w35/balram_attack1',
  'Sound/w35/balram_attack2',
  'Sound/w35/balram_death'
);
export const DEATH_SPIRIT = crywolfLine(
  ['Sound/w35/dths_idle1', 'Sound/w35/dths_idle2'],
  'Sound/w35/dths_at1',
  'Sound/w35/dths_at2',
  'Sound/w35/dths_deat'
);
export const SORAM = crywolfLine(
  ['Sound/w35/soram_idle1', 'Sound/w35/soram_idle2'],
  'Sound/w35/soram_attack1',
  'Sound/w35/soram_attack2',
  'Sound/w35/soram_death'
);
export const DARK_ELF: readonly MonsterCue[] = [
  ...crywolfLine(
    ['Sound/w35/darkelf_idle1', 'Sound/w35/darkelf_idle2'],
    'Sound/w35/darkelf_at1',
    'Sound/w35/darkelf_at2',
    'Sound/w35/darkelf_death'
  ),
  hookOnce([A.Attack3], 'Sound/w35/darkelf_skill1'),
  hookOnce([A.Attack4], 'Sound/w35/darkelf_skill2'),
];

/**
 * `M34CryWolf1st::RenderCryWolf1stMonsterVisual` (GMCrywolf1st.cpp:1566-2030)
 * and `AttackEffectCryWolf1stMonster` (:984-1093), both behind
 * `IsCyrWolf1st() || InDevilSquare()`.
 */
export const CRYWOLF: VoiceSet = {
  // BEAM_KNIGHT - `CheckAttackTime(1)` (:1064), on top of its own voice
  44: [{ on: ATTACK_1_2, play: 'Sound/sEvil', ...ATTACK_EFFECT }],
  // BALGASS
  89: [
    ...crywolfLine(
      ['Sound/w35/balga_idle1', 'Sound/w35/balga_idle2'],
      'Sound/w35/balga_at1',
      'Sound/w35/balga_at2',
      'Sound/w35/balga_death'
    ),
    hookOnce([A.Attack3], 'Sound/w35/balga_skill1'),
    hookOnce([A.Attack4], 'Sound/w35/balga_skill2'),
  ],
  91: BALRAM,
  92: DARK_ELF,
  93: DEATH_SPIRIT,
  94: SORAM,
  // WEREWOLF_HERO
  95: crywolfLine(
    ['Sound/w35/ww_idle1', 'Sound/w35/ww_idle2'],
    'Sound/w35/ww_attack1',
    'Sound/w35/ww_attack2',
    'Sound/w35/ww_death'
  ),
  // VALAM
  96: crywolfLine(
    ['Sound/w35/ww_s3_idle1', 'Sound/w35/ww_s3_idle2'],
    'Sound/w35/ww_s3_attack1',
    'Sound/w35/ww_s3_attack2',
    'Sound/w35/ww_s3_death'
  ),
  // SOLAM
  97: crywolfLine(
    ['Sound/w35/ww_s2_idle1', 'Sound/w35/ww_s2_idle2'],
    'Sound/w35/ww_s2_attack1',
    'Sound/w35/ww_s2_attack2',
    'Sound/w35/ww_s2_death'
  ),
  // SCOUT
  98: crywolfLine(
    ['Sound/w35/ww_s1_idle1', 'Sound/w35/ww_s1_idle2'],
    'Sound/w35/ww_s1_attack1',
    'Sound/w35/ww_s1_attack2',
    'Sound/w35/ww_s1_death'
  ),
  // BALLISTA - its latch clears on any clip but Attack1 / Die: every shot speaks
  99: [hookPlay(ATTACK_1_2, 'Sound/w35/tanker_attack'), hookPlay([A.Die], 'Sound/w35/tanker_death')],
};

/** Crywolf's sound (`MapLayer.sound`), read by the sound controller. */
export const CRYWOLF_SOUND: MapSound = {
  // No bed: `SOUND_CRY1ST_AMBIENT` is loaded (MapManager.cpp:194) and never
  // played.
  // `M34CryWolf1st::ChangeBackGroundMusic`'s peace state.
  music: 'Music/crywolf1st',
  monsterCues: CRYWOLF,
};
