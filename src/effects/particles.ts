/**
 * Particles — a burst or a timed stream of pooled particles from one recipe.
 * The original's `CreateParticle(BITMAP_*, …)` loop: N particles thrown from
 * a point with a direction, gravity and a lifetime (ZzzEffectParticle.cpp).
 *
 * A burst is one call; a stream (`rate` + `seconds`) keeps emitting while it
 * lives, following `follow` if given — a fireball's trail, a buff's shimmer.
 * Every recipe shares one `ParticleSystem` (core.ts), so a hundred bursts of
 * one kind cost one draw.
 *
 * Driven by: `effects.spawn('particles', …)`. Read by: nobody.
 */
import { Vector3, type Scene } from '../libs/babylon/exports';
import {
  Emitter,
  LiveList,
  emitBurst,
  pointSource,
  type ParticleRecipe,
  type PointSource,
} from './core';
import { DEAD_HANDLE, type EffectHandle, type EffectLayer } from './layer';

// ---- 1. tuning -------------------------------------------------------------

/** A stream with no `seconds` runs this long — long enough to be a mistake you notice. */
const DEFAULT_STREAM_SECONDS = 2;

// ---- 2. state + readers ----------------------------------------------------

export interface ParticlesOptions {
  recipe: ParticleRecipe;
  /** Burst: this many at once. */
  count?: number;
  /** Stream: this many per second for `seconds`. */
  rate?: number;
  seconds?: number;
  /** Stream only: emit from a moving point. */
  follow?: PointSource;
  /** Tiles above the point. */
  height?: number;
  /** Stream only: ends early when true (a held charge released). */
  until?: () => boolean;
  /** Stream only: multiplies `rate` each frame (Nova's `(skillCount+1)×` per bone). */
  rateScale?: () => number;
}

const live = new LiveList();

/** How many streams are running (debug). */
export function particleStreamCount(): number {
  return live.size;
}

const tmp = new Vector3();

function spawn(scene: Scene, at: Vector3, opts: ParticlesOptions): EffectHandle {
  const height = opts.height ?? 0;
  if (opts.count) {
    tmp.copyFrom(at);
    tmp.y += height;
    emitBurst(scene, opts.recipe, tmp, opts.count);
  }
  if (!opts.rate) return DEAD_HANDLE;

  const emitter = new Emitter(scene, opts.recipe, opts.rate);
  const seconds = opts.seconds ?? DEFAULT_STREAM_SECONDS;
  const source = opts.follow ?? pointSource(at);
  let t = 0;
  return live.push({
    update(dt) {
      t += dt;
      if (t >= seconds || opts.until?.()) return false;
      source(tmp);
      tmp.y += height;
      emitter.tick(tmp, dt, opts.rateScale ? emitter.rate * opts.rateScale() : emitter.rate);
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

export const particlesLayer: EffectLayer<ParticlesOptions, 'particles'> = {
  name: 'particles',
  update,
  reset,
  spawn,
};
