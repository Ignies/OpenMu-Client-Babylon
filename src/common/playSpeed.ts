import { MonsterActionType, PlayerAction } from './objects/enum';
import { MONSTER_MODEL_TABLE } from './monsters/monsterModelTable';

/**
 * Animation play speeds in the original's units: `PlaySpeed` keys per tick at
 * 25 ticks/s (`ZzzBMD.cpp:382-448`, `ZzzAI.cpp:729`). Our GLB clips are
 * authored at 24 keys/s, so Babylon `speedRatio = PlaySpeed * 25 / 24`
 * (applied in ModelObject).
 */
export const BMD_KEYS_PER_SECOND = 24;
export const REFERENCE_FPS = 25;
export const PLAY_SPEED_TO_RATIO = REFERENCE_FPS / BMD_KEYS_PER_SECOND;

/**
 * `SetAttackSpeed()` stat scaling (ZzzCharacter.cpp:738-826): the piecewise
 * multiplier is the cap — there is no clamp on the result.
 */
export function attackSpeedFactor(attackSpeed: number): number {
  if (attackSpeed >= 509 && attackSpeed <= 549) return attackSpeed * 0.0026;
  if (attackSpeed >= 550 && attackSpeed <= 750) return attackSpeed * 0.0017;
  return attackSpeed * 0.004;
}

/** Magic-speed multiplier used by most spells (`MagicSpeed2`). */
export function magicSpeedFactor(magicSpeed: number): number {
  const m = magicSpeed;
  if (m <= 0) return 0;
  if (m < 300) return m * 0.0020;
  if (m < 350) return m * 0.00247;
  if (m < 400) return m * 0.0019;
  if (m < 450) return m * 0.0018;
  if (m < 500) return m * 0.0017;
  if (m < 550) return m * 0.00163;
  if (m < 600) return m * 0.00155;
  if (m < 650) return m * 0.00175;
  if (m < 700) return m * 0.0015;
  if (m < 750) return m * 0.00145;
  if (m < 800) return m * 0.0013;
  if (m < 850) return m * 0.00125;
  if (m < 900) return m * 0.00115;
  if (m < 950) return m * 0.0009;
  return m * 0.00081;
}

const A = PlayerAction;

