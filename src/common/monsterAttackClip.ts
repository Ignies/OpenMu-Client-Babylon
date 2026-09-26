import { inDevilSquare } from './locomotion';
import { MonsterActionType as A } from './objects/enum';
import { REFERENCE_FPS } from './playSpeed';
import { ENUM_WORLD as W } from './types';

// SetPlayerAttack / SetPlayerMagic for a body that is not MODEL_PLAYER (ZzzCharacter.cpp:1222-1348)
// with their map hooks, and the monster side of ReceiveMagic (0x19) and ReceiveMagicContinue (0x1E).

/** The hook ran but called no `SetAction`: the clip in hand plays on. */
export const KEEP_CLIP = -1;

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

// ActionSkillType (_enum.h:309)
const SKILL_POISON = 1;
const SKILL_METEO = 2;
const SKILL_LIGHTNING = 3;
const SKILL_FIREBALL = 4;
const SKILL_FLAME = 5;
const SKILL_ICE = 7;
const SKILL_POWERWAVE = 11;
const SKILL_SOUL_BARRIER = 16;
const SKILL_ENERGYBALL = 17;
const SKILL_HEALING = 26;
const SKILL_DEFENSE = 27;
const SKILL_ATTACK = 28;
const SKILL_SUMMON = 30;
const SKILL_DECAY = 38;
const SKILL_BOSS = 50;
const SKILL_IMPROVE_AG = 53;
const SKILL_FIRE_SLASH = 55;
const SKILL_COMBO = 59;
const SKILL_PARTY_TELEPORT = 63;
const SKILL_MONSTER_SUMMON = 200;
const SKILL_MONSTER_MAGIC_DEF = 201;
const SKILL_MONSTER_PHY_DEF = 202;
const SKILL_GIGANTIC_STORM = 237;
const SKILL_CHAOTIC_DISEIER = 238;
const SKILL_DOPPELGANGER_SELFDESTRUCTION = 239;
const SKILL_POISON_STR = 384;
const SKILL_FIRE_SLASH_STR = 490;

/** ReceiveMagic cases that run `SetPlayerAttack` on a monster and rewind it (`AnimationFrame = 0`). */
const CAST_ATTACK = new Set([
  SKILL_LIGHTNING, 379, 480, SKILL_FIREBALL, SKILL_METEO, SKILL_ICE, 389, 489,
  SKILL_ENERGYBALL, SKILL_POWERWAVE, SKILL_POISON, SKILL_POISON_STR,
  SKILL_FLAME, 378, 483, SKILL_FIRE_SLASH, SKILL_FIRE_SLASH_STR, SKILL_PARTY_TELEPORT,
]);

/** The ones that run it without the rewind. */
const CAST_ATTACK_HELD = new Set([
  SKILL_MONSTER_SUMMON, SKILL_MONSTER_MAGIC_DEF, SKILL_MONSTER_PHY_DEF, SKILL_CHAOTIC_DISEIER,
]);

/** `SetPlayerMagic` (for anyone but the hero), with the rewind. */
const CAST_MAGIC = new Set([
  SKILL_HEALING, 413, SKILL_ATTACK, 420, 422, SKILL_DEFENSE, 417, 423,
  SKILL_SUMMON, SKILL_SUMMON + 1, SKILL_SUMMON + 2, SKILL_SUMMON + 3,
  SKILL_SUMMON + 4, SKILL_SUMMON + 5, SKILL_SUMMON + 6,
  SKILL_SOUL_BARRIER, 403, 404, SKILL_IMPROVE_AG,
]);

/** 0x19 skills whose case (or the default) starts no AttackTime, of those monsters cast or hooks read. */
const CAST_WITHOUT_ATTACK_TIME = new Set([
  SKILL_COMBO, SKILL_MONSTER_SUMMON, SKILL_CHAOTIC_DISEIER, SKILL_DOPPELGANGER_SELFDESTRUCTION,
  SKILL_DECAY, SKILL_GIGANTIC_STORM,
]);

// SetCurrentAction_HellasMonster (GMHellas.cpp:960): Kalima 1-6, on any map.
const DEATH_CENTURIONS = new Set([145, 175, 183, 191, 261, 269]);
const AEGIS_AND_ROGUE_CENTURIONS = new Set([
  147, 177, 185, 193, 263, 271, 148, 178, 186, 194, 264, 272,
]);
const NECRONS = new Set([149, 179, 187, 195, 265, 273]);
const SCHRIKERS_AND_ILLUSIONS = new Set([
  160, 180, 188, 196, 266, 274, 161, 181, 189, 197, 267, MONSTER_ILLUSION_OF_KUNDUN_7,
]);
const DEATH_CENTURION_ATTACK2 = new Set([
  SKILL_ENERGYBALL, SKILL_FIRE_SLASH, SKILL_FIRE_SLASH_STR, SKILL_POISON, SKILL_POISON_STR,
  SKILL_MONSTER_SUMMON, SKILL_MONSTER_MAGIC_DEF, SKILL_MONSTER_PHY_DEF,
]);

