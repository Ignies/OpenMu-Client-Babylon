import type { PlayerAction } from '../common/objects/enum';
import type { AreaSkillHitPacket } from '../common/packets/ClientToServerPackets';
import type { SkillDefinition } from '../common/skillsDatabase';
import type { ENUM_WORLD } from '../common/types';
import type { CombatLayer } from './layer';
import { COMBAT_LAYERS } from './layers';
import { consumeInputGate, inputGateOpen, inputGateRemaining } from './inputGate';
import {
  attackInFlight,
  attackTime,
  cancelAttack,
  checkAttackTime,
  setLastAttackEffectTime,
  startAttack,
} from './attackTiming';
import { attackRange, hasAmmo, type Hands } from './weaponRange';
import { magicClip, skillClip, type CastContext } from './skillClips';
import {
  clipHoldsFacing,
  skillStepIn,
  stepInSquare,
} from './skillMovement';
import { castsOnSelf, castsOnSelfOnly, castTarget, type CastTarget } from './castTargets';
import { beginNova, novaCharge, novaCharging, novaStage, releaseNova } from './novaCharge';
import { areaHitRadius, buildAreaHit, needsAreaHit } from './areaHit';
import { comboFlash, comboKnockUp, combosLanded, observeSkillAnimation } from './combo';
import {
  beginDarkSide,
  darkSidePendingSkill,
  isDarkSide,
  nextDarkSideHit,
  observeDarkSideTargets,
  observeRageHit,
  rageStreak,
} from './rage';

export type { CombatLayer } from './layer';
export type { Hands } from './weaponRange';
export type { CastContext } from './skillClips';
export type { CastTarget } from './castTargets';

/**
 * The combat-timing layer: when a swing lands, when the next click counts,
 * how long Nova has been held, behind one
 * object. Copy `_template.ts` when adding to it.
 *
 * The game talks to `combat.update` once a frame (from `AttackSystem`, the
 * first fighting system of the frame) and `combat.reset` on a map change;
 * both fan out over `COMBAT_LAYERS` (`layers.ts`), the only list of
 * entries in the codebase. The readers and commands below are the facade's
 * public surface for the ECS consumers; every entry file stays importable
 * directly for anything that needs a single function.
 */
class Combat {
  private readonly layers: CombatLayer[] = [...COMBAT_LAYERS];

  /** Add an entry at runtime (tools, experiments). Returns the unregister. */
  register(layer: CombatLayer): () => void {
    this.layers.push(layer);
    return () => {
      const i = this.layers.indexOf(layer);
      if (i >= 0) this.layers.splice(i, 1);
    };
  }

  /** Every entry that exists on this map. */
  layersFor(map: ENUM_WORLD): CombatLayer[] {
    return this.layers.filter(l => !l.maps || l.maps.has(map));
  }

  /** Step every layer. Call once a frame, before any consumer reads combat. */
  update(map: ENUM_WORLD, dt: number): void {
    for (const layer of this.layers) layer.update?.(map, dt);
  }

  /** Drop every layer's state. Call when the map changes. */
  reset(): void {
    for (const layer of this.layers) layer.reset?.();
  }

  // ---- input gate --------------------------------------------------------

  /** `MouseUpdateTime >= MouseUpdateTimeMax`: a click may be acted on. */
  get inputGateOpen(): boolean {
    return inputGateOpen();
  }

  /** Seconds until the next click is honoured, 0 when open. */
  get inputGateRemaining(): number {
    return inputGateRemaining();
  }

  /** A click was acted on: close the gate for `MouseUpdateTimeMax`. */
  consumeInputGate(): void {
    consumeInputGate();
  }

  // ---- swing latch -------------------------------------------------------

  /** `AttackTime` in reference ticks, 0 outside a swing. */
  get attackTime(): number {
    return attackTime();
  }

  /** A swing is in flight. */
  get attackInFlight(): boolean {
    return attackInFlight();
  }

  /** `CheckAttackTime(n)`: true once per swing on tick `n`. */
  checkAttackTime(tick: number): boolean {
    return checkAttackTime(tick);
  }

  /** `SetLastAttackEffectTime()`. */
  setLastAttackEffectTime(): void {
    setLastAttackEffectTime();
  }

  /**
   * A swing started: latch `hit` to the clip's hit key. Returns the seconds
   * until the blow lands.
   */
  startAttack(
    action: PlayerAction,
    playSpeed: number,
    hit: () => void,
    clipSeconds?: number
  ): number {
    return startAttack(action, playSpeed, hit, clipSeconds);
  }

  /** Drop the swing in flight without landing it. */
  cancelAttack(): void {
    cancelAttack();
  }

  // ---- weapon range ------------------------------------------------------

  /** Reach of a basic attack with these hands, in tiles. */
  attackRange(hands: Hands): number {
    return attackRange(hands);
  }

  /** `CheckArrow()`: a launcher has its ammunition, or there is no launcher. */
  hasAmmo(hands: Hands): boolean {
    return hasAmmo(hands);
  }