/** Player action table (ZzzOpenData.cpp:314-372 + SetAttackSpeed bases). */
export function playerPlaySpeed(
  action: PlayerAction,
  attackSpeed = 0,
  magicSpeed = 0,
  isRageFighter = false
): number {
  const f = attackSpeedFactor(attackSpeed);

  // --- basic attacks (SetAttackSpeed, ZzzCharacter.cpp:830-960)
  if (action === A.PLAYER_ATTACK_FIST) return 0.6 + f;
  if (action === A.PLAYER_ATTACK_TWO_HAND_SWORD_TWO) return 0.24 + f;
  if (
    action === A.PLAYER_ATTACK_BOW ||
    action === A.PLAYER_ATTACK_CROSSBOW ||
    action === A.PLAYER_ATTACK_FLY_BOW ||
    action === A.PLAYER_ATTACK_FLY_CROSSBOW ||
    action === A.PLAYER_ATTACK_RIDE_BOW ||
    action === A.PLAYER_ATTACK_RIDE_CROSSBOW ||
    (action >= A.PLAYER_ATTACK_BOW_UP && action <= A.PLAYER_ATTACK_RIDE_CROSSBOW_UP)
  ) {
    return 0.3 + f;
  }
  if (action >= A.PLAYER_ATTACK_SWORD_RIGHT1 && action <= A.PLAYER_ATTACK_RIDE_CROSSBOW) {
    return 0.25 + f;
  }
  if (action >= A.PLAYER_ATTACK_SKILL_SWORD1 && action < A.PLAYER_ATTACK_END) {
    return 0.3 + f;
  }
  if (action >= A.PLAYER_SKILL_HAND1 && action <= A.PLAYER_SKILL_WEAPON2) {
    return 0.29 + magicSpeedFactor(magicSpeed);
  }

  // --- idle
  if (action >= A.PLAYER_STOP_MALE && action <= A.PLAYER_STOP_RIDE_WEAPON) {
    switch (action) {
      case A.PLAYER_STOP_SWORD:
        return 0.26;
      case A.PLAYER_STOP_TWO_HAND_SWORD:
      case A.PLAYER_STOP_SPEAR:
      case A.PLAYER_STOP_SUMMONER:
        return 0.24;
      case A.PLAYER_STOP_BOW:
      case A.PLAYER_STOP_CROSSBOW:
        return 0.22;
      case A.PLAYER_STOP_WAND:
        return 0.3;
      default:
        return 0.28;
    }
  }
  if (action === A.PLAYER_STOP_TWO_HAND_SWORD_TWO) return 0.24;

  // --- locomotion. The base table sets the whole PLAYER_WALK_MALE ..
  // PLAYER_RUN_RIDE_WEAPON block to 0.30, but SetPlayerWalk rewrites it every
  // frame it runs (ZzzCharacter.cpp:396-453): walk 0.33 (Rage Fighter 0.32)
  // over PLAYER_WALK_MALE..PLAYER_WALK_CROSSBOW, run 0.34 (RF 0.28) over
  // PLAYER_RUN..PLAYER_RUN_RIDE_WEAPON, then the two wand clips again on top.
  // PLAYER_WALK_WAND and PLAYER_WALK_SWIM sit *after* PLAYER_WALK_CROSSBOW in
  // the enum, so neither is touched by the walk loop; PLAYER_RUN_SWIM and the
  // two fly clips *are* inside the run loop and so end up at 0.34, overriding
  // the 0.35 the base table gave swimming.
  if (action >= A.PLAYER_WALK_MALE && action <= A.PLAYER_WALK_CROSSBOW) {
    return isRageFighter ? 0.32 : 0.33;
  }
  if (action === A.PLAYER_WALK_WAND) return 0.44;
  if (action === A.PLAYER_WALK_SWIM) return 0.35;
  if (action >= A.PLAYER_RUN && action <= A.PLAYER_RUN_RIDE_WEAPON) {
    if (action === A.PLAYER_RUN_WAND) return 0.76;
    return isRageFighter ? 0.28 : 0.34;
  }
  if (action === A.PLAYER_WALK_TWO_HAND_SWORD_TWO) return 0.3;
  if (action === A.PLAYER_RUN_TWO_HAND_SWORD_TWO) return 0.3;

  // --- reactions
  if (action >= A.PLAYER_DEFENSE1 && action <= A.PLAYER_SHOCK) return 0.32;
  if (action === A.PLAYER_DIE1 || action === A.PLAYER_DIE2) return 0.45;
  if (action >= A.PLAYER_SIT1) return 0.4;

  return 0.28;
}

/**
 * Wing part play speed (`RenderCharacterBackItem`, ZzzCharacter.cpp:15107-15129).
 * Flapping only while a FLY clip runs; the Wing of Storm beats at half rate up
 * there, and the Wing of Ruin is pinned to 0.15 by `RenderLinkObject` (:6477).
 */
export function wingsPlaySpeed(
  playerAction: PlayerAction,
  spec?: { playSpeed?: number; flyPlaySpeed?: number } | null
): number {
  if (spec?.playSpeed !== undefined) return spec.playSpeed;

  const flying =
    playerAction === A.PLAYER_FLY || playerAction === A.PLAYER_FLY_CROSSBOW;

  if (!flying) return 0.25;

  return spec?.flyPlaySpeed ?? 1.0;
}

const M = MonsterActionType;

/** Per-model overrides (`OpenMonsterModel`, ZzzOpenData.cpp:2380-2440; ids from _enum.h:4149+). */
const MONSTER_OVERRIDES: Readonly<Record<number, Partial<Record<MonsterActionType, number>>>> = {
  2: { [M.Walk]: 0.7 }, // Budge Dragon
  6: { [M.Walk]: 0.6 }, // Larva
  8: { [M.Walk]: 0.7 }, // Hell Spider
  9: { [M.Walk]: 1.2 }, // Spider
  10: { [M.Walk]: 0.28 }, // Cyclops
  12: { [M.Walk]: 0.3 }, // Yeti
  13: { [M.Walk]: 0.28 }, // Elite Yeti
  17: { [M.Walk]: 0.5 }, // Worm
  19: { [M.Walk]: 0.6 }, // Goblin
  20: { [M.Walk]: 0.4 }, // Chain Scorpion
  21: { [M.Walk]: 0.5 }, // Beetle Monster
  28: { [M.Walk]: 0.3 }, // Shadow
  39: { [M.Walk]: 0.22 }, // Titan
  41: { [M.Walk]: 0.18 }, // Golden Wheel
  42: { [M.Attack1]: 0.35, [M.Attack2]: 0.35 }, // Tantallos
  44: { [M.Die]: 0.3 }, // Beam Knight
  63: { [M.Die]: 0.1 }, // Death Angel
  64: { [M.Attack1]: 0.3, [M.Attack2]: 0.25, [M.Shock]: 0.15, [M.Die]: 0.25 }, // Illusion of Kundun
  66: { [M.Die]: 0.1 }, // Aegis
  67: { [M.Attack1]: 0.2, [M.Attack2]: 0.3 }, // Death Centurion
  69: { [M.Die]: 0.1 }, // Shriker
};

