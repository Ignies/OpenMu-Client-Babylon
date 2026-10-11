import { MonsterActionType } from '@versions/shared/objects/enum';
import type { MonsterCue, MapSound, VoiceSet } from '@/controllers/sound';
import { ENUM_WORLD } from '@/core/types';
import { ATTACK_EFFECT, HOOK } from '../shared/sound';

const A = MonsterActionType;

/**
 * `GMEmpireGuardian1..4::PlayMonsterSound`. Floor 1's handler covers all four
 * floors; 2, 3 and 4 add their own monsters on top and no number is claimed
 * twice, so the four lists are one set here.
 */
const JERINT_STEPS: readonly MonsterCue[] = [
  { on: [A.Walk], play: 'Sound/w69w70w71w72/Jelint_move01', frame: [7, 8] },
  { on: [A.Walk], play: 'Sound/w69w70w71w72/Jelint_move02', frame: [1, 2] },
];
const JERINT_STEP_PAIR: MonsterCue = {
  on: [A.Walk],
  play: ['Sound/w69w70w71w72/Jelint_move01', 'Sound/w69w70w71w72/Jelint_move02'],
};
const JERINT_DEATH: MonsterCue = { on: [A.Die], play: 'Sound/w69w70w71w72/Jelint_death' };

export const EMPIRE_GUARDIAN: VoiceSet = {
  // GAYION (floor 4 boss)
  164: [
    { on: [A.Walk], play: 'Sound/w69w70w71w72/GaionKalein_move' },
    { on: [A.Appear], play: 'Sound/w69w70w71w72/GaionKalein_rage' },
    { on: [A.Die], play: 'Sound/w69w70w71w72/GrandWizard_death' },
  ],
  // JERRY
  165: [
    JERINT_STEP_PAIR,
    { on: [A.Attack1], play: 'Sound/w69w70w71w72/Jelint_attack1' },
    { on: [A.Attack2], play: 'Sound/eBloodAttack' },
    { on: [A.Attack3], play: 'Sound/w69w70w71w72/Jelint_attack3' },
    { on: [A.Attack3], play: 'Sound/BLOW_OF_DESTRUCTION' },
    { on: [A.Appear], play: 'Sound/w69w70w71w72/Jelint_rage' },
    JERINT_DEATH,
  ],
  // RAYMOND
  166: [
    ...JERINT_STEPS,
    { on: [A.Attack1], play: 'Sound/w69w70w71w72/Jelint_attack1' },
    { on: [A.Attack2, A.Attack3], play: 'Sound/w69w70w71w72/Raymond_attack2' },
    { on: [A.Appear], play: 'Sound/w69w70w71w72/Raymond_rage' },
    JERINT_DEATH,
  ],
  // LUCAS
  167: [
    JERINT_STEP_PAIR,
    { on: [A.Attack1], play: 'Sound/w69w70w71w72/Jelint_attack1' },
    { on: [A.Attack2], play: 'Sound/w69w70w71w72/Jelint_attack3' },
    { on: [A.Attack3], play: 'Sound/w69w70w71w72/Ercanne_attack3' },
    { on: [A.Appear], play: 'Sound/w69w70w71w72/Raymond_rage' },
    JERINT_DEATH,
  ],
  // FRED
  168: [
    ...JERINT_STEPS,
    { on: [A.Attack1], play: 'Sound/w69w70w71w72/CombatMaster_attack1' },
    { on: [A.Attack2], play: 'Sound/w69w70w71w72/1Deasuler_attack2' },
    { on: [A.Attack3], play: 'Sound/w69w70w71w72/1Deasuler_attack3' },
    { on: [A.Appear], play: 'Sound/w69w70w71w72/Jelint_rage' },
    JERINT_DEATH,
  ],
  // HAMMERIZE
  169: [
    JERINT_STEP_PAIR,
    { on: [A.Attack1, A.Attack3], play: 'Sound/w69w70w71w72/2Vermont_attack1' },
    { on: [A.Attack2], play: 'Sound/w69w70w71w72/2Vermont_attack2' },
    { on: [A.Appear], play: 'Sound/w69w70w71w72/Jelint_rage' },
    { on: [A.Die], play: 'Sound/w69w70w71w72/2Vermont_death' },
  ],
  // DUAL_BERSERKER
  170: [
    { on: [A.Walk], play: 'Sound/w69w70w71w72/3Cato_move' },
    { on: [A.Attack1], play: 'Sound/w69w70w71w72/CombatMaster_attack1' },
    { on: [A.Attack2, A.Attack3], play: 'Sound/w69w70w71w72/3Cato_attack2' },
    { on: [A.Appear], play: 'Sound/w69w70w71w72/Raymond_rage' },
    { on: [A.Die], play: 'Sound/w69w70w71w72/2Vermont_death' },
  ],
  // DEVIL_LORD
  171: [
    { on: [A.Walk], play: 'Sound/w69w70w71w72/3Cato_move' },
    { on: [A.Attack1], play: 'Sound/w69w70w71w72/Jelint_attack1' },
    { on: [A.Attack2, A.Attack3], play: 'Sound/w69w70w71w72/4Gallia_attack2' },
    { on: [A.Appear], play: 'Sound/w69w70w71w72/Jelint_rage' },
    { on: [A.Die], play: 'Sound/w69w70w71w72/2Vermont_death' },
  ],
  // QUARTER_MASTER
  172: [
    ...JERINT_STEPS,
    { on: [A.Attack1], play: 'Sound/w69w70w71w72/Jelint_attack1' },
    { on: [A.Attack2, A.Attack3], play: 'Sound/w69w70w71w72/QuaterMaster_attack2' },
    JERINT_DEATH,
  ],
  // COMBAT_INSTRUCTOR - the Appear thrust is `GMEmpireGuardian1::MoveMonsterVisual`
  // (:882); Appear is its skill 49 (:2546), so it waits on the skill packet
  173: [
    ...JERINT_STEPS,
    { on: [A.Attack1], play: 'Sound/w69w70w71w72/CombatMaster_attack1' },
    { on: [A.Attack2], play: 'Sound/w69w70w71w72/CombatMaster_attack2' },
    { on: [A.Attack3], play: 'Sound/w69w70w71w72/CombatMaster_attack3' },
    JERINT_DEATH,
    { on: [A.Appear], play: 'Sound/sDarkSpear', frame: [5, 5.8], ...HOOK },
  ],
  // ATICLES_HEAD
  174: [
    JERINT_STEP_PAIR,
    { on: [A.Attack1, A.Attack2, A.Attack3], play: 'Sound/w69w70w71w72/CombatMaster_attack3' },
    JERINT_DEATH,
  ],
  // DARK_GHOST
  175: [
    { on: [A.Walk], play: 'Sound/w69w70w71w72/GaionKalein_move' },
    { on: [A.Attack1], play: 'Sound/eMeteorite' },
    // SOUND_EXPLOTION01 is the global 1-channel wave (ZzzOpenData.cpp:4813).
    { on: [A.Attack1, A.Attack3], play: 'Sound/eExplosion', channels: 1 },
    { on: [A.Attack2], play: 'Sound/w42/firepillar' },
    { on: [A.Die], play: 'Sound/w69w70w71w72/GrandWizard_death' },
  ],
  // BANSHEE
  176: [
    { on: [A.Walk], play: 'Sound/w69w70w71w72/GaionKalein_move' },
    { on: [A.Attack1], play: 'Sound/w69w70w71w72/CombatMaster_attack1' },
    { on: [A.Attack2, A.Attack3], play: 'Sound/w69w70w71w72/CombatMaster_attack2' },
    { on: [A.Die], play: 'Sound/w69w70w71w72/AssassinMaster_Death' },
  ],
  // HEAD_MOUNTER
  177: [
    { on: [A.Walk], play: 'Sound/w69w70w71w72/CavalryLeader_move01', frame: [7, 8] },
    { on: [A.Walk], play: 'Sound/w69w70w71w72/CavalryLeader_move02', frame: [1, 2] },
    { on: [A.Attack1, A.Attack3], play: 'Sound/w69w70w71w72/CavalryLeader_attack1' },
    { on: [A.Attack2, A.Attack4], play: 'Sound/w69w70w71w72/CavalryLeader_attack2' },
    { on: [A.Die], play: 'Sound/w58w59/GiantMammoth_death' },
  ],
  // DEFENDER
  178: [
    ...JERINT_STEPS,
    { on: [A.Attack1], play: 'Sound/w69w70w71w72/CombatMaster_attack1' },
    { on: [A.Attack2], play: 'Sound/w69w70w71w72/CombatMaster_attack2' },
    { on: [A.Die], play: 'Sound/w69w70w71w72/GrandWizard_death' },
  ],
  // FORSAKER
  179: [
    { on: [A.Stop1, A.Stop2], play: 'Sound/w69w70w71w72/Priest_stay' },
    { on: [A.Attack1], play: 'Sound/aThunder01' },
    { on: [A.Attack2], play: 'Sound/w58w59/Selupan_cure' },
    { on: [A.Die], play: 'Sound/pDarkDeath' },
  ],
};

