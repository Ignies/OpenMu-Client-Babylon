/**
 * Ring - a textured decal draped over the terrain at a point that grows,
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
import { LiveList, darkCardGain, fadeOut, lerp, luma, type PointSource, type RGB } from './core';
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
  /** Degrees the spin starts from, for a decal that has always been turning. */
  spinFrom?: number;
  /** `subtract` is EnableAlphaBlendMinus: black with the sheet as coverage, `luma(colour)` its strength. */
  blend?: 'additive' | 'alpha' | 'subtract';
  fadeTail?: number;
  /** Additive: fade by dimming the colour too - the one-one blend ignores the material's alpha. */
  fadeColour?: boolean;
  /**
   * The original's `Alpha` / `Luminosity` over the life (0..1 progress), replacing `fadeTail`. It scales
   * the light (an additive decal is drawn (ONE, ONE), which drops the material alpha) or the coverage.
   */
  alphaAt?: (progress: number) => number;
  /** Largest diameter the growth reaches, tiles (BITMAP_MAGIC_ZIN sub2 stops at 3.5). */
  cap?: number;
  /**
   * Re-read the position every frame instead of standing where it was
   * spawned. `RenderTerrainAlphaBitmap` is an immediate-mode call in the
   * original - the mark a character carries is redrawn under its feet each
   * frame, so it goes where the character goes.
   */
  follow?: PointSource;
  /** Ends the decal early, for one that otherwise runs for ever. */
  until?: () => boolean;
  /** Decal grid in tiles, for a ring wider than `MAX_SCALE` (BITMAP_SHOCK_WAVE sub0 is 20 across). */
  maxScale?: number;
}

const live = new LiveList();
const followTmp = new Vector3();
const pools = new Map<string, TerrainDecal[]>();
let seq = 0;

/** How many rings are drawn (debug). */
export function ringCount(): number {
  return live.size;
}

function acquire(texture: string, blend: 'additive' | 'alpha' | 'subtract', maxScale = MAX_SCALE): TerrainDecal | null {
  const world = Store.world;
  if (!world) return null;
  const key = poolKey(texture, blend, maxScale);
  let pool = pools.get(key);
  if (!pool) {
    pool = [];
    pools.set(key, pool);
  }
  return pool.pop() ?? new TerrainDecal(world, `fxRing${seq++}`, texture, maxScale, blend);
}

function poolKey(texture: string, blend: string, maxScale: number): string {
  return maxScale === MAX_SCALE ? `${texture}|${blend}` : `${texture}|${blend}|${maxScale}`;
}

/** Spawn helper other entries call directly (the level-up circle in bursts.ts). */
export function spawnRing(_scene: Scene, at: Vector3, opts: RingOptions): EffectHandle {
  const texture = opts.texture ?? TEX.magicCircle;
  const blend = opts.blend ?? 'additive';
  const maxScale = opts.maxScale ?? MAX_SCALE;
  const decal = acquire(texture, blend, maxScale);
  const world = Store.world;
  if (!decal || !world) return DEAD_HANDLE;

  const colour = opts.colour ?? RGBS.holy;
  const seconds = opts.seconds ?? DEFAULT_SECONDS;
  const scale = Math.min(maxScale, opts.scale ?? DEFAULT_SCALE);
  const grow = opts.grow ?? 1;
  const growFrom = opts.growFrom ?? 1;
  const spin = opts.spin ?? 0;
  const spinFrom = opts.spinFrom ?? 0;
  const tail = opts.fadeTail ?? 0.35;
  const follow = opts.follow;
  const until = opts.until;
  const alphaAt = opts.alphaAt;
  const cap = Math.min(maxScale, opts.cap ?? maxScale);
  const dark = blend === 'subtract';
  const cover = dark ? Math.min(1, luma(colour) * darkCardGain(_scene)) : 0;
  const fadeColour = opts.fadeColour === true;
  const lit: [number, number, number] = [colour[0], colour[1], colour[2]];
  let x = at.x;
  let z = at.z;
  let t = 0;

  return live.push({
    update(dt) {
      t += dt;
      if (until?.()) return false;
      const p = t / seconds;
      if (p >= 1) return false;
      if (follow) {
        follow(followTmp);
        x = followTmp.x;
        z = followTmp.z;
      }
      const s = scale * lerp(growFrom, grow, p);
      let light: readonly [number, number, number] = colour;
      if (dark) decal.setAlpha(cover * (alphaAt ? alphaAt(p) : fadeOut(p, tail)));
      else if (alphaAt) {
        const k = alphaAt(p);
        lit[0] = colour[0] * k;
        lit[1] = colour[1] * k;
        lit[2] = colour[2] * k;
        light = lit;
        decal.setAlpha(1);
      } else {
        const a = fadeOut(p, tail);
        decal.setAlpha(a);
        if (fadeColour) {
          lit[0] = colour[0] * a;
          lit[1] = colour[1] * a;
          lit[2] = colour[2] * a;
          light = lit;
        }
      }
      decal.draw(
        world,
        x,
        z,
        Math.min(cap, s),
        spinFrom + spin * t,
        light
      );
      return true;
    },
    release() {
      decal.hide();
      pools.get(poolKey(texture, blend, maxScale))?.push(decal);
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
  spawn: spawnRing,
};
