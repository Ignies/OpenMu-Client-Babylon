/**
 * Projectile: flies to a (moving) target and calls `onArrive` there (`CreateEffect(..., Target)`,
 * ZzzEffect.cpp `MoveEffect`, the `o->Target` branch). Listed first in layers.ts. See fx/readme.md.
 */
import { Vector3, type Scene } from '../render/babylon/exports';
import {
  Emitter,
  LiveList,
  acquireCard,
  additiveMaterial,
  pointSource,
  releaseCard,
  hash,
  type Card,
  type ParticleRecipe,
  type PointSource,
  type RGB,
} from './core';
import { spawnModel, type ModelOptions } from './model';
import { RGBS } from './recipes';
import { spawnJoint, type JointOptions } from './joint';
import type { EffectHandle, EffectLayer } from './layer';

// ---- 1. tuning -------------------------------------------------------------

/** Magic bolts: the original's 7 units/tick... at 25 Hz - 7 tiles/s, matching controllers/lighting/skills.ts. */
const DEFAULT_SPEED = 7;

/** Give up after this long: a target that despawned mid-flight. */
const MAX_FLIGHT_SECONDS = 4;

/** Within this distance of the target, it has hit. */
const HIT_DISTANCE = 0.2;

/** A head card spins this fast so the sheet does not read as a still image. */
const HEAD_SPIN = 6;

// ---- 2. state + readers ----------------------------------------------------

export interface ProjectileHead {
  texture: string;
  colour?: RGB;
  /** Card edge in tiles. */
  size?: number;
  spin?: number;
}

export interface ProjectileOptions {
  /** Where it flies to - a fixed point or a moving one (the target's chest). */
  to: Vector3 | PointSource;
  /** Tiles per second. */
  speed?: number;
  head?: ProjectileHead;
  /** A skill model that rides the point (`Skill/*.glb`). */
  model?: Omit<ModelOptions, 'follow' | 'seconds'>;
  /** Particles left behind. */
  trail?: { recipe: ParticleRecipe; rate: number };
  /** More particle streams on the head, each its own recipe (the per-frame `CreateParticle` calls of a `MoveEffect` case). */
  puffs?: readonly { recipe: ParticleRecipe; rate: number }[];
  /** Radians per second the model turns about its nose (`o->Angle[1] += k` a tick). */
  roll?: number;
  /** A ribbon riding the head, gone when the projectile is (a `CreateJoint(..., o)` that checks `Target->Live`). */
  joint?: Pick<JointOptions, 'colour' | 'width' | 'maxTails' | 'texture' | 'blend' | 'seconds'>;
  /**
   * Ribbons that gather on the launch point while the shot flies, gone with it: `count` heads orbit it on
   * slow Lissajous curves and fall in from `radius` tiles to its centre over `seconds`, with a `wobble`
   * (tiles) of drift that grows as they close (BITMAP_FLARE sub11, ZzzEffectJoint.cpp:5609-5707).
   * The anchor stays where the shot left.
   */
  swirl?: Pick<JointOptions, 'colour' | 'width' | 'maxTails' | 'texture'> & { count: number; radius: number; seconds: number; wobble: number };
  /** Peak height of a lob in tiles (0 = straight). A Meteorite falls, so it starts high instead - use `from`. */
  arc?: number;
  /** Start somewhere other than `at` (a comet from the sky). */
  from?: Vector3;
  /** Fired when it reaches the target, with the hit point. */
  onArrive?: (at: Vector3) => void;
  /** Fired if it gave up (target gone). */
  onLost?: () => void;
  /**
   * The head's position, once a tick - as `joint`'s `trace`. For a host
   * that must ride something on the bolt this layer does not own: an
   * arrow's own light. Read-only: copy it, never keep it.
   */
  trace?: (head: Vector3) => void;
}

const live = new LiveList();

const target = new Vector3();
const dir = new Vector3();
const moved = new Vector3();
let seed = 0;

/**
 * Head `k` of a swirl at `life` (0 start .. 1 end): a point on a sphere that shrinks to nothing (fCircle)
 * while the pull to the anchor fades (fPos), plus a drift that grows as it closes (:5636-5690).
 * Odd heads run their phase backwards, as the original does by index parity.
 */
