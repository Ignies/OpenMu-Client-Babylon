import { inDevilSquare } from '../actors/locomotion';
import { MonsterActionType as A } from '@versions/shared/objects/enum';
import { REFERENCE_FPS } from './playSpeed';
import { ENUM_WORLD as W } from '../../core/types';
import { KEEP_CLIP, monsterCastOf, monsterSwingRule, type MonsterSwingDef } from './monsterRules';

// SetPlayerAttack / SetPlayerMagic for a body that is not MODEL_PLAYER (ZzzCharacter.cpp:1222-1348)
// with their map hooks, and the monster side of ReceiveMagic (0x19) and ReceiveMagicContinue (0x1E).
// What a skill does to a monster caster and the skill-keyed swing rules are data (monsterRules.ts).

export { KEEP_CLIP };

const MONSTER_ILLUSION_OF_KUNDUN_7 = 275;

/** MoveCharacter zeroes `c->Skill` once AttackTime counts from 1 to g_iLimitAttackTime (15). */
const ATTACK_TIME_MS = ((15 - 1) * 1000) / REFERENCE_FPS;

export interface MonsterAttackState {
  /** `c->SwordCount`. */
  swordCount: number;
  /** `c->Skill`. */
  skill: number;
  /** When the running AttackTime zeroes `skill`; Infinity when none runs. */
  skillClearsAt: number;
  /** `c->MonsterSkill`, a WORD: 0 at creation, set by 0x69, NO_MONSTER_SKILL once a hook spends it. */
  monsterSkill: number;
}

export interface MonsterAttackInput {
  /** `gMapManager.WorldActive`: the map the hero is on. */
  world: number;
  /** `c->MonsterIndex`: the npc number (or the skin a transformed player wears). */
  monster: number;
  /** MONSTER_MODEL_* of `o->Type`, -1 when it is not a monster model. */
  model: number;
  /** A trap's `o->Type`: the world object it is drawn as (TRAP_MODEL_TABLE). */
  trapObject: number | undefined;
  /** [0, 1): `rand() % n` is `floor(random() * n)`. */
  random: () => number;
  /** Milliseconds, for the AttackTime that clears `c->Skill`. */
  now: number;
}

const states = new WeakMap<object, MonsterAttackState>();

/** The per-character state, created on first use and dropped with its owner. */
export function monsterAttackState(owner: object): MonsterAttackState {
  let state = states.get(owner);
  if (!state) {
    state = { swordCount: 0, skill: 0, skillClearsAt: Infinity, monsterSkill: 0 };
    states.set(owner, state);
  }
  return state;
}

/** `rand() % 2`: Attack1 or Attack2. */
function coin(random: () => number): number {
  return random() < 0.5 ? A.Attack1 : A.Attack2;
}

/** A swing rule's clip for the skill in hand (the rule files in versions/shared/animations/monster_swings). */
function ruleClip(rule: MonsterSwingDef, skill: number, random: () => number): number {
  const clip = rule.bySkill?.[skill] ?? rule.otherwise;
  if (clip === 'keep') return KEEP_CLIP;
  return clip === 'coin' ? coin(random) : clip;
}

const MONSTER_MODEL_BALI = 32;
const MONSTER_MODEL_BATTLE_GUARD1 = 76;
const MONSTER_MODEL_BATTLE_GUARD2 = 77;

const MONSTER_MAYA = 364;
const MONSTER_SELUPAN = 459;
const MONSTER_LUCAS = 507;

// The monsters each hook hands to CheckMonsterSkill.
const AIDA_CHECKED = new Set([304, 305, 309, 549, 550]);
/** `c->MonsterSkill = -1`. */
const NO_MONSTER_SKILL = 0xffff;
/** ReceiveMonsterSkill swings only for `ATMON_SKILL_BIGIN < skill < ATMON_SKILL_END` (_enum.h:3291-3346). */
const ATMON_SKILL_END = 78;
/** ATMON_SKILL_EMPIREGUARDIAN_BERSERKER: the boss's rage. */
const BERSERKER = 59;

/** A hook's clip by `c->MonsterSkill`; any other skill takes the hook's `otherwise`. */
type SkillClips = Readonly<Record<number, number>>;

/** Bloody Golem, Bloody Witch Queen: Attack2 for their own skill (GMAida.cpp:1608-1636). */
const AIDA_SKILLS: Readonly<Record<number, SkillClips>> = { 551: { 68: A.Attack2 }, 552: { 69: A.Attack2 } };
const CRYWOLF_CHECKED = new Set([440, 340, 344, 345, 341, 349]);
const KANTURU2_CHECKED = new Set([358, 359, 360]);
const KANTURU3_CHECKED = new Set([361, 362, 363, MONSTER_MAYA]);
const BALGAS_CHECKED = new Set([409, 410, 411, 412]);
const CURSED_TEMPLE_CHECKED = new Set([388, 391, 394, 397, 400, 403]);

