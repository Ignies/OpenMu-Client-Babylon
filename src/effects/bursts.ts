/**
 * Bursts — the server-driven object effects: level-up, shield potion,
 * shield lost, swirl. Short additive flare bursts around a body, each a row
 * in `BURSTS`. The original's `ReceiveLevelUp` (WSclient.cpp:6455-6476)
 * spawns 15 flare joints that rise ~40 ticks plus a magic ring; the shield
 * ones are `CreateEffect(BITMAP_SHINY…)` puffs.
 *
 * Driven by: `playBurst` from `ecs/systems/objectEffectSystem.ts` (the
 * `objectEffect` event). Read by: nobody.
 */
import type { Scene, Vector3 } from '../libs/babylon/exports';
import { emitBurst, type ParticleRecipe, type RGB } from './core';
import { TEX } from './recipes';
import { DEAD_HANDLE, type EffectHandle, type EffectLayer } from './layer';

// ---- 1. tuning -------------------------------------------------------------

type BurstRow = {
  colour: RGB;
  count: number;
  /** Seconds a flare lives. */
  seconds: number;
  /** Emit box half-width in tiles around the body. */
  radius: number;
  /** Tiles/s upward. */
  rise: number;
  /** Flare edge in tiles. */
  size: number;
  /** Emit box bottom above the feet. */
  height: number;
};

export type BurstKind = 'levelUp' | 'shieldPotion' | 'shieldLost' | 'swirl';

/** Keyed by the `objectEffect` event's name. */
export const BURSTS: Record<BurstKind, BurstRow> = {
  // 15 joints × ~40 ticks, gold: a column of rising sparks.
  levelUp: { colour: [1, 0.85, 0.4], count: 60, seconds: 1.6, radius: 0.6, rise: 1.8, size: 0.35, height: 0.1 },
  shieldPotion: { colour: [0.4, 0.7, 1], count: 24, seconds: 0.8, radius: 0.5, rise: 0.8, size: 0.25, height: 0.8 },
  shieldLost: { colour: [0.8, 0.3, 0.3], count: 24, seconds: 0.8, radius: 0.5, rise: 0.4, size: 0.25, height: 0.8 },
  swirl: { colour: [1, 1, 1], count: 30, seconds: 1.0, radius: 0.4, rise: 1.2, size: 0.2, height: 0.2 },
};

// ---- 2. state + readers ----------------------------------------------------

export interface BurstsOptions {
  kind: BurstKind;
}

const recipes = new Map<BurstKind, ParticleRecipe>();

function recipeFor(kind: BurstKind): ParticleRecipe {
  let r = recipes.get(kind);
  if (r) return r;
  const row = BURSTS[kind];
  r = {
    texture: TEX.flare,
    colour: row.colour,
    size: row.size,
    sizeJitter: 0.3,
    life: row.seconds,
    box: [row.radius, 0.15, row.radius],
    dir1: [-0.15, 1, -0.15],
    dir2: [0.15, 1, 0.15],
    power: row.rise,
    gravity: row.rise * 0.25,
    spin: 1,
  };
  recipes.set(kind, r);
  return r;
}

/** Command: one burst of `kind` at a world position (tiles). */
export function playBurst(scene: Scene, kind: BurstKind, at: Vector3): void {
  const row = BURSTS[kind];
  const r = recipeFor(kind);
  // The box sits above the feet; nudge the emitter up by the row's height.
  at.y += row.height;
  emitBurst(scene, r, at, row.count);
  at.y -= row.height;
}

function spawn(scene: Scene, at: Vector3, opts: BurstsOptions): EffectHandle {
  playBurst(scene, opts.kind, at);
  return DEAD_HANDLE;
}

// ---- 3. the layer ----------------------------------------------------------

/** No update: the shared particle pool steps itself; reset is the pool's. */
export const burstsLayer: EffectLayer<BurstsOptions, 'bursts'> = {
  name: 'bursts',
  spawn,
};
