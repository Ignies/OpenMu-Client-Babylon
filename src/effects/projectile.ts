/**
 * Projectile — something that flies from a point to a target and does a
 * thing on arrival. The original's `CreateEffect(MODEL_* or BITMAP_*, …, Target)`
 * with a `Velocity`: `MoveEffect` steps toward `Target->Position` each tick
 * and, within one step of it, kills the effect and spawns the hit
 * (ZzzEffect.cpp `MoveEffect`, the `o->Target` branch).
 *
 * The head is a billboard card (BITMAP_ENERGY, BITMAP_FIRE…) and/or a skill
 * model (`Skill/*.glb`, spawned through the `model` entry and told to follow
 * this projectile's point). An optional trail streams a particle recipe from
 * the same point. `to` may be a moving point so the bolt homes on a walking
 * target like the original.
 *
 * Driven by: `effects.spawn('projectile', …)`. Read by: nobody; `onArrive`
 * is the callback the skill table uses to fire the impact.
 */
import { Vector3, type Scene } from '../libs/babylon/exports';
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
import type { EffectHandle, EffectLayer } from './layer';

// ---- 1. tuning -------------------------------------------------------------

/** Magic bolts: the original's 7 units/tick... at 25 Hz — 7 tiles/s, matching lighting/skills.ts. */
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
  /** Where it flies to — a fixed point or a moving one (the target's chest). */
  to: Vector3 | PointSource;
  /** Tiles per second. */
  speed?: number;
  head?: ProjectileHead;
  /** A skill model that rides the point (`Skill/*.glb`). */
  model?: Omit<ModelOptions, 'follow' | 'seconds'>;
  /** Particles left behind. */
  trail?: { recipe: ParticleRecipe; rate: number };
  /** Peak height of a lob in tiles (0 = straight). A Meteorite falls, so it starts high instead — use `from`. */
  arc?: number;
  /** Start somewhere other than `at` (a comet from the sky). */
  from?: Vector3;
  /** Fired when it reaches the target, with the hit point. */
  onArrive?: (at: Vector3) => void;
  /** Fired if it gave up (target gone). */
  onLost?: () => void;
}

const live = new LiveList();

/** How many bolts are in the air (debug). */
export function projectileCount(): number {
  return live.size;
}

const target = new Vector3();
const dir = new Vector3();
let seed = 0;

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
  const trail = opts.trail ? new Emitter(scene, opts.trail.recipe, opts.trail.rate) : null;

  let t = 0;
  let travelled = 0;
  let arrived = false;
  // The straight-line point; `pos` is it lifted by the lob parabola.
  const flat = pos.clone();
  const totalGuess = Vector3.Distance(start, goal(target)) || 1;

  return live.push({
    update(dt) {
      t += dt;
      goal(target);
      target.subtractToRef(flat, dir);
      const dist = dir.length();
      const step = speed * dt;
      if (dist <= Math.max(step, HIT_DISTANCE)) {
        pos.copyFrom(target);
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
      if (model) model.yawTo(dir);
      trail?.tick(pos, dt);
      return true;
    },
    release() {
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