/** Kentauros and the three Warriors set a clip but break without `return true`: the default wins. */
const KANTURU1_COIN = new Set([350, 351, 352, 356, 357, 555]);

/** Sapi Queen and Wolf Status, Ice Napin, Shadow Master by model (GMSwampOfQuiet.cpp:1466-1515). */
const SWAMP_SKILLS: Readonly<Record<number, SkillClips>> = {
  201: { 72: A.Attack2 }, 204: { 72: A.Attack2 }, 202: { 73: A.Attack2 }, 203: { 74: A.Attack2 },
};

/**
 * Raklion's ice monsters and their dark kin: Attack2 for their own skill (GM_Raklion.cpp:2308-2454).
 * The plain five keep a skill that is not theirs; the dark four spend any.
 */
const RAKLION_SKILLS: Readonly<Record<number, SkillClips>> = {
  454: { 29: A.Attack2 }, 455: { 30: A.Attack2 }, 456: { 31: A.Attack2 }, 457: { 32: A.Attack2 }, 458: { 33: A.Attack2 },
  562: { 75: A.Attack2 }, 563: { 76: A.Attack2 }, 565: { 32: A.Attack2 }, 564: { 77: A.Attack2 },
};
const RAKLION_KEEPS_OTHERS = new Set([454, 455, 456, 457, 458]);

/** SetBossMonsterAction (GM_Raklion.cpp:2462-2523): Selupan never spends his skill; 41 sets no clip. */
const SELUPAN_SKILLS: SkillClips = { 34: A.Attack2, 35: A.Attack1, 36: A.Attack3, 37: A.Appear, 41: KEEP_CLIP };

// Empire Guardian: GMEmpireGuardian1 serves all four maps (:2364-2606), then each map's own
// (GMEmpireGuardian2.cpp:1022-1145, GMEmpireGuardian3.cpp:1158-1260, GMEmpireGuardian4.cpp:1376-1480).
const EMPIRE_GUARDIAN_SKILLS: Readonly<Record<number, SkillClips>> = {
  506: { 60: A.Attack2, 52: A.Attack3, [BERSERKER]: A.Appear },
  507: { 62: A.Attack2, 63: A.Attack3, [BERSERKER]: A.Appear },
  508: { 57: A.Attack2, 58: A.Attack3, [BERSERKER]: A.Appear },
  511: { 58: A.Attack2, 60: A.Attack3, [BERSERKER]: A.Appear },
  513: { 47: A.Attack2, 49: A.Appear },
  518: { 44: A.Appear, 45: A.Attack2 },
  519: { 46: A.Attack2 },
};
const EMPIRE_GUARDIAN_MAP_SKILLS: Readonly<Record<number, Readonly<Record<number, SkillClips>>>> = {
  [W.WD_70EMPIREGUARDIAN2]: {
    509: { 60: A.Attack2, 61: A.Attack3, [BERSERKER]: A.Appear },
    514: { 47: A.Attack2, 50: A.Appear },
    515: { 51: A.Attack2, 52: A.Attack2 },
  },
  [W.WD_71EMPIREGUARDIAN3]: {
    510: { 58: A.Attack2, 60: A.Attack3, [BERSERKER]: A.Appear },
    517: { 54: A.Attack2, 55: A.Appear, 56: A.Attack3 },
    516: { 47: A.Attack2, 53: A.Attack3 },
  },
  [W.WD_72EMPIREGUARDIAN4]: {
    504: { 67: A.Attack1, 64: A.Attack2, 65: A.Attack3, 66: A.Attack4, [BERSERKER]: A.Appear },
    505: { 55: A.Attack2, 61: A.Attack3, [BERSERKER]: A.Appear },
  },
};

/** A hook's `switch (c->MonsterSkill)`: the clip for it, spending it unless `keep` says otherwise. */
function skillClip(state: MonsterAttackState, clips: SkillClips, otherwise: number, keep: 'spend' | 'keepOthers' | 'keep' = 'spend'): number {
  const clip = clips[state.monsterSkill];
  if (keep === 'spend' || (keep === 'keepOthers' && clip !== undefined)) state.monsterSkill = NO_MONSTER_SKILL;
  return clip ?? otherwise;
}

/**
 * CheckMonsterSkill (ZzzCharacter.cpp:2414). `c->MonsterSkill` is a WORD: its -1 is 0xFFFF and
 * matches no Skill_Num slot, and without 0x69 its one other value, 0, matches only slot 0.
 */
function checkMonsterSkill(monster: number): number {
  // MayaSceneMayaAction: the storm, not a clip.
  return monster === MONSTER_MAYA ? KEEP_CLIP : A.Attack1;
}