function monsterBasePlaySpeed(action: MonsterActionType): number {
  switch (action) {
    case M.Stop1:
      return 0.25;
    case M.Stop2:
      return 0.2;
    case M.Walk:
      return 0.34;
    case M.Attack1:
    case M.Attack2:
    case M.Attack3:
    case M.Attack4:
    case M.Appear:
      return 0.33;
    case M.Shock:
      return 0.5;
    case M.Die:
      return 0.55;
    default:
      return 0.25;
  }
}

/** Monster action table keyed by *model* index (not NPC type number). */
export function monsterPlaySpeed(modelType: number, action: MonsterActionType): number {
  let speed = monsterBasePlaySpeed(action);
  // Type multipliers apply to STOP1..SHOCK only (the loop stops before DIE).
  if (action < M.Die) {
    if (modelType === 3) speed *= 1.2;
    if (modelType === 5 || modelType === 25) speed *= 0.7;
    if (modelType === 37 || modelType === 42) speed *= 0.4;
  }
  const override = MONSTER_OVERRIDES[modelType]?.[action];
  return override ?? speed;
}

export function monsterModelTypeOf(npcType: number | undefined): number {
  if (npcType === undefined) return -1;
  return MONSTER_MODEL_TABLE[npcType]?.[0] ?? -1;
}

/**
 * Applies the stat-scaled play speed of a player action to `model` *now*,
 * so that `getActionDuration`/`restartAction` called in the same frame see
 * the attack/cast rate rather than the stale idle/walk rate (AnimationSystem
 * only re-applies speeds later in the frame).
 */
export function applyPlayerActionSpeed(
  model: { AnimationSpeed: number; actionPlaySpeed(a: number): number | undefined },
  action: PlayerAction,
  attrs: { getValue(name: any): number } | undefined
): void {
  model.AnimationSpeed =
    model.actionPlaySpeed(action) ??
    playerPlaySpeed(
      action,
      attrs?.getValue('attackSpeed') ?? 0,
      attrs?.getValue('magicSpeed') ?? 0
    );
}

/**
 * OpenMU's Speedhack Anti-Cheat (SpeedHackDetectPlugIn.AttackCheatCheckAsync)
 * accepts at most one hit/skill per
 * `max(AttackSpeedMinIntervalMs, AttackSpeedBaseDelayMs - attackSpeed * AttackSpeedScalingFactor)`
 * ms on a 5-token bucket; sustained faster rates earn warnings and, after
 * MaxWarnings, a ban. A very fast clip (high agility) must therefore never
 * send the next request before this interval has elapsed — the animation may
 * play at its stat rate, the *request* waits. Values mirror the plugin's
 * defaults; a small margin absorbs timer/network jitter.
 */
export const SERVER_ATTACK_BASE_DELAY_MS = 450;
export const SERVER_ATTACK_SCALING_FACTOR = 1.2;
export const SERVER_ATTACK_MIN_INTERVAL_MS = 60;
const SERVER_ATTACK_SAFETY_MARGIN = 1.1;

export function serverMinAttackInterval(attackSpeed: number): number {
  const ms = Math.max(
    SERVER_ATTACK_MIN_INTERVAL_MS,
    SERVER_ATTACK_BASE_DELAY_MS - attackSpeed * SERVER_ATTACK_SCALING_FACTOR
  );
  return (ms / 1000) * SERVER_ATTACK_SAFETY_MARGIN;
}
