/**
 * Bursts — the server-driven object effects: level-up, shield potion,
 * shield lost, swirl. Short additive flare bursts around a body, each a row
 * in `BURSTS`. The original's `ReceiveLevelUp` (WSclient.cpp:6455-6476)
 * spawns 15 flare joints that rise ~40 ticks plus a magic ring; the shield
 * ones are `CreateEffect(BITMAP_SHINY…)` puffs.
 *
 * A row may carry two more parts, both the level-up's: `rings`, the flare
 * joints drawn as ribbons that orbit the spot while they climb, and
 * `ground`, the circle that spreads under the feet.
 *
 * Driven by: `playBurst` from `ecs/systems/objectEffectSystem.ts` (the
 * `objectEffect` event). Read by: nobody.
 */
import { Vector3, type Scene } from '../libs/babylon/exports';
import { emitBurst, fxNow, hash, type ParticleRecipe, type PointSource, type RGB } from './core';
import { spawnJoint } from './joint';
import { spawnRing } from './ring';
import { TEX } from './recipes';
import { DEAD_HANDLE, type EffectHandle, type EffectLayer } from './layer';

// ---- 1. tuning -------------------------------------------------------------

/**
 * Ribbons whose heads circle the spot the effect fired on while they climb:
 * the original's `CreateJoint(BITMAP_FLARE, pos, pos, angle, 0, hero, 40, 2)`
 * (ZzzEffectJoint.cpp:1628-1652, :5327-5361). The orbit centre is frozen at
 * spawn, so the rings stay where the level-up happened.
 */
type BurstRings = {
  /** Ribbon count (C++ 15). */
  count: number;
  colour: RGB;
  /** Orbit radius in tiles (C++ `Velocity` 40). */
  radius: number;
  /** Tiles/s the head climbs (C++ `Direction[2]` 2.0-4.5 a tick). */
  rise: number;
  /** Fraction of `rise` the per-ribbon roll spreads over, so they never stack. */
  riseJitter: number;
  /** Radians/s around the centre (C++ 0.5 rad a tick at 25 Hz). */
  spin: number;
  /** Lifetime in seconds (C++ `LifeTime` 50). */
  seconds: number;
  /** Ribbon width in tiles (C++ `Scale` 40). */
  width: number;
  /** Tail slots, ~1.5 turns of ribbon at this spin (C++ `MaxTails` 20). */
  tails: number;
  /** Where the heads start above the feet. */
  height: number;
};

/** The circle that spreads under the feet: `CreateEffect(BITMAP_MAGIC + 1, …, 0, …)`. */
type BurstGround = {
  colour: RGB;
  /** Diameter in tiles at the end (C++ `Scale = (20 - LifeTime) * 0.15`). */
  scale: number;
  /** Lifetime in seconds (C++ `LifeTime` 20). */
  seconds: number;
};

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
  rings?: BurstRings;
  ground?: BurstGround;
};

export type BurstKind = 'levelUp' | 'shieldPotion' | 'shieldLost' | 'swirl';

/** Keyed by the `objectEffect` event's name. */
export const BURSTS: Record<BurstKind, BurstRow> = {
  // 15 joints × ~40 ticks, gold: a column of rising sparks.
  levelUp: {
    colour: [1, 0.85, 0.4],
    count: 60,
    seconds: 1.6,
    radius: 0.6,
    rise: 1.8,
    size: 0.35,
    height: 0.1,
    // The character's own light tints these in the original, which on open
    // terrain is a warm white.
    rings: {
      count: 15,
      colour: [1, 0.95, 0.7],
      radius: 0.4,
      rise: 0.8,
      riseJitter: 0.4,
      spin: 12.5,
      seconds: 2,
      width: 0.4,
      tails: 20,
      height: 0.1,
    },
    ground: { colour: [0.4, 0.6, 1], scale: 3, seconds: 0.8 },
  },
  shieldPotion: { colour: [0.4, 0.7, 1], count: 24, seconds: 0.8, radius: 0.5, rise: 0.8, size: 0.25, height: 0.8 },
  shieldLost: { colour: [0.8, 0.3, 0.3], count: 24, seconds: 0.8, radius: 0.5, rise: 0.4, size: 0.25, height: 0.8 },
  swirl: { colour: [1, 1, 1], count: 30, seconds: 1.0, radius: 0.4, rise: 1.2, size: 0.2, height: 0.2 },
};

// ---- 2. state + readers ----------------------------------------------------

export interface BurstsOptions {
  kind: BurstKind;
}

const recipes = new Map<BurstKind, ParticleRecipe>();
let seq = 0;

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

function playRings(scene: Scene, rings: BurstRings, at: Vector3): void {
  const centre = new Vector3(at.x, at.y + rings.height, at.z);
  for (let i = 0; i < rings.count; i++) {
    const seed = seq++;
    const phase = hash(seed) * Math.PI * 2;
    const rise = rings.rise * (1 + (hash(seed + 0.5) * 2 - 1) * rings.riseJitter);
    const born = fxNow();
    // The joint layer pulls the head every frame; the effects clock is what
    // makes each ribbon drive itself without a step of our own.
    const head: PointSource = out => {
      const t = fxNow() - born;
      const a = phase + rings.spin * t;
      return out.set(
        centre.x + Math.cos(a) * rings.radius,
        centre.y + rise * t,
        centre.z + Math.sin(a) * rings.radius
      );
    };
    spawnJoint(scene, centre, {
      head,
      colour: rings.colour,
      seconds: rings.seconds,
      width: rings.width,
      maxTails: rings.tails,
      texture: TEX.flareBig,
    });
  }
}

/** Command: one burst of `kind` at a world position (tiles). */
export function playBurst(scene: Scene, kind: BurstKind, at: Vector3): void {
  const row = BURSTS[kind];
  const r = recipeFor(kind);
  // The box sits above the feet; nudge the emitter up by the row's height.
  at.y += row.height;
  emitBurst(scene, r, at, row.count);
  at.y -= row.height;
  if (row.rings) playRings(scene, row.rings, at);
  if (row.ground) {
    spawnRing(scene, at, {
      texture: TEX.magicGround2,
      colour: row.ground.colour,
      scale: row.ground.scale,
      seconds: row.ground.seconds,
      growFrom: 0,
      fadeTail: 0.25,
    });
  }
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
