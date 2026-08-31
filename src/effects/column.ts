/**
 * Column — a standing column of rising, animated fire (or ice, or spirit)
 * cards at a ground point for a while. The original's Flame / Inferno /
 * Hellfire: `CreateEffect(BITMAP_FLAME, …)` stacked every few ticks over the
 * cast point, each tongue rising and cycling its 4-cell strip
 * (ZzzCharacter.cpp AT_SKILL_FLAME, ZzzEffect.cpp BITMAP_FLAME `MoveEffect`).
 *
 * Built on the particle pool: one shared system per recipe, an emitter at
 * the point streaming `rate` tongues per second for `seconds`, then it lets
 * the last tongues burn out on their own. `stop()` on the handle ends the
 * stream early (a held Flame released).
 *
 * Driven by: `effects.spawn('column', …)`. Read by: nobody.
 */
import { Vector3, type Scene } from '../libs/babylon/exports';
import { Emitter, LiveList, pointSource, type ParticleRecipe, type PointSource, type RGB } from './core';
import { RGBS, TEX } from './recipes';
import type { EffectHandle, EffectLayer } from './layer';

// ---- 1. tuning -------------------------------------------------------------

/** The original spawns a tongue every 2 ticks: 12.5/s; doubled for a full column. */
const DEFAULT_RATE = 24;

/** Flame's hold: the C++ clip loops ~1.5 s before the next cast. */
const DEFAULT_SECONDS = 1.5;

/** A tongue lives 20 ticks. */
const TONGUE_LIFE = 0.8;

/** Tongues rise 8 units/tick = 2 tiles/s. */
const TONGUE_RISE = 2;

/** Tongue card edge: 120 cm, the BITMAP_FLAME quad at scale 1.2. */
const TONGUE_SIZE = 1.2;

/** Footprint half-width in tiles: Flame is a tile wide; Inferno scales it. */
const DEFAULT_RADIUS = 0.35;

// ---- 2. state + readers ----------------------------------------------------

export interface ColumnOptions {
  /** Tongue sheet, 4-cell strip (default BITMAP_FIRE). */
  texture?: string;
  colour?: RGB;
  /** Seconds the column stands before it burns out. */
  seconds?: number;
  /** Tongues per second. */
  rate?: number;
  /** Footprint half-width in tiles. */
  radius?: number;
  /** Tongue edge in tiles. */
  size?: number;
  /** Rise speed, tiles/s. */
  rise?: number;
  /** Follow a moving point (a burning character). */
  follow?: PointSource;
  /** Override the whole recipe (ice columns, spirit columns). */
  recipe?: ParticleRecipe;
}

const live = new LiveList();

/** How many columns are burning (debug). */
export function columnCount(): number {
  return live.size;
}

function recipeFor(opts: ColumnOptions): ParticleRecipe {
  if (opts.recipe) return opts.recipe;
  const r = opts.radius ?? DEFAULT_RADIUS;
  const rise = opts.rise ?? TONGUE_RISE;
  return {
    texture: opts.texture ?? TEX.fire,
    cells: { w: 64, h: 64, count: 4 },
    colour: opts.colour ?? RGBS.fire,
    colourEnd: RGBS.ember,
    size: opts.size ?? TONGUE_SIZE,
    sizeJitter: 0.2,
    life: TONGUE_LIFE,
    lifeJitter: 0.2,
    box: [r, 0.05, r],
    dir1: [-0.1, 1, -0.1],
    dir2: [0.1, 1, 0.1],
    power: rise,
    powerJitter: 0.3,
    gravity: 0,
    endScale: 1.3,
    capacity: 256,
  };
}

const tmp = new Vector3();

function spawn(scene: Scene, at: Vector3, opts: ColumnOptions): EffectHandle {
  const emitter = new Emitter(scene, recipeFor(opts), opts.rate ?? DEFAULT_RATE);
  const seconds = opts.seconds ?? DEFAULT_SECONDS;
  const source = opts.follow ?? pointSource(at);
  let t = 0;
  return live.push({
    update(dt) {
      t += dt;
      if (t >= seconds) return false;
      emitter.tick(source(tmp), dt);
      return true;
    },
    release() {},
  });
}

function update(_map: number, dt: number): void {
  live.update(dt);
}

function reset(): void {
  live.clear();
}

// ---- 3. the layer ----------------------------------------------------------

export const columnLayer: EffectLayer<ColumnOptions, 'column'> = {
  name: 'column',
  update,
  reset,
  spawn,
};
