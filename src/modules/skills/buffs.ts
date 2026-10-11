/**
 * Active buffs / debuffs of the hero with the moment each one arrived.
 *
 * Driven by `HeroSkills.buffs` (MagicEffectStatus 0x07 / MagicEffectCancelled,
 * `net.ts`): a MobX reaction stamps every newly present effect id with the
 * layer clock. OpenMU S6 sends a duration only for item effects (0x2D,
 * `setBuffTime`); otherwise `buffRemaining` counts down for effects whose
 * duration formula the client knows (`recipes.ts`) and answers `null`.
 *
 * Read by the buff bar (`versions/shared/ui/hud/buff_bar`) through `skills.activeBuffs`
 * / `skills.buffRemaining`, and by the usability rules (`usability.ts`).
 */
import { reaction } from 'mobx';
import type { ENUM_WORLD } from '../../core/types';
import type { SkillLayer } from './layer';
import { buffRecipe, type BuffKind } from './recipes';
import { HeroSkills } from './state';
import { Hero } from '../hero';

// ---- 1. tuning -------------------------------------------------------------

// Nothing to tune: the clock is the frame clock and durations are recipes.

// ---- 2. state + readers ----------------------------------------------------

export interface ActiveBuff {
  id: number;
  name: string;
  kind: BuffKind;
  /** Layer-clock seconds when the effect appeared. */
  startedAt: number;
}

/** Seconds of `update` since the last reset - the layer's own clock. */
let clock = 0;
/** Effect id → clock seconds when it appeared. */
const startedAt = new Map<number, number>();
/** Effect id → clock seconds when it runs out, for the effects whose time the server sent (0x2D). */
const endsAt = new Map<number, number>();

/** `RegisterBuff(type, Hero, time)` (WSclient.cpp:10265): the server's remaining seconds for an effect. */
export function setBuffTime(effectId: number, seconds: number): void {
  endsAt.set(effectId, clock + seconds);
}

function noteBuffs(ids: readonly number[] | undefined): void {
  // Defensive: a reaction whose expression threw hands over `undefined`.
  if (!ids) return;
  for (const id of ids) if (!startedAt.has(id)) startedAt.set(id, clock);
  for (const id of Array.from(startedAt.keys())) {
    if (!ids.includes(id)) startedAt.delete(id);
  }
  for (const id of Array.from(endsAt.keys())) {
    if (!ids.includes(id)) endsAt.delete(id);
  }
}

/** Disposer of the `HeroSkills.buffs` reaction once it is running. */
let stopWatching: (() => void) | null = null;

/**
 * Start following `HeroSkills.buffs`, on the first `update` (by the first frame every module has
 * finished evaluating). `buffs` is replaced wholesale on every change, so the reaction fires
 * once per packet; `fireImmediately` catches a hero that logged in buffed.
 */
function ensureWatching(): void {
  if (stopWatching) return;
  stopWatching = reaction(() => HeroSkills.buffs, noteBuffs, { fireImmediately: true });
}

/**
 * The hero's effects in the original's bar order (`CNewUIBuffWindow::
 * BuffSort`): buffs first, newest leftmost; debuffs after, oldest first.
 */
export function activeBuffs(): ActiveBuff[] {
  const buffs: ActiveBuff[] = [];
  const debuffs: ActiveBuff[] = [];
  for (const id of HeroSkills.buffs) {
    const recipe = buffRecipe(id);
    const entry: ActiveBuff = {
      id,
      name: recipe.name,
      kind: recipe.kind,
      startedAt: startedAt.get(id) ?? clock,
    };
    if (recipe.kind === 'debuff') debuffs.push(entry);
    else buffs.unshift(entry);
  }
  return buffs.concat(debuffs);
}

/** Whether the hero currently carries this effect. */
export function hasBuff(effectId: number): boolean {
  return HeroSkills.buffs.includes(effectId);
}

/**
 * Seconds until the effect runs out by the client's best estimate, or
 * `null` when the server never told and no formula is known.
 */
export function buffRemaining(effectId: number): number | null {
  const end = endsAt.get(effectId);
  if (end !== undefined) return Math.max(0, end - clock);
  const started = startedAt.get(effectId);
  const duration = buffRecipe(effectId).durationSeconds;
  if (started === undefined || !duration) return null;
  const total = duration(Hero.eng);
  return Math.max(0, total - (clock - started));
}

function update(_map: ENUM_WORLD, dt: number): void {
  ensureWatching();
  clock += dt;
}

function reset(): void {
  // The buffs themselves survive a warp (the server re-sends nothing), so
  // their start stamps do too; only the clock is rebased.
  const now = clock;
  for (const [id, at] of startedAt) startedAt.set(id, at - now);
  for (const [id, at] of endsAt) endsAt.set(id, at - now);
  clock = 0;
}

// ---- 3. the layer ----------------------------------------------------------

export const buffsLayer: SkillLayer = {
  name: 'buffs',
  update,
  reset,
};
