/**
 * Feathers — a few white feathers let go from a point that drift down,
 * tumbling, and fade: what the Blood Castle archangels shed
 * (`common/npcs/archangel.ts`, documentation/archangel_npcs).
 *
 * Modelled on the original's `MODEL_FEATHER` (ZzzEffect.cpp:4806-4848 init,
 * :15454-15500 per tick): the piece starts jittered up to 40 cm from its
 * point on every axis, faces a random way, tumbles by a random 0..5 degrees
 * a tick, holds an `Alpha` of 0.6..0.8 and fades `x0.97` a tick, over
 * `30 +- 10` ticks under a light gravity. The original lets these fall from
 * the dark wings' flap and the Desair skill, never from an NPC: the release
 * from the archangels is the reviewer's ask. The fall here is slower than a
 * hit's spray (a feather from a wing has a way to go) and the piece vanishes
 * where it meets the ground rather than lying on it.
 *
 * Each feather is a `model` spawn driven from here (this entry owns the
 * motion, `model.ts` the mesh), so the list order puts `feathers` before
 * `model`.
 *
 * Driven by: `effects.spawn('feathers', …)` from `common/npcs/archangel.ts`.
 * Read by: nobody.
 */
import { Vector3, type Scene } from '../libs/babylon/exports';
import { Store } from '../store';
import { CM, LiveList, TICK, WHITE, type RGB } from './core';
import { spawnModel, type ModelHandle } from './model';
import { MODEL } from './recipes';
import type { EffectHandle, EffectLayer } from './layer';

// ---- 1. tuning -------------------------------------------------------------

/** `Position[i] += (rand() % 20 - 10) * 4`: up to 40 cm off the point, each axis. */
const JITTER_CM = 40;

/**
 * Life in ticks. The original's `30 + rand() % 20 - 10` is a hit's spray;
 * a feather let go from a wing has two tiles to fall and a few to drift,
 * so it lives seconds, not a second.
 */
const LIFE_TICKS_MIN = 110;
const LIFE_TICKS_SPAN = 50;

/** `Alpha = 0.6 + (rand() % 10) * 0.02`. */
const ALPHA_MIN = 0.6;
const ALPHA_SPAN = 0.2;

/** `Angle += EyeRight`, `EyeRight = rand() % 10 - 5` degrees a tick. */
const TUMBLE_DEG_MAX = 5;

/** How fast the feather ends up falling, tiles/s, and how quickly it gets there. */
const FALL_TILES_PER_S = 0.32;
const FALL_RAMP_S = 0.8;

/** Sideways drift, tiles/s, along a random heading, with a slow sway across it. */
const DRIFT_TILES_PER_S = 0.18;
const SWAY_TILES = 0.12;
const SWAY_RATE = 2.2;

/**
 * The fade: in over the first share of life (a feather does not pop into
 * being beside a wing), out over the last, where the original's
 * `Alpha *= 0.97` a tick would have taken it.
 */
const FADE_IN = 0.12;
const FADE_TAIL = 0.45;

/** Piece scale: the Desair feather's 1.4, not the dark wings' 0.6 (a shed feather, seen whole). */
const SCALE = 1.4;

// ---- 2. state + readers ----------------------------------------------------

export interface FeathersOptions {
  /** How many feathers. */
  count?: number;
  /** Tint (`o->Light`); white is an angel's. */
  colour?: RGB;
  /** Extra scale on every feather (1 = the original). */
  scale?: number;
  /**
   * A heading the drift favours, tiles/s on the ground plane (the way the
   * wings face, a breeze). Added to each feather's own random drift.
   */
  drift?: readonly [number, number];
  /**
   * Ground a feather may not cross (a wall, a building): it settles there
   * and falls straight down the face instead of drifting through it.
   */
  blocked?: (x: number, z: number) => boolean;
}