function swirlHead(out: Vector3, anchor: Vector3, k: number, life: number, radius: number, wobble: number): Vector3 {
  const f = 40 * (1 - life);
  const pull = (f < 20 ? f * 4 : f + 60) / 100;
  const reach = (Math.min(Math.max(0, f - 10) * 5, 150) / 150) * radius * pull;
  const i = (k % 2 ? 1 : -1) * life * 30 + k * 53731;
  const lat = Math.sin((i + 55555) * 0.072);
  const a = lat * Math.cos(i * 0.092);
  const b = lat * Math.sin(i * 0.092);
  const c = Math.cos((i + 55555) * 0.072);
  const s = Math.sin((i + 11111) * 0.167);
  const co = Math.cos((i + 11111) * 0.167);
  const drift = (1 - pull) * wobble;
  return out.set(
    anchor.x + (co * b - s * c) * reach + drift * Math.cos(i * 0.01),
    anchor.y + a * reach + drift * Math.cos(i * 0.01 + 1),
    anchor.z + (s * b + co * c) * reach + drift * Math.cos(i * 0.01 + 2)
  );
}

function spawn(scene: Scene, at: Vector3, opts: ProjectileOptions): EffectHandle {
  const speed = opts.speed ?? DEFAULT_SPEED;
  const goal = pointSource(opts.to);
  const pos = (opts.from ?? at).clone();
  const start = pos.clone();
  const arc = opts.arc ?? 0;
  const spin = opts.head?.spin ?? HEAD_SPIN;
  const phase = hash(seed++) * Math.PI * 2;

  let card: Card | null = null;
  if (opts.head) {
    const m = additiveMaterial(scene, opts.head.texture, opts.head.colour ?? RGBS.white);
    card = acquireCard(scene, m);
    card.position.copyFrom(pos);
    card.scaling.setAll(opts.head.size ?? 0.6);
  }

  const point: PointSource = out => out.copyFrom(pos);
  const model = opts.model
    ? spawnModel(scene, pos, { ...opts.model, follow: point, seconds: MAX_FLIGHT_SECONDS })
    : null;
  const streams = [...(opts.trail ? [opts.trail] : []), ...(opts.puffs ?? [])].map(s => new Emitter(scene, s.recipe, s.rate));
  let flying = true;
  const ribbon = opts.joint
    ? spawnJoint(scene, pos, { seconds: MAX_FLIGHT_SECONDS, ...opts.joint, head: point, until: () => !flying })
    : null;
  const roll = opts.roll ?? 0;
  let age = 0;
  const swirls = opts.swirl
    ? Array.from({ length: opts.swirl.count }, (_, k) => {
        const { count: _count, radius, seconds, wobble, ...look } = opts.swirl ?? { count: 0, radius: 0, seconds: 0, wobble: 0 };
        const anchor = pos.clone();
        return spawnJoint(scene, anchor, {
          seconds,
          ...look,
          head: out => swirlHead(out, anchor, k, Math.min(1, age / seconds), radius, wobble),
          until: () => !flying,
        });
      })
    : [];

  opts.trace?.(pos);

  let t = 0;
  let travelled = 0;
  let arrived = false;
  // The straight-line point; `pos` is it lifted by the lob parabola.
  const flat = pos.clone();
  // Last frame's drawn point: `dir` is the flat step, which a lob's rise is not in.
  const was = pos.clone();
  const totalGuess = Vector3.Distance(start, goal(target)) || 1;

  return live.push({
    update(dt) {
      t += dt;
      age += dt;
      goal(target);
      target.subtractToRef(flat, dir);
      const dist = dir.length();
      const step = speed * dt;
      if (dist <= Math.max(step, HIT_DISTANCE)) {
        pos.copyFrom(target);
        opts.trace?.(pos);
        arrived = true;
        return false;
      }
      if (t > MAX_FLIGHT_SECONDS) return false;
      dir.scaleInPlace(step / dist);
      flat.addInPlace(dir);
      travelled += step;
      pos.copyFrom(flat);
      if (arc > 0) {
        // Parabola over the straight line: peak at the middle of the flight.
        const p = Math.min(1, travelled / totalGuess);
        pos.y += 4 * p * (1 - p) * arc;
      }
      if (card) {
        card.position.copyFrom(pos);
        card.rotation.z = phase + spin * t;
        // A solid tinted square until the sheet is in.
        card.visibility = (card.material as { diffuseTexture?: unknown } | null)?.diffuseTexture ? 1 : 0;
      }
      if (model) {
        pos.subtractToRef(was, moved);
        if (opts.model?.alongPath) model.aimAlong(moved);
        else model.yawTo(dir);
        if (roll) model.rollTo(roll * t + phase);
      }
      was.copyFrom(pos);
      opts.trace?.(pos);
      for (const e of streams) e.tick(pos, dt);
      return true;
    },
    release() {
      flying = false;
      ribbon?.stop();
      for (const r of swirls) r.stop();
      if (card) releaseCard(scene, card);
      model?.stop();
      if (arrived) opts.onArrive?.(pos);
      else opts.onLost?.();
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

export const projectileLayer: EffectLayer<ProjectileOptions, 'projectile'> = {
  name: 'projectile',
  update,
  reset,
  spawn,
};
