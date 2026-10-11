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
    state = { swordCount: 0, skill: 0, skillClearsAt: Infinity };
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
/** Sapi Queen, Ice Napin, Shadow Master, Wolf Status. */
const SWAMP_ATTACK1_MODELS = new Set([201, 202, 203, 204]);

const MONSTER_MAYA = 364;
const MONSTER_SELUPAN = 459;
const MONSTER_LUCAS = 507;

// The monsters each hook hands to CheckMonsterSkill.
const AIDA_CHECKED = new Set([304, 305, 309, 549, 550]);
/** Bloody Golem, Bloody Witch Queen: Attack2 needs a 0x69 skill. */
const AIDA_ATTACK1 = new Set([551, 552]);
const CRYWOLF_CHECKED = new Set([440, 340, 344, 345, 341, 349]);
const KANTURU2_CHECKED = new Set([358, 359, 360]);
const KANTURU3_CHECKED = new Set([361, 362, 363, MONSTER_MAYA]);
const BALGAS_CHECKED = new Set([409, 410, 411, 412]);
const CURSED_TEMPLE_CHECKED = new Set([388, 391, 394, 397, 400, 403]);

/** Kentauros and the three Warriors set a clip but break without `return true`: the default wins. */
const KANTURU1_COIN = new Set([350, 351, 352, 356, 357, 555]);

/** Raklion's ice monsters and their dark kin: Attack2 needs a 0x69 skill. */
const RAKLION_ATTACK1 = new Set([454, 455, 456, 457, 458, 562, 563, 564, 565]);

// Empire Guardian: GMEmpireGuardian1 serves all four maps, then each map's own list.
const EMPIRE_GUARDIAN_ATTACK1 = new Set([506, 507, 508, 511, 513, 518, 519]);
const EMPIRE_GUARDIAN_MAP_ATTACK1: Readonly<Record<number, ReadonlySet<number>>> = {
  [W.WD_70EMPIREGUARDIAN2]: new Set([509, 514, 515]),
  [W.WD_71EMPIREGUARDIAN3]: new Set([510, 517, 516]),
  [W.WD_72EMPIREGUARDIAN4]: new Set([504, 505]),
};

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
    if (AIDA_ATTACK1.has(monster)) return A.Attack1;
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
    if (SWAMP_ATTACK1_MODELS.has(model)) return A.Attack1;
  }

  // TheMapProcess(): only the hero's map's process runs.
  if (world === W.WD_57ICECITY || world === W.WD_58ICECITY_BOSS) {
    if (RAKLION_ATTACK1.has(monster)) return A.Attack1;
    // SetBossMonsterAction's else: every swing without a 0x69 skill.
    if (monster === MONSTER_SELUPAN) return A.Attack4;
  }
  if (world >= W.WD_69EMPIREGUARDIAN1 && world <= W.WD_72EMPIREGUARDIAN4) {
    if (EMPIRE_GUARDIAN_ATTACK1.has(monster) || EMPIRE_GUARDIAN_MAP_ATTACK1[world]?.has(monster)) {
      return A.Attack1;
    }
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