/** `M38Kanturu2nd::Is_Kanturu2nd_3rd`. */
function inKanturu2nd3rd(world: number): boolean {
  return world === W.WD_38KANTURU_2ND || world === W.WD_39KANTURU_3RD;
}

/** The hooks SetPlayerAttack runs in turn; undefined when none took the swing over. */
function hookedAttack(state: MonsterAttackState, input: MonsterAttackInput): number | undefined {
  const { world, monster, model, random } = input;

  // The any-map rules first (SetCurrentAction_HellasMonster, GMHellas.cpp:960).
  const anyMap = monsterSwingRule(monster, model, world, false);
  if (anyMap) return ruleClip(anyMap, state.skill, random);

  // battleCastle::SetCurrentAction_BattleCastleMonster, on any map.
  if (model === MONSTER_MODEL_BATTLE_GUARD1 || model === MONSTER_MODEL_BATTLE_GUARD2) {
    return A.Shock;
  }

  // The map rules' worlds (Hunting Ground, Swamp of Quiet) are none of the hooks' below.
  const mapped = monsterSwingRule(monster, model, world, true);
  if (mapped) return ruleClip(mapped, state.skill, random);

  if (world === W.WD_33AIDA || world === W.WD_54CHARACTERSCENE) {
    if (AIDA_CHECKED.has(monster)) return checkMonsterSkill(monster);
    if (AIDA_SKILLS[monster]) return skillClip(state, AIDA_SKILLS[monster], A.Attack1);
  }
  if ((world === W.WD_34CRYWOLF_1ST || inDevilSquare(world)) && CRYWOLF_CHECKED.has(monster)) {
    return checkMonsterSkill(monster);
  }
  if (world === W.WD_37KANTURU_1ST && KANTURU1_COIN.has(monster)) return coin(random);
  if (inKanturu2nd3rd(world) && KANTURU2_CHECKED.has(monster)) return checkMonsterSkill(monster);
  if (world === W.WD_39KANTURU_3RD && KANTURU3_CHECKED.has(monster)) {
    return checkMonsterSkill(monster);
  }
  if (
    (world === W.WD_41CHANGEUP3RD_1ST || world === W.WD_42CHANGEUP3RD_2ND) &&
    BALGAS_CHECKED.has(monster)
  ) {
    return checkMonsterSkill(monster);
  }
  if (
    world >= W.WD_45CURSEDTEMPLE_LV1 &&
    world <= W.WD_45CURSEDTEMPLE_LV6 &&
    CURSED_TEMPLE_CHECKED.has(monster)
  ) {
    return checkMonsterSkill(monster);
  }
  if (world === W.WD_56MAP_SWAMP_OF_QUIET) {
    if (SWAMP_SKILLS[model]) return skillClip(state, SWAMP_SKILLS[model], A.Attack1);
  }

  // TheMapProcess(): only the hero's map's process runs.
  if (world === W.WD_57ICECITY || world === W.WD_58ICECITY_BOSS) {
    const ice = RAKLION_SKILLS[monster];
    if (ice) return skillClip(state, ice, A.Attack1, RAKLION_KEEPS_OTHERS.has(monster) ? 'keepOthers' : 'spend');
    if (monster === MONSTER_SELUPAN) return skillClip(state, SELUPAN_SKILLS, A.Attack4, 'keep');
  }
  if (world >= W.WD_69EMPIREGUARDIAN1 && world <= W.WD_72EMPIREGUARDIAN4) {
    const clips = EMPIRE_GUARDIAN_SKILLS[monster] ?? EMPIRE_GUARDIAN_MAP_SKILLS[world]?.[monster];
    if (clips) return skillClip(state, clips, A.Attack1);
  }
  if (world === W.WD_79UNITEDMARKETPLACE && monster === MONSTER_LUCAS) return KEEP_CLIP;

  return undefined;
}

/** `rand() % 8` then `rand() % 2` (ZzzCharacter.cpp:1239-1248). */
function baliAttack(random: () => number): number {
  const roll = Math.floor(random() * 8);
  if (roll > 2) return coin(random);
  return roll > 0 ? A.Attack3 : A.Attack4;
}

/** The `c->Skill = 0` MoveCharacter made if the last AttackTime ran out before this packet. */
function settleSkill(state: MonsterAttackState, now: number): void {
  if (now < state.skillClearsAt) return;
  state.skill = 0;
  state.skillClearsAt = Infinity;
}

