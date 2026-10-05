import type { Controller } from '../controller';
import type { Entity, Item } from '../../ecs/world';
import type { PlayerAction } from '@versions/shared/objects/enum';
import type { AreaSkillHitPacket } from '@versions/shared/packets/ClientToServerPackets';
import type { SkillDefinition } from '@versions/shared/skills/skillsDatabase';
import type { ENUM_WORLD } from '../../core/types';
import type { CombatLayer } from './layer';
import { COMBAT_LAYERS } from './layers';
import { consumeInputGate, inputGateOpen, inputGateRemaining } from './inputGate';
import {
  attackInFlight,
  attackTime,
  blowHeldTicks,
  cancelAttack,
  checkAttackTime,
  hitDelaySeconds,
  releasesOnKey,
  setLastAttackEffectTime,
  startAttack,
} from './attackTiming';
import { attackRange, equippedLauncher, hasAmmo, type Hands } from './weaponRange';
import { castQuietOn, magicClip, othersSeeClip, skillClip, type CastContext } from './skillClips';
import {
  clipHoldsFacing,
  skillStepIn,
  stepInSquare,
} from './skillMovement';
import { castsOnSelf, castsOnSelfOnly, castTarget, type CastTarget } from './castTargets';
import { skillHooks } from './skillHooks';
import { skillKill, type SkillKill } from './skillKills';
import { SHOCK_IMMUNE_CLIPS } from './recipes';
import { registerSkillRules, type SkillCombatRules } from './skillRules';
import { areaHitRadius, buildAreaHit, needsAreaHit } from './areaHit';

export type { CombatLayer } from './layer';
export type { Hands } from './weaponRange';
export type { CastContext } from './skillClips';
export type { CastTarget } from './castTargets';
export type { SkillKill } from './skillKills';
export type { SkillCombatRules } from './skillRules';
export type { ClipPick, SkillClipSet } from './recipes';
export type { CastPose, PoseClip } from './skillClips';
export { RIDER_FLY_WORLDS } from './recipes';
export { RELEASE_KEY, RELEASE_TICKS } from './attackTiming';

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
class Combat implements Controller {
  readonly id = 'combat';
  private readonly layers: CombatLayer[] = [...COMBAT_LAYERS];

  /** Add an entry at runtime (tools, experiments). Returns the unregister. */
  register(layer: CombatLayer): () => void {
    this.layers.push(layer);
    return () => {
      const i = this.layers.indexOf(layer);
      if (i >= 0) this.layers.splice(i, 1);
    };
  }

