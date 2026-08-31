/**
 * Debris — a handful of solid pieces thrown from a point that fly, tumble,
 * bounce on the terrain and vanish: the bones a skeleton / Death Cow bursts
 * into (`MODEL_BONE1/2`), the boulders of a Stone Golem (`MODEL_BIG_STONE1/2`),
 * the shards of an Ice Monster (`MODEL_ICE_SMALL`), the chips of a shattered
 * stone (`MODEL_STONE1/2`).
 *
 * The original is one `CreateEffect(MODEL_*, pos, angle, light)` per piece
 * with `SubType 0`: the init block (ZzzEffect.cpp:2742-2890) lifts the piece,
 * picks a random yaw, a horizontal speed of (64..319)×0.1 cm/tick along it,
 * an upward speed of 8..23 cm/tick, a scale of 0.8..1.1 and a life of 32..47
 * ticks; the move block (:10993-11062) steps the position, damps the
 * horizontal speed ×0.9 a tick, pulls 3 cm/tick² down, bounces at half speed
 * off the terrain (costing 4 ticks of life and a kick of tumble), tumbles
 * `Scale × 32°` a tick in the air and now and then (1 in 10 ticks) leaves a
 * smoke (ice) or fire (stone) puff behind.
 *
 * Each piece is a `model` spawn driven from here (this entry owns the
 * physics, `model.ts` the mesh), so the list order puts `debris` before
 * `model`.
 *
 * Driven by: `effects.spawn('debris', …)` from `common/deathVisuals.ts`.
 * Read by: nobody.
 */
import { Vector3, type Scene } from '../libs/babylon/exports';
import { Store } from '../store';
import { CM, LiveList, TICK, WHITE, emitBurst, type ParticleRecipe, type RGB } from './core';
import { spawnModel, type ModelHandle } from './model';
import type { EffectHandle, EffectLayer } from './layer';

// ---- 1. tuning -------------------------------------------------------------

/** Life in ticks: `rand() % 16 + 32`. */
const LIFE_TICKS_MIN = 32;
const LIFE_TICKS_SPAN = 16;

/** Horizontal launch speed: `(rand() % 256 + 64) * 0.1` cm/tick, along a random yaw. */
const SPEED_CM_MIN = 6.4;
const SPEED_CM_SPAN = 25.6;

/** Upward launch speed: `rand() % 16 + 8` cm/tick. */
const RISE_CM_MIN = 8;
const RISE_CM_SPAN = 16;

/** `o->Gravity -= 3` a tick, in cm/tick². */
const GRAVITY_CM = 3;

/** `VectorScale(o->Direction, 0.9f, …)` a tick. */
const DRAG_PER_TICK = 0.9;

/** Bounce: `Gravity = -Gravity * 0.5`, and 4 ticks of life gone. */
const BOUNCE = 0.5;
const BOUNCE_LIFE_TICKS = 4;

/** Tumble `Scale * 32°` a tick in the air, `Scale * 128°` on the bounce tick. */
const TUMBLE_DEG_AIR = 32;
const TUMBLE_DEG_BOUNCE = 128;

/** Piece scale `(rand() % 4 + 8) * 0.1` = 0.8…1.1 of the model's own size (`model.ts` scale 1). */
const SCALE_MIN = 0.8;
const SCALE_SPAN = 0.4;

/** `rand_fps_check(10)`: one puff every ~10 ticks. */
const PUFF_CHANCE_PER_TICK = 0.1;

/** The piece vanishes at end of life; no alpha fade in the original. */
const FADE_TAIL = 0.08;

// ---- 2. state + readers ----------------------------------------------------

export interface DebrisOptions {
  /** `Skill/…glb` (recipes.ts `MODEL`). */
  model: string;
  /** How many pieces. */
  count?: number;
  /** Tint (`o->Light` of the character that broke). */
  colour?: RGB;
  /** Centimetres the piece starts above `at` (`o->Position[2] += …`: bone 150 / 100, ice 50). */
  liftCm?: number;
  /** Random start box in cm, `[±x, ±z, 0…y]` (the big stones' `rand()%128-64, …, rand()%180`). */
  scatterCm?: readonly [number, number, number];
  /** A puff left behind 1 tick in 10 (smoke for ice, fire for stone). */
  puff?: ParticleRecipe;
  /** Extra scale on every piece (1 = the original). */
  scale?: number;
}