/** SetPlayerAttack for a character that is not MODEL_PLAYER. */
export function monsterAttack(state: MonsterAttackState, input: MonsterAttackInput): number {
  let action: number;
  const trap = input.trapObject;
  // Lance, fire and laser traps: an effect and a sound, no clip.
  if (trap === 39 || trap === 51) action = KEEP_CLIP;
  else if (trap === 40) action = A.Stop2;
  else if (input.model === MONSTER_MODEL_BALI) action = baliAttack(input.random);
  else {
    const hooked = hookedAttack(state, input);
    if (hooked !== undefined) action = hooked;
    else {
      action = state.swordCount % 3 === 0 ? A.Attack1 : A.Attack2;
      state.swordCount++;
    }
  }
  state.swordCount++;
  return action;
}

/** ReceiveAction AT_ATTACK1 / AT_ATTACK2 (0x18): SetPlayerAttack, then `AttackTime = 1`. */
export function monsterSwing(state: MonsterAttackState, input: MonsterAttackInput): number {
  settleSkill(state, input.now);
  const action = monsterAttack(state, input);
  state.skillClearsAt = input.now + ATTACK_TIME_MS;
  return action;
}

/**
 * ReceiveMonsterSkill (0x69, WSclient.cpp:4091-4128): records `c->MonsterSkill`; a skill in range runs
 * SetPlayerAttack, whose map hooks turn it into the monster's clip, then `AttackTime = 1`; undefined for
 * one out of range, which neither turns nor swings the monster.
 */
export function monsterSkillSwing(state: MonsterAttackState, skill: number, input: MonsterAttackInput): number | undefined {
  state.monsterSkill = skill;
  if (skill <= 0 || skill >= ATMON_SKILL_END) return undefined;
  return monsterSwing(state, input);
}

/** SetPlayerMagic for a character that is not MODEL_PLAYER. */
export function monsterMagic(state: MonsterAttackState): number {
  const action = state.swordCount % 3 === 0 ? A.Attack1 : A.Attack2;
  state.swordCount++;
  return action;
}

/** Whether that 0x19 runs `SetPlayerAttack`, a trap's branch included. */
export function monsterCastAttacks(skill: number): boolean {
  const clip = monsterCastOf(skill)?.clip;
  return clip === 'attack' || clip === 'attackHeld';
}

function castAction(state: MonsterAttackState, skill: number, input: MonsterAttackInput): number {
  const clip = monsterCastOf(skill)?.clip;
  if (clip === 'attack' || clip === 'attackHeld') return monsterAttack(state, input);
  if (clip === 'magic') return monsterMagic(state);
  if (clip === 'appear') return A.Appear;
  return KEEP_CLIP;
}

/** ReceiveMagic (0x19) with a monster caster: records `c->Skill`, then picks the clip. */
export function monsterCast(
  state: MonsterAttackState,
  skill: number,
  input: MonsterAttackInput
): number {
  settleSkill(state, input.now);
  const cast = monsterCastOf(skill);
  if (cast?.recordsSkill !== false) state.skill = skill;
  const action = castAction(state, skill, input);
  if (cast?.attackTime !== false) state.skillClearsAt = input.now + ATTACK_TIME_MS;
  return action;
}

/** Whether that 0x19 also rewinds the clip it lands on (`AnimationFrame = 0`). */
export function monsterCastRewinds(skill: number): boolean {
  const clip = monsterCastOf(skill)?.clip;
  return clip === 'attack' || clip === 'magic';
}

/** ReceiveMagicContinue (0x1E) with a monster caster; it always rewinds. */
export function monsterAreaCast(
  state: MonsterAttackState,
  skill: number,
  input: MonsterAttackInput
): number {
  settleSkill(state, input.now);
  state.skill = skill;
  const action = monsterAttack(state, input);
  state.skillClearsAt = input.now + ATTACK_TIME_MS;
  return action;
}

/**
 * Attack1 stands in for a clip the model lacks, where the original's SetAction keeps the clip
 * in hand (ZzzAI.cpp:423); with no Attack1 either, or no model to count yet, it is kept here too.
 */
export function playableMonsterClip(action: number, clipCount: number | undefined): number {
  if (action === KEEP_CLIP || clipCount === undefined) return KEEP_CLIP;
  if (action < clipCount) return action;
  return A.Attack1 < clipCount ? A.Attack1 : KEEP_CLIP;
}

/** A clip a swing or cast leaves the body in; the next one restarts it (`AnimationFrame = 0`). */
export function isMonsterSwingClip(clip: number): boolean {
  return clip === A.Attack1 || clip === A.Attack2 || clip === A.Attack3 || clip === A.Attack4;
}

/**
 * ReceiveAttackDamage (WSclient.cpp:3380-3386): a hit without the 0x8000 success bit (every
 * OpenMU hit) flinches on `rand() % 2 == 0` (5.2 ZzzAI.cpp:699), never Illusion of Kundun 7.
 */
export function monsterFlinches(success: boolean, monster: number, random: () => number): boolean {
  if (success) return true;
  return monster !== MONSTER_ILLUSION_OF_KUNDUN_7 && random() < 0.5;
}