  /** A skill file's combat fields (clip rules, target, step-in, kill, layer, hooks): `registerSkills` calls this. */
  registerSkill(id: number, rules: SkillCombatRules): void {
    registerSkillRules(id, rules, layer => this.register(layer));
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

  /**
   * Seconds from a swing's start to its blow, for anyone whose swing this
   * client does not latch (another player's attack packet).
   */
  hitDelaySeconds(action: PlayerAction, playSpeed: number): number {
    return hitDelaySeconds(action, playSpeed);
  }

  /** AttackStage's default case lets this clip release a cast on its key (`attackTiming.ts`). */
  releasesOnKey(action: number, monsterRig: boolean): boolean {
    return releasesOnKey(action, monsterRig);
  }

  /** Ticks the hero's last hit request waited for its blow, while its kill can still arrive. */
  get blowHeldTicks(): number {
    return blowHeldTicks();
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

  /** The bow or crossbow in these hands, `null` when neither is one. */
  equippedLauncher(hands: Hands): Item | null {
    return equippedLauncher(hands);
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

  /** The clip everyone else plays for this skill's `clip`. */
  othersSeeClip(skill: number, clip: PlayerAction): PlayerAction {
    return othersSeeClip(skill, clip);
  }

  /** On this mount the cast is dropped for others and silent for the hero. */
  castQuietOn(skill: number, mount: CastContext['mount']): boolean {
    return castQuietOn(skill, mount);
  }

  /** `SetPlayerShock` leaves a player in this clip alone: the cast finishes. */
  clipIgnoresHit(clip: PlayerAction): boolean {
    return SHOCK_IMMUNE_CLIPS.has(clip);
  }

  /** What a kill with this skill does to the body, `undefined` when nothing. */
  skillKill(skill: number): SkillKill | undefined {
    return skillKill(skill);
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

  /** The Nova release skill number, -1 when no skill fills the slot. */
  get novaSkill(): number {
    return skillHooks.nova?.skill ?? -1;
  }

  /** The skill number that starts the Nova charge, -1 when no skill fills the slot. */
  get novaBeginSkill(): number {
    return skillHooks.nova?.beginSkill ?? -1;
  }

  /** The right button is down on a Nova charge. */
  get novaCharging(): boolean {
    return skillHooks.nova?.charging() ?? false;
  }

  /** How full the Nova charge is, 0…1. */
  get novaCharge(): number {
    return skillHooks.nova?.charge() ?? 0;
  }

  /** The Nova charge as the server's stage count, 0…12. */
  get novaStage(): number {
    return skillHooks.nova?.stage() ?? 0;
  }

  /** Right button down with Nova selected. `false` = already charging. */
  beginNova(): boolean {
    return skillHooks.nova?.begin() ?? false;
  }

  /** Button up: seconds held, or -1 when nothing was charging. */
  releaseNova(): number {
    return skillHooks.nova?.release() ?? 0;
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
    return skillHooks.combo?.flash() ?? 0;
  }

  /** Combos landed since the last reset. */
  get combosLanded(): number {
    return skillHooks.combo?.landed() ?? 0;
  }

  /** The target is being lifted by a combo knock-up. */
  comboKnockUp(netId: number): boolean {
    return skillHooks.combo?.knockUp(netId) ?? false;
  }

  /** A `SkillAnimation` arrived; `true` when it announced a combo. */
  observeSkillAnimation(skill: number, targetNetId: number | undefined): boolean {
    return skillHooks.combo?.observeSkillAnimation(skill, targetNetId) ?? false;
  }

  // ---- Rage Fighter ------------------------------------------------------

  /** Whether the skill is Dark Side (the 0x4A/0x4B pair). */
  isDarkSide(skill: number): boolean {
    return skillHooks.darkSide?.isDarkSide(skill) ?? false;
  }

  /** Dark Side was cast on `targetId`. */
  beginDarkSide(skill: number, targetId: number): void {
    skillHooks.darkSide?.begin(skill, targetId);
  }

  /** The 0x4B response named these targets. */
  observeDarkSideTargets(skill: number, targetIds: readonly number[]): void {
    skillHooks.darkSide?.observeTargets(skill, targetIds);
  }

  /**
   * The server echoed a 0x4A of `caster`'s; the hero's cast's starts his follow-ups. True when it repeats
   * a Dark Side cast already drawn.
   */
  observeDarkSideEcho(skill: number, caster: Entity): boolean {
    return skillHooks.darkSide?.observeEcho(skill, caster) ?? false;
  }

  /** An `ObjectHit` flagged as a Rage Fighter streak hit arrived. */
  observeRageHit(isStreak: boolean, isFinal: boolean): void {
    skillHooks.darkSide?.observeRageHit(isStreak, isFinal);
  }

  /** Hits in the running Rage Fighter streak. */
  get rageStreak(): number {
    return skillHooks.darkSide?.streak() ?? 0;
  }
}

export const combat = new Combat();

// A hot update that reaches this module must reload the page: Vite would
// otherwise re-execute it and hand later-loaded importers a second instance
// of this singleton.
const hot = (import.meta as { hot?: { decline(): void } }).hot;
if (hot) hot.decline();

// Skill tables `registerSkills` fills; read by lighting, sound and the skills module.
export { MASTER_BASES, masterBase } from './skillAliases';
export { SKILL_DELAY_MS } from './skillDelays';
export { castsOnSelf } from './castTargets';
export { castSwing, castsAsSpell, magicClip, poseClip, skillClip, swordCountRule } from './skillClips';
