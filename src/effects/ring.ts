/**
 * Ring — a textured decal draped over the terrain at a point that grows,
 * turns and fades: the magic circle under a heal, the shock ring of an
 * earth skill, the scorch under a meteor. The original's
 * `RenderTerrainAlphaBitmap(BITMAP_MAGIC_*, …)` calls from `RenderEffect`
 * (ZzzEffect.cpp) and the ground circles in `ZzzCharacter.cpp`.
 *
 * Decals are `TerrainDecal`s (common/moveTargetEffect.ts, read-only use)
 * pooled per texture so a spam of heals reuses the same mesh.
 *
 * Driven by: `effects.spawn('ring', …)`. Read by: nobody.
 */
import { Vector3, type Scene } from '../libs/babylon/exports';
import { TerrainDecal } from '../common/moveTargetEffect';
import { Store } from '../store';
import { LiveList, fadeOut, lerp, type RGB } from './core';
import { RGBS, TEX } from './recipes';
import { DEAD_HANDLE, type EffectHandle, type EffectLayer } from './layer';

// ---- 1. tuning -------------------------------------------------------------

/** A magic circle lives 30 ticks. */
const DEFAULT_SECONDS = 1.2;

/** Diameter in tiles: the heal circle is 3 tiles across. */
const DEFAULT_SCALE = 3;

/** Biggest decal grid a pooled ring can draw (tiles); larger asks are clamped. */
const MAX_SCALE = 8;

// ---- 2. state + readers ----------------------------------------------------

export interface RingOptions {
  texture?: string;
  colour?: RGB;
  seconds?: number;
  /** Diameter in tiles. */
  scale?: number;
  /** Scale multiplier at the end (2 = expands to double). */
  grow?: number;
  /** Scale multiplier at the start. */
  growFrom?: number;
  /** Degrees per second. */
  spin?: number;
  blend?: 'additive' | 'alpha';
  fadeTail?: number;
}

const live = new LiveList();
const pools = new Map<string, TerrainDecal[]>();
let seq = 0;

/** How many rings are drawn (debug). */
export function ringCount(): number {
  return live.size;
}

function acquire(texture: string, blend: 'additive' | 'alpha'): TerrainDecal | null {
  const world = Store.world;
  if (!world) return null;
  const key = `${texture}|${blend}`;
  let pool = pools.get(key);
  if (!pool) {
    pool = [];
    pools.set(key, pool);
  }
  return pool.pop() ?? new TerrainDecal(world, `fxRing${seq++}`, texture, MAX_SCALE, blend);
}

function spawn(_scene: Scene, at: Vector3, opts: RingOptions): EffectHandle {
  const texture = opts.texture ?? TEX.magicCircle;
  const blend = opts.blend ?? 'additive';
  const decal = acquire(texture, blend);
  const world = Store.world;
  if (!decal || !world) return DEAD_HANDLE;

  const colour = opts.colour ?? RGBS.holy;
  const seconds = opts.seconds ?? DEFAULT_SECONDS;
  const scale = Math.min(MAX_SCALE, opts.scale ?? DEFAULT_SCALE);
  const grow = opts.grow ?? 1;
  const growFrom = opts.growFrom ?? 1;
  const spin = opts.spin ?? 0;
  const tail = opts.fadeTail ?? 0.35;
  const x = at.x;
  const z = at.z;
  let t = 0;

  return live.push({
    update(dt) {
      t += dt;
      const p = t / seconds;
      if (p >= 1) return false;
      const s = scale * lerp(growFrom, grow, p);
      decal.setAlpha(fadeOut(p, tail));
      decal.draw(world, x, z, Math.min(MAX_SCALE, s), spin * t, colour);
      return true;
    },
    release() {
      decal.hide();
      pools.get(`${texture}|${blend}`)?.push(decal);
    },
  });
}

function update(_map: number, dt: number): void {
  live.update(dt);
}

function reset(): void {
  live.clear();
  // The decal meshes belong to the map that is going away.
  for (const pool of pools.values()) for (const d of pool) d.hide();
  pools.clear();
}

// ---- 3. the layer ----------------------------------------------------------

export const ringLayer: EffectLayer<RingOptions, 'ring'> = {
  name: 'ring',
  update,
  reset,
  spawn,
};