const MONSTER_MODEL_BALI = 32;
const MONSTER_MODEL_BATTLE_GUARD1 = 76;
const MONSTER_MODEL_BATTLE_GUARD2 = 77;
const MONSTER_MODEL_MEDUSA = 192;
/** Sapi Queen, Ice Napin, Shadow Master, Wolf Status. */
const SWAMP_ATTACK1_MODELS = new Set([201, 202, 203, 204]);

const MONSTER_FIRE_GOLEM = 291;
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

function coin(random: () => number): number {
  return random() < 0.5 ? A.Attack1 : A.Attack2;
}

function hellasAttack(state: MonsterAttackState, input: MonsterAttackInput): number | undefined {
  const { monster, random } = input;
  if (DEATH_CENTURIONS.has(monster)) {
    return DEATH_CENTURION_ATTACK2.has(state.skill) ? A.Attack2 : A.Attack1;
  }
  if (AEGIS_AND_ROGUE_CENTURIONS.has(monster)) {
    return state.skill === SKILL_ENERGYBALL ? A.Attack2 : A.Attack1;
  }
  if (NECRONS.has(monster)) {
    if (state.skill === SKILL_POISON || state.skill === SKILL_POISON_STR) return A.Attack2;
    return state.skill === SKILL_ENERGYBALL ? A.Attack1 : KEEP_CLIP;
  }
  if (SCHRIKERS_AND_ILLUSIONS.has(monster)) return coin(random);
  return undefined;
}

/** `M38Kanturu2nd::Is_Kanturu2nd_3rd`. */
function inKanturu2nd3rd(world: number): boolean {
  return world === W.WD_38KANTURU_2ND || world === W.WD_39KANTURU_3RD;
}

/** The hooks SetPlayerAttack runs in turn; undefined when none took the swing over. */
function hookedAttack(state: MonsterAttackState, input: MonsterAttackInput): number | undefined {
  const { world, monster, model, random } = input;

  const hellas = hellasAttack(state, input);
  if (hellas !== undefined) return hellas;

  // battleCastle::SetCurrentAction_BattleCastleMonster, on any map.
  if (model === MONSTER_MODEL_BATTLE_GUARD1 || model === MONSTER_MODEL_BATTLE_GUARD2) {
    return A.Shock;
  }

  if (world === W.WD_31HUNTING_GROUND && monster === MONSTER_FIRE_GOLEM) {
    return state.skill === SKILL_BOSS ? A.Attack1 : A.Attack2;
  }
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
    if (model === MONSTER_MODEL_MEDUSA) {
      if (state.skill === SKILL_DECAY || state.skill === SKILL_CHAOTIC_DISEIER) return A.Attack2;
      if (state.skill === SKILL_GIGANTIC_STORM) return A.Attack3;
      return A.Attack1;
    }
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
  return CAST_ATTACK.has(skill) || CAST_ATTACK_HELD.has(skill);
}

function castAction(state: MonsterAttackState, skill: number, input: MonsterAttackInput): number {
  if (monsterCastAttacks(skill)) return monsterAttack(state, input);
  if (CAST_MAGIC.has(skill)) return monsterMagic(state);
  if (skill === SKILL_DOPPELGANGER_SELFDESTRUCTION) return A.Appear;
  return KEEP_CLIP;
}

/** ReceiveMagic (0x19) with a monster caster: records `c->Skill`, then picks the clip. */
export function monsterCast(
  state: MonsterAttackState,
  skill: number,
  input: MonsterAttackInput
): number {
  settleSkill(state, input.now);
  if (skill !== SKILL_COMBO) state.skill = skill;
  const action = castAction(state, skill, input);
  if (!CAST_WITHOUT_ATTACK_TIME.has(skill)) state.skillClearsAt = input.now + ATTACK_TIME_MS;
  return action;
}

/** Whether that 0x19 also rewinds the clip it lands on (`AnimationFrame = 0`). */
export function monsterCastRewinds(skill: number): boolean {
  return CAST_ATTACK.has(skill) || CAST_MAGIC.has(skill);
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