  // ---- skills ------------------------------------------------------------

  /** The dedicated cast clip for a skill, or `null` for the generic rule. */
  skillClip(skill: number, ctx?: CastContext): PlayerAction | null {
    return skillClip(skill, ctx);
  }

  /** `SetPlayerMagic`: the clip a skill with no dedicated one falls back to. */
  magicClip(ctx?: CastContext): PlayerAction {
    return magicClip(ctx);
  }

  // ---- what a cast does to where the hero is ------------------------------

  /** Whether the skill relocates the caster, and when. */
  skillStepIn(skill: number): 'cast' | 'midClip' | null {
    return skillStepIn(skill);
  }

  /** The square a step-in lands on: one tile short of the target. */
  stepInSquare(
    from: { x: number; y: number },
    target: { x: number; y: number }
  ): { x: number; y: number } | null {
    return stepInSquare(from, target);
  }

  /** `bLookAtMouse = false`: the clip holds the caster's facing while it plays. */
  clipHoldsFacing(clip: PlayerAction): boolean {
    return clipHoldsFacing(clip);
  }

  // ---- who the cast is aimed at -------------------------------------------

  /** Where the cast goes: the caster, a party member, or the selection. */
  castTarget(def: SkillDefinition): CastTarget {
    return castTarget(def);
  }

  /** Whether a cast with nothing suitable selected lands on the caster. */
  castsOnSelf(def: SkillDefinition): boolean {
    return castsOnSelf(def);
  }

  /** Whether the selection is ignored outright (`HeroKey`, always). */
  castsOnSelfOnly(def: SkillDefinition): boolean {
    return castsOnSelfOnly(def);
  }

  // ---- Nova --------------------------------------------------------------

  /** The right button is down on a Nova charge. */
  get novaCharging(): boolean {
    return novaCharging();
  }

  /** How full the Nova charge is, 0…1. */
  get novaCharge(): number {
    return novaCharge();
  }

  /** The Nova charge as the server's stage count, 0…12. */
  get novaStage(): number {
    return novaStage();
  }

  /** Right button down with Nova selected. `false` = already charging. */
  beginNova(): boolean {
    return beginNova();
  }

  /** Button up: seconds held, or -1 when nothing was charging. */
  releaseNova(): number {
    return releaseNova();
  }

  // ---- area hits ---------------------------------------------------------

  /** Whether the client must name this skill's hits (0xDB). */
  needsAreaHit(def: SkillDefinition): boolean {
    return needsAreaHit(def);
  }

  /** Reach of the skill's area around the cast point, in tiles. */
  areaHitRadius(def: SkillDefinition): number {
    return areaHitRadius(def);
  }

  /** Build the 0xDB for a cast; `null` when there is nothing to hit. */
  buildAreaHit(
    skill: number,
    x: number,
    y: number,
    targetIds: readonly number[]
  ): AreaSkillHitPacket | null {
    return buildAreaHit(skill, x, y, targetIds);
  }

  // ---- combo -------------------------------------------------------------

  /** 1 the frame a combo lands, fading to 0. */
  get comboFlash(): number {
    return comboFlash();
  }

  /** Combos landed since the last reset. */
  get combosLanded(): number {
    return combosLanded();
  }

  /** The target is being lifted by a combo knock-up. */
  comboKnockUp(netId: number): boolean {
    return comboKnockUp(netId);
  }

  /** A `SkillAnimation` arrived; `true` when it announced a combo. */
  observeSkillAnimation(skill: number, targetNetId: number | undefined): boolean {
    return observeSkillAnimation(skill, targetNetId);
  }

  // ---- Rage Fighter ------------------------------------------------------

  /** Whether the skill is Dark Side (the 0x4A/0x4B pair). */
  isDarkSide(skill: number): boolean {
    return isDarkSide(skill);
  }

  /** Dark Side was cast on `targetId`. */
  beginDarkSide(skill: number, targetId: number): void {
    beginDarkSide(skill, targetId);
  }

  /** The 0x4B response named these targets. */
  observeDarkSideTargets(skill: number, targetIds: readonly number[]): void {
    observeDarkSideTargets(skill, targetIds);
  }

  /** Next follow-up target whose 0x4A is due, or -1. */
  nextDarkSideHit(): number {
    return nextDarkSideHit();
  }

  /** Skill id for the follow-up 0x4A. */
  get darkSidePendingSkill(): number {
    return darkSidePendingSkill();
  }

  /** An `ObjectHit` flagged as a Rage Fighter streak hit arrived. */
  observeRageHit(isStreak: boolean, isFinal: boolean): void {
    observeRageHit(isStreak, isFinal);
  }

  /** Hits in the running Rage Fighter streak. */
  get rageStreak(): number {
    return rageStreak();
  }
}

export const combat = new Combat();

// A hot update that reaches this module must reload the page: Vite would
// otherwise re-execute it and hand later-loaded importers a second instance
// of this singleton (same guard as store.ts).
const hot = (import.meta as { hot?: { decline(): void } }).hot;
if (hot) hot.decline();
