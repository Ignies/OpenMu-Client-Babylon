/**
 * Sprite — a few additive billboard cards that appear at a point, grow, drift
 * and fade. The original's `CreateEffect(BITMAP_*, …)` for a flash, an impact
 * star, a spark cluster: each card lives a fixed number of ticks, scales
 * with `Scale` and fades through `Alpha` (ZzzEffect.cpp `MoveEffect`).
 *
 * Driven by: `effects.spawn('sprite', …)` from the skill table and anything
 * that wants a flash. Read by: nobody; it is fire-and-forget.
 */
import { Vector3, type Scene } from '../libs/babylon/exports';
import {
  LiveList,
  acquireCard,
  additiveMaterial,
  releaseCard,
  setCardCell,
  fadeOut,
  hash,
  lerp,
  pointSource,
  type Card,
  type PointSource,
  type RGB,
  type SheetCells,
} from './core';
import { RGBS } from './recipes';
import type { EffectHandle, EffectLayer } from './layer';

// ---- 1. tuning -------------------------------------------------------------

/** Default lifetime: MU's usual 20-tick effect at 25 Hz. */
const DEFAULT_SECONDS = 0.8;

/** Default card edge in tiles: 60 cm, a hand-sized flash. */
const DEFAULT_SIZE = 0.6;

/** Fraction of the life spent growing from `grow.from` to the full size. */
const GROW_FRACTION = 0.3;

// ---- 2. state + readers ----------------------------------------------------

export interface SpriteOptions {
  /** `Effect/…` sheet (recipes.ts `TEX`). */
  texture: string;
  colour?: RGB;
  /** Card edge in tiles. */
  size?: number;
  /** Lifetime in seconds. */
  seconds?: number;
  /** How many cards; more than one are jittered by `spread`. */
  count?: number;
  /** Random offset radius in tiles around `at` for each card. */
  spread?: number;
  /** Tiles per second upward drift (negative = fall). */
  rise?: number;
  /** World drift in tiles/s (the original's `Direction` per tick): a wave running along the facing. */
  move?: readonly [number, number, number];
  /** Size multiplier at the end of life (1 = constant, 2 = doubles). */
  grow?: number;
  /** Size multiplier at birth, before growing in over the first 30 %. */
  growFrom?: number;
  /** Radians per second the card turns on its axis. */
  spin?: number;
  /** Follow a moving point instead of staying where spawned. */
  follow?: PointSource;
  /** Tiles above `at` (or above the followed point) the cards sit. */
  height?: number;
  /** Non-billboard flat card laid on the ground (an impact ring). */
  flat?: boolean;
  /** Fade tail as a fraction of life (default 0.35). */
  fadeTail?: number;
  /**
   * The texture is a sheet: play its cells once over the life, one card = one
   * cell (BITMAP_EXPLOTION's `Frame = (20 − LifeTime) / 2`). Without this the
   * whole sheet is one image — right for a single-frame flare, wrong for a
   * sheet with white filler cells.
   */
  cells?: SheetCells;
}

const live = new LiveList();

/** How many sprite cards are alive (debug). */
export function spriteCount(): number {
  return live.size;
}

const tmp = new Vector3();
let seed = 0;

function spawn(scene: Scene, at: Vector3, opts: SpriteOptions): EffectHandle {
  const colour = opts.colour ?? RGBS.white;
  const material = additiveMaterial(scene, opts.texture, colour);
  const seconds = opts.seconds ?? DEFAULT_SECONDS;
  const size = opts.size ?? DEFAULT_SIZE;
  const count = Math.max(1, opts.count ?? 1);
  const spread = opts.spread ?? 0;
  const rise = opts.rise ?? 0;
  const move = opts.move ?? [0, 0, 0];
  const grow = opts.grow ?? 1;
  const growFrom = opts.growFrom ?? 1;
  const spin = opts.spin ?? 0;
  const height = opts.height ?? 0;
  const tail = opts.fadeTail ?? 0.35;
  const cells = opts.cells;
  const source = opts.follow ? opts.follow : pointSource(at);

  const cards: Card[] = [];
  const offsets: Vector3[] = [];
  const phases: number[] = [];
  for (let i = 0; i < count; i++) {
    const card = acquireCard(scene, material, !opts.flat);
    if (opts.flat) card.rotation.x = Math.PI / 2;
    cards.push(card);
    const s = seed++;
    offsets.push(
      new Vector3(
        (hash(s) - 0.5) * 2 * spread,
        hash(s + 0.5) * spread * 0.5,
        (hash(s + 0.25) - 0.5) * 2 * spread
      )
    );
    phases.push(hash(s + 0.75) * Math.PI * 2);
  }

  let t = 0;
  // -1 until the sheet is loaded and a cell has actually been applied.
  let frame = -1;
  return live.push({
    update(dt) {
      t += dt;
      const p = t / seconds;
      if (p >= 1) return false;
      if (cells) {
        const f = Math.min(cells.count - 1, Math.floor(p * cells.count));
        if (f !== frame) {
          let applied = true;
          for (const c of cards) applied = setCardCell(c, cells, f) && applied;
          if (applied) frame = f;
        }
      }
      // Until the sheet is in, the card would be a solid square of the tint: hold it invisible.
      const ready = material.diffuseTexture ? 1 : 0;
      source(tmp);
      const grown = p < GROW_FRACTION ? lerp(growFrom, 1, p / GROW_FRACTION) : lerp(1, grow, (p - GROW_FRACTION) / (1 - GROW_FRACTION));
      const s = size * grown;
      // The original's `Alpha`: the card's colour fades to black (core.ts
      // `ADDITIVE_ALPHA_MODE`); it used to shrink instead.
      const vis = ready * fadeOut(p, tail);
      const y = height + rise * t;
      for (let i = 0; i < cards.length; i++) {
        const c = cards[i];
        const o = offsets[i];
        c.position.set(tmp.x + o.x + move[0] * t, tmp.y + o.y + y + move[1] * t, tmp.z + o.z + move[2] * t);
        c.scaling.setAll(s);
        c.visibility = vis;
        if (spin) {
          if (opts.flat) c.rotation.y = phases[i] + spin * t;
          else c.rotation.z = phases[i] + spin * t;
        }
      }
      return true;
    },
    release() {
      for (const c of cards) releaseCard(scene, c);
      cards.length = 0;
    },
  });
}

function update(_map: number, dt: number): void {
  live.update(dt);
}

function reset(): void {
  live.clear();
}

// ---- 3. the layer ----------------------------------------------------------

export const spriteLayer: EffectLayer<SpriteOptions, 'sprite'> = {
  name: 'sprite',
  update,
  reset,
  spawn,
};