/**
 * Floor 2's own hooks on top (GMEmpireGuardian2.cpp:376-497, :1148-1190),
 * behind `IsEmpireGuardian2()`. The Dark Ghost's skill 51 flame and skill 52
 * meteor shower both play Attack2, and the client never learns which skill
 * it was, so only the plain attack's meteor is here.
 */
const EMPIRE_GUARDIAN_2: VoiceSet = {
  ...EMPIRE_GUARDIAN,
  // ATICLES_HEAD - the spear thrust; Attack2 and Appear are its skills 47 and 50
  // (:1074-1095), so it waits on the skill packet
  174: [
    ...EMPIRE_GUARDIAN[174],
    { on: [A.Attack2, A.Appear], play: 'Sound/sDarkSpear', frame: [6.6, 7.4], ...HOOK },
  ],
  // DARK_GHOST - the meteor lands on its target at any range
  175: [...EMPIRE_GUARDIAN[175], { on: [A.Attack1], play: 'Sound/eMeteorite', ...ATTACK_EFFECT }],
};

/** The Fortress days 1-3 sound (`MapLayer.sound`), read by the sound controller. */
export const EMPIRE_GUARDIAN_SOUND: MapSound = {
  music: 'Music/ImperialGuardianFort',
  monsterCues: {
    byWorld: {
      [ENUM_WORLD.WD_69EMPIREGUARDIAN1]: EMPIRE_GUARDIAN,
      [ENUM_WORLD.WD_70EMPIREGUARDIAN2]: EMPIRE_GUARDIAN_2,
      [ENUM_WORLD.WD_71EMPIREGUARDIAN3]: EMPIRE_GUARDIAN,
    },
  },
};
