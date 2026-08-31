/**
 * Skill re-use delays (`CSkillManager::CheckSkillDelay` / `CalcSkillDelay`):
 * a skill with a `Delay` in Skill.bmd cannot be cast again until it has
 * counted down. The server is authoritative; this is display and the
 * client-side gate the cast system asks before sending.
 *
 * Driven by `startSkillCooldown` (the cast system, on a successful cast);
 * counts down in `update`. Read by the hotbar (`bottomBar`), which sweeps
 * the original's red-tinted clock overlay (`RenderSkillDelay`), and by
 * `usability.ts`.
 *
 * Two clocks: `skillCooldowns` is observable but only changes when a delay
 * *starts* or *ends*, so React learns which slots are cooling; the running
 * seconds live in a plain map and are pushed to `onCooldownTick` listeners
 * once a frame, which the hotbar paints straight into the sweep's `height`
 * through a ref. The old design wrote the observable every frame and
 * re-rendered the whole hotbar (five slots, tooltips, drag state) at frame
 * rate for the duration of every delay.
 */
import { observable, runInAction } from 'mobx';
import type { ENUM_WORLD } from '../common/types';
import type { SkillLayer } from './layer';
import { SKILL_DELAY_MS } from './recipes';

// ---- 1. tuning -------------------------------------------------------------

/** Skill.bmd delays are milliseconds; the layer clock is seconds. */
const MS_PER_SECOND = 1000;

// ---- 2. state + readers ----------------------------------------------------

export interface SkillCooldown {
  /** Seconds still to wait. */
  remaining: number;
  /** Seconds the full delay lasts. */
  total: number;
  /** remaining / total, 1 right after the cast, 0 when ready. */
  fraction: number;
}

/**
 * Skill number → full delay in seconds, present while the skill cools.
 * Observable so a slot re-renders when its delay starts or ends; the
 * countdown itself is not observable (see the header).
 */
export const skillCooldowns = observable.map<number, number>();

/** Skill number → seconds left; the per-frame clock. */
const remainingOf = new Map<number, number>();

type TickListener = () => void;
const tickListeners = new Set<TickListener>();

/**
 * Called once a frame while at least one skill is cooling (and once more
 * when the last one ends). Listeners read `skillCooldown(num)`.
 */
export function onCooldownTick(listener: TickListener): () => void {
  tickListeners.add(listener);
  return () => {
    tickListeners.delete(listener);
  };
}

/** The full delay of a skill in seconds, 0 when it has none. */
export function skillDelaySeconds(num: number): number {
  return (SKILL_DELAY_MS[num] ?? 0) / MS_PER_SECOND;
}

/** Seconds left before the skill can be cast again, 0 when ready. */
export function skillCooldownRemaining(num: number): number {
  return remainingOf.get(num) ?? 0;
}

/** The running delay of a skill, or `null` when it is ready (or has none). */
export function skillCooldown(num: number): SkillCooldown | null {
  const remaining = skillCooldownRemaining(num);
  if (remaining <= 0) return null;
  const total = skillDelaySeconds(num);
  return { remaining, total, fraction: total > 0 ? remaining / total : 0 };
}

/**
 * Start the skill's delay after a cast. Returns `false` when the skill is
 * still cooling down (the caller should not have cast) — `CheckSkillDelay`.
 * Skills without a delay always return `true`.
 */
export function startSkillCooldown(num: number): boolean {
  const total = skillDelaySeconds(num);
  if (total <= 0) return true;
  if (skillCooldownRemaining(num) > 0) return false;
  remainingOf.set(num, total);
  runInAction(() => skillCooldowns.set(num, total));
  notify();
  return true;
}

function notify(): void {
  for (const listener of tickListeners) listener();
}

function update(_map: ENUM_WORLD, dt: number): void {
  if (remainingOf.size === 0) return;

  let ended: number[] | null = null;
  for (const [num, left] of remainingOf) {
    const next = left - dt;
    if (next <= 0) {
      remainingOf.delete(num);
      (ended ??= []).push(num);
    } else {
      remainingOf.set(num, next);
    }
  }

  if (ended) {
    const done = ended;
    runInAction(() => {
      for (const num of done) skillCooldowns.delete(num);
    });
  }

  notify();
}

function reset(): void {
  remainingOf.clear();
  runInAction(() => skillCooldowns.clear());
  notify();
}

// ---- 3. the layer ----------------------------------------------------------

export const cooldownsLayer: SkillLayer = {
  name: 'cooldowns',
  update,
  reset,
};

// Dev hook for the live harness: no delayed skill is castable by every test
// character, so probes start one by hand (`window.__skillCooldowns.start(62)`).
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as unknown as { __skillCooldowns: unknown }).__skillCooldowns = {
    start: startSkillCooldown,
    remaining: skillCooldownRemaining,
  };
}