type Piece = {
  handle: ModelHandle;
  pos: Vector3;
  /** Horizontal velocity, tiles/s. */
  vx: number;
  vz: number;
  /** Vertical velocity, tiles/s (up positive). */
  vy: number;
  /** Radians of pitch so far. */
  pitch: number;
  size: number;
  /** Seconds left. */
  life: number;
};

const live = new LiveList();

/** How many pieces are in the air (debug). */
export function debrisCount(): number {
  return live.size;
}

const tmp = new Vector3();

/** cm/tick → tiles/s. */
function cmPerTick(v: number): number {
  return (v * CM) / TICK;
}

function spawn(scene: Scene, at: Vector3, opts: DebrisOptions): EffectHandle {
  const world = Store.world;
  const count = opts.count ?? 1;
  const colour = opts.colour ?? WHITE;
  const lift = (opts.liftCm ?? 0) * CM;
  const scatter = opts.scatterCm;
  const extra = opts.scale ?? 1;
  const pieces: Piece[] = [];

  for (let i = 0; i < count; i++) {
    const pos = new Vector3(at.x, at.y + lift, at.z);
    if (scatter) {
      pos.x += (Math.random() * 2 - 1) * scatter[0] * CM;
      pos.z += (Math.random() * 2 - 1) * scatter[1] * CM;
      pos.y += Math.random() * scatter[2] * CM;
    }
    const yaw = Math.random() * Math.PI * 2;
    const speed = cmPerTick(SPEED_CM_MIN + Math.random() * SPEED_CM_SPAN);
    const size = SCALE_MIN + Math.random() * SCALE_SPAN;
    const lifeTicks = LIFE_TICKS_MIN + Math.random() * LIFE_TICKS_SPAN;
    const piece: Piece = {
      pos,
      vx: Math.sin(yaw) * speed,
      vz: -Math.cos(yaw) * speed,
      vy: cmPerTick(RISE_CM_MIN + Math.random() * RISE_CM_SPAN),
      pitch: 0,
      size,
      life: lifeTicks * TICK,
      handle: spawnModel(scene, pos, {
        model: opts.model,
        // Upper bound; the piece is stopped from here when its own life ends.
        seconds: (LIFE_TICKS_MIN + LIFE_TICKS_SPAN) * TICK,
        scale: size * extra,
        colour,
        yaw,
        loop: false,
        fadeTail: FADE_TAIL,
        follow: out => out.copyFrom(pos),
      }),
    };
    pieces.push(piece);
  }

  const gravity = cmPerTick(GRAVITY_CM) / TICK;
  const puff = opts.puff;

  return live.push({
    update(dt) {
      const ticks = dt / TICK;
      const drag = Math.pow(DRAG_PER_TICK, ticks);
      let any = false;
      for (const p of pieces) {
        if (!p.handle.alive) continue;
        p.life -= dt;
        if (p.life <= 0) {
          p.handle.stop();
          continue;
        }
        any = true;
        p.pos.x += p.vx * dt;
        p.pos.z += p.vz * dt;
        p.vx *= drag;
        p.vz *= drag;
        p.pos.y += p.vy * dt;
        p.vy -= gravity * dt;
        const ground = world ? world.getTerrainHeight(p.pos.x, p.pos.z) : -Infinity;
        if (p.pos.y < ground) {
          p.pos.y = ground;
          p.vy = -p.vy * BOUNCE;
          p.life -= BOUNCE_LIFE_TICKS * TICK;
          p.pitch -= ((p.size * TUMBLE_DEG_BOUNCE * Math.PI) / 180) * ticks;
        } else {
          p.pitch -= ((p.size * TUMBLE_DEG_AIR * Math.PI) / 180) * ticks;
        }
        p.handle.pitchTo(p.pitch);
        if (puff && Math.random() < PUFF_CHANCE_PER_TICK * ticks) {
          tmp.copyFrom(p.pos);
          emitBurst(scene, puff, tmp, 1);
        }
      }
      return any;
    },
    release() {
      for (const p of pieces) p.handle.stop();
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

export const debrisLayer: EffectLayer<DebrisOptions, 'debris'> = {
  name: 'debris',
  update,
  reset,
  spawn,
};
