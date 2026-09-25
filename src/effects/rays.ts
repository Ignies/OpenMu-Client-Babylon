/**
 * Rays - a burst of straight trail joints born together and drawn as one
 * ribbon mesh: the original's loops of `CreateJoint(BITMAP_LIGHT, ...)` (the
 * combo's 60 rays) and `CreateJoint(BITMAP_JOINT_SPARK, ...)` (Fire Breath's
 * 40 sparks), each a head flying along its own `Angle` and dragging its tails.
 *
 * joint.ts draws a trail as its own GreasedLine; forty of them created in one
 * frame cost a 30 ms hitch and forty draw calls. Here every ray is a line of
 * one GreasedLine (joint.ts `makeLine`, same material and fade), so a burst is
 * one mesh, one material set-up and one draw. What a single mesh cannot do is
 * give each ray its own brightness, which none of these needs: they are born
 * on one tick with one `Light` and decay together. A ray whose life is over is
 * collapsed onto its head and draws nothing.
 *
 * Driven by: `effects.spawn('rays', ...)`. Read by: nobody.
 */
import type { Scene, Vector3 } from '../libs/babylon/exports';
import { LiveList, fadeOut, type RGB } from './core';
import { disposeLine, makeLine } from './joint';
import type { EffectHandle, EffectLayer } from './layer';

// ---- 1. tuning -------------------------------------------------------------

/** Floats per ray: a head and a tail point. */
const RAY_FLOATS = 6;

// ---- 2. state + readers ----------------------------------------------------

/** One ray, in tiles and seconds, starting at the spawn point plus `offset`. */
export interface Ray {
  /** Start relative to the spawn point. */
  offset?: readonly [number, number, number];
  /** Unit direction of flight. */
  dir: readonly [number, number, number];
  /** Tiles/s at birth (C++ `Velocity` a tick x 25). */
  speed: number;
  /** Tiles/s² added to the speed (a `Velocity += ...` a tick). */
  accel?: number;
  /** Ribbon width in tiles (C++ `Scale`). */
  width: number;
  /** Seconds this ray lives (C++ `LifeTime`); default the burst's `seconds`. */
  life?: number;
}

export interface RaysOptions {
  rays: readonly Ray[];
  /** `Effect/Joint*` or card sheet run along each ray, head to tail (recipes.ts `TEX`). */
  texture: string;
  colour: RGB;
  /** The burst's life: the longest ray's. */
  seconds: number;
  /** The head stops after this many seconds (BITMAP_LIGHT moves only while LT > 16). Default: never. */
  moveFor?: number;
  /** How far behind the head the tail runs, in seconds of flight (MaxTails x the steps a tick). */
  tail: number;
  /** Brightness e^(-decay t): a `Light /= 1.4` a tick is 25 ln 1.4. */
  decay?: number;
  /** Fade over the last fraction of `seconds` (default 0). */
  fadeTail?: number;
}

const live = new LiveList();

/** How many bursts are running (debug). */
export function raysCount(): number {
  return live.size;
}

function spawn(scene: Scene, at: Vector3, opts: RaysOptions): EffectHandle {
  const rays = opts.rays;
  const n = rays.length;
  const seconds = opts.seconds;
  const moveFor = opts.moveFor ?? Infinity;
  const tail = opts.tail;
  const decay = opts.decay ?? 0;
  const fadeTail = opts.fadeTail ?? 0;
  let widest = 0;
  for (const r of rays) widest = Math.max(widest, r.width);
  const widths: number[] = [];
  const lines: number[][] = [];
  for (const r of rays) {
    const w = r.width / widest;
    widths.push(w, w, w, w);
    lines.push(new Array<number>(RAY_FLOATS).fill(0));
  }
  const dist = (r: Ray, s: number): number => r.speed * s + 0.5 * (r.accel ?? 0) * s * s;
  const place = (r: Ray, d: number, out: number[], o: number): void => {
    const off = r.offset;
    out[o] = at.x + (off ? off[0] : 0) + r.dir[0] * d;
    out[o + 1] = at.y + (off ? off[1] : 0) + r.dir[1] * d;
    out[o + 2] = at.z + (off ? off[2] : 0) + r.dir[2] * d;
  };
  const fill = (t: number): void => {
    const head = Math.min(t, moveFor);
    const back = Math.max(0, head - tail);
    for (let i = 0; i < n; i++) {
      const r = rays[i];
      const l = lines[i];
      const dh = dist(r, head);
      place(r, dh, l, 0);
      // Past its life the ray folds onto its head: a zero-length line draws nothing.
      place(r, t < (r.life ?? seconds) ? dist(r, back) : dh, l, 3);
    }
  };

  fill(0);
  const line = makeLine(scene, lines, opts.colour, widest, { texture: opts.texture, colour: opts.colour }, widths);
  const mesh = line.mesh;
  let t = 0;
  let frozenAt = -1;
  // Each ray's end is a change of shape even after the heads stop.
  const ends = rays.map(r => r.life ?? seconds).filter(s => s < seconds).sort((a, b) => a - b);
  let nextEnd = 0;

  return live.push({
    update(dt) {
      t += dt;
      const p = t / seconds;
      if (p >= 1) return false;
      let dirty = t <= moveFor || frozenAt < 0;
      if (t > moveFor && frozenAt < 0) frozenAt = t;
      while (nextEnd < ends.length && t >= ends[nextEnd]) {
        nextEnd++;
        dirty = true;
      }
      if (dirty) {
        fill(t);
        mesh.setPoints(lines);
      }
      line.fade(fadeOut(p, fadeTail) * (decay > 0 ? Math.exp(-decay * t) : 1));
      return true;
    },
    release() {
      disposeLine(scene, line, lines);
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

export const raysLayer: EffectLayer<RaysOptions, 'rays'> = {
  name: 'rays',
  update,
  reset,
  spawn,
};
