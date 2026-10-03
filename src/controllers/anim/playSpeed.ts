import { MonsterActionType, PlayerAction } from '@versions/shared/objects/enum';
import { monsterModelTypeOfNpc } from '../actors/monsterModelTable';
import { monsterModelRegistry } from '@/controllers/monsters';
import { animations, type SpeedRule } from './animation';

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
 * multiplier is the cap - there is no clamp on the result.
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

/** A rule's rate at these stats (see `SpeedRule`). */
function ruleSpeed(rule: SpeedRule, attackSpeed: number, magicSpeed: number, isRageFighter: boolean): number {
  if (typeof rule === 'number') return rule;
  if ('rageFighter' in rule) return isRageFighter ? rule.rageFighter : rule.base;
  const plus =
    rule.plus === 'attackSpeed'
      ? attackSpeedFactor(attackSpeed)
      : rule.plus === 'magicSpeed'
        ? magicSpeedFactor(magicSpeed)
        : attackSpeedFactor(magicSpeed);
  const speed = rule.base + plus;
  return rule.times === undefined ? speed : speed * rule.times;
}

/**
 * A player clip's `PlaySpeed`: the base table (ZzzOpenData.cpp:314-372) with `SetAttackSpeed`
 * (ZzzCharacter.cpp:830-960) and `SetPlayerWalk` over it. Each clip's rule is in its animation file;
 * an id no file names gets the base table's default, 0.40 from PLAYER_SIT1 up and 0.28 below.
 */
export function playerPlaySpeed(
  action: PlayerAction,
  attackSpeed = 0,
  magicSpeed = 0,
  isRageFighter = false
): number {
  const rule = animations.get(action)?.speed ?? (action >= A.PLAYER_SIT1 ? 0.4 : 0.28);
  return ruleSpeed(rule, attackSpeed, magicSpeed, isRageFighter);
}

/**
 * The per-frame slowdowns `PlayAnimation` multiplies into the table rate (ZzzCharacter.cpp:2497-2517),
 * from each clip's `frameSpeeds`. `frame` is the clip's `AnimationFrame`.
 */
export function playerFrameSpeedScale(action: PlayerAction, frame: number, darkLord: boolean): number {
  for (const f of animations.get(action)?.frameSpeeds ?? []) {
    if (f.darkLordOnly && !darkLord) continue;
    if (frame > f.after && (f.before === undefined || frame < f.before)) return f.scale;
  }
  return 1;
}

/** The player clips a Freeze or Cold slows with the walk (ZzzCharacter.cpp:496-542): `debuffSlows`. */
export function debuffSlowsClip(action: PlayerAction): boolean {
  return !!animations.get(action)?.debuffSlows;
}

/**
 * `PLAYER_STOP_RAGEFIGHTER`'s rate, which the Phoenix Soul Star's own clip is
 * keyed to (`RenderCharacterItem`, ZzzCharacter.cpp:9922).
 */
export const RAGEFIGHTER_STOP_SPEED = 0.16;

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

  if (!animations.get(playerAction)?.wingsFlap) return 0.25;

  return spec?.flyPlaySpeed ?? 1.0;
}

const M = MonsterActionType;

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
  // Each body's own numbers are in its file (versions/shared/monster_models): `OpenMonsterModel`,
  // ZzzOpenData.cpp:2380-2440. The scale applies to STOP1..SHOCK only (the loop stops before DIE).
  const body = monsterModelRegistry.get(modelType);
  if (action < M.Die && body?.speedScale !== undefined) speed *= body.speedScale;
  return body?.clipSpeeds?.[action] ?? speed;
}

export function monsterModelTypeOf(npcType: number | undefined): number {
  if (npcType === undefined) return -1;
  return monsterModelTypeOfNpc(npcType);
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
 * send the next request before this interval has elapsed - the animation may
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