type Feather = {
  handle: ModelHandle;
  pos: Vector3;
  /** Drift heading, tiles/s. */
  vx: number;
  vz: number;
  /** Across the heading, for the sway. */
  swayX: number;
  swayZ: number;
  swayPhase: number;
  /** Radians of pitch so far, and the tumble rate, radians/s. */
  pitch: number;
  tumble: number;
  /** Seconds alive, seconds left. */
  age: number;
  life: number;
};

const live = new LiveList();

/** How many feathers are in the air (debug). */
export function feathersCount(): number {
  return live.size;
}

function spawn(scene: Scene, at: Vector3, opts: FeathersOptions): EffectHandle {
  const world = Store.world;
  const count = opts.count ?? 1;
  const colour = opts.colour ?? WHITE;
  const extra = opts.scale ?? 1;
  const feathers: Feather[] = [];

  for (let i = 0; i < count; i++) {
    const pos = new Vector3(
      at.x + (Math.random() * 2 - 1) * JITTER_CM * CM,
      at.y + (Math.random() * 2 - 1) * JITTER_CM * CM,
      at.z + (Math.random() * 2 - 1) * JITTER_CM * CM
    );
    const heading = Math.random() * Math.PI * 2;
    const drift = DRIFT_TILES_PER_S * (0.5 + Math.random() * 0.5);
    const bias = opts.drift ?? [0, 0];
    const lifeTicks = LIFE_TICKS_MIN + Math.random() * LIFE_TICKS_SPAN;
    const tumbleDeg = (Math.random() * 2 - 1) * TUMBLE_DEG_MAX;

    feathers.push({
      pos,
      vx: Math.sin(heading) * drift + bias[0],
      vz: -Math.cos(heading) * drift + bias[1],
      swayX: Math.cos(heading) * SWAY_TILES,
      swayZ: Math.sin(heading) * SWAY_TILES,
      swayPhase: Math.random() * Math.PI * 2,
      pitch: Math.random() * Math.PI * 2,
      tumble: ((tumbleDeg * Math.PI) / 180) / TICK,
      age: 0,
      life: lifeTicks * TICK,
      handle: spawnModel(scene, pos, {
        model: MODEL.feather,
        // Upper bound; the feather is stopped from here when its own life ends.
        seconds: (LIFE_TICKS_MIN + LIFE_TICKS_SPAN) * TICK,
        scale: SCALE * extra,
        colour,
        yaw: Math.random() * Math.PI * 2,
        loop: false,
        alpha: ALPHA_MIN + Math.random() * ALPHA_SPAN,
        fadeIn: FADE_IN,
        fadeTail: FADE_TAIL,
        follow: out => out.copyFrom(pos),
      }),
    });
  }

  return live.push({
    update(dt) {
      let any = false;

      for (const f of feathers) {
        if (!f.handle.alive) continue;

        f.life -= dt;
        f.age += dt;

        if (f.life <= 0) {
          f.handle.stop();
          continue;
        }

        any = true;

        const fall = FALL_TILES_PER_S * Math.min(1, f.age / FALL_RAMP_S);
        const sway = Math.cos(f.swayPhase + f.age * SWAY_RATE) * SWAY_RATE;

        f.pos.y -= fall * dt;

        const nx = f.pos.x + (f.vx + f.swayX * sway) * dt;
        const nz = f.pos.z + (f.vz + f.swayZ * sway) * dt;

        if (opts.blocked && opts.blocked(nx, nz)) {
          // Met a wall: the drift is spent, the fall goes on where it is.
          f.vx = 0;
          f.vz = 0;
          f.swayX = 0;
          f.swayZ = 0;
        } else {
          f.pos.x = nx;
          f.pos.z = nz;
        }

        const ground = world ? world.getTerrainHeight(f.pos.x, f.pos.z) : -Infinity;

        if (f.pos.y <= ground) {
          f.handle.stop();
          continue;
        }

        f.pitch += f.tumble * dt;
        f.handle.pitchTo(f.pitch);
      }

      return any;
    },
    release() {
      for (const f of feathers) f.handle.stop();
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

export const feathersLayer: EffectLayer<FeathersOptions, 'feathers'> = {
  name: 'feathers',
  update,
  reset,
  spawn,
};
