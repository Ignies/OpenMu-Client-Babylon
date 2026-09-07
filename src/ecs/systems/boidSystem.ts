import { Vector3, type IVector3Like } from '../../libs/babylon/exports';
import {
  FADE_IN,
  FADE_OUT,
  MAX_BOIDS,
  SPAWN_INTERVAL,
  MU_UNIT,
  TICKS_PER_SECOND,
  boidFactoryFor,
  boidsFor,
  type BoidSpec,
} from '../../common/boids';
import { GameOptions } from '../../common/gameOptions';
import type { Entity, ISystemFactory } from '../world';

/**
 * `MoveBoids` (GOBoid.cpp:1199-1500): the ambient wildlife, spawned around the
 * hero, flown on a flock rule, and dropped when it gets too far away.
 *
 * Everything here is the original's, in its units, converted once at the
 * edges: positions in centimetres become world units through `MU_UNIT`, and
 * the per-frame steps are per 25 Hz tick scaled by the frame's own delta -
 * the same `FPS_ANIMATION_FACTOR` the original multiplies through.
 *
 * The species and where each one flies are in `common/boids.ts`.
 */

/** Spawn box around the hero: `rand()%1024 - 512` in x and y. */
const SPAWN_SPREAD = 512 * MU_UNIT;
/** `RequestTerrainHeight(...) + rand()%200 + 150`. */
const SPAWN_RISE_MIN = 150 * MU_UNIT;
const SPAWN_RISE_SPAN = 200 * MU_UNIT;

/** `FlyDistance`: past this from the hero a boid is dropped. */
const FLY_DISTANCE = 1500 * MU_UNIT;

/**
 * How far off a boid has to be before its own time can run out.
 *
 * Nothing in the original, which drops one wherever it happens to be. It is
 * the price of fading rather than popping: a fade is a second long and a
 * second is long enough to watch. Inside this the only way out is distance.
 */
const LEAVE_RANGE = 700 * MU_UNIT;

/** `Vector(o->Velocity * 25.f, ...)`: forward units per tick. */
const FORWARD_PER_TICK = 25 * MU_UNIT;

/** How far ahead the steering aims: `o->Position + 3 * p`. */
const LEAD_AHEAD = 3;

/** Flock neighbourhood and the separation radius inside it. */
const FLOCK_RANGE = 400 * MU_UNIT;
const FLOCK_CLOSE = 80 * MU_UNIT;

/** The bird's altitude band while flying, absolute (GOBoid.cpp:969-971). */
const BIRD_LOW = 200 * MU_UNIT;
const BIRD_HIGH = 600 * MU_UNIT;
const BIRD_RISE = 10 * MU_UNIT;
const BIRD_DIVE = -20 * MU_UNIT;

/** The bat's hover: terrain + 350, dipping 150 on a sine (GOBoid.cpp:926-928). */
const BAT_RISE = 350 * MU_UNIT;
const BAT_DIP = 150 * MU_UNIT;
const BAT_TIMER_PER_TICK = 0.2;

/** The butterfly's height band over the terrain, and its wander. */
const FLY_LOW = 50 * MU_UNIT;
const FLY_HIGH = 300 * MU_UNIT;

const DEG = Math.PI / 180;

/** A `rand_fps_check(n)` - one chance in n, per tick, over `ticks` ticks. */
function rolled(one_in: number, ticks: number): boolean {
  return Math.random() < ticks / one_in;
}

const rand = (n: number) => Math.floor(Math.random() * n);

/** `TurnAngle`: toward `to` by at most `by` degrees, the short way round. */
function turnToward(from: number, to: number, by: number): number {
  let d = ((to - from) % 360 + 540) % 360 - 180;

  if (d > by) d = by;
  if (d < -by) d = -by;

  return (from + d + 360) % 360;
}

export const BoidSystem: ISystemFactory = world => {
  const boids = world.with('boid', 'transform');

  let spec: BoidSpec | null = null;
  let map = world.mapIndex;
  let sinceSpawn = 0;

  function despawnAll(): void {
    for (const e of [...boids]) {
      world.remove(e);
      e.modelObject?.dispose();
    }
  }

  function spawn(heroPos: IVector3Like): void {
    if (!spec) return;

    const x = heroPos.x + (rand(1024) - 512) * MU_UNIT;
    const z = heroPos.z + (rand(1024) - 512) * MU_UNIT;
    const ground = world.getTerrainHeight(x, z);
    const model = spec.models[rand(spec.models.length)];

    world.add({
      worldIndex: world.mapIndex,
      transform: {
        pos: new Vector3(x, ground + SPAWN_RISE_MIN + Math.random() * SPAWN_RISE_SPAN, z),
        rot: new Vector3(0, 0, 0),
        scale: spec.scale,
      },
      modelFactory: boidFactoryFor(spec, model),
      visibility: { state: 'hidden', lastChecked: 0 },
      boid: {
        kind: spec.kind,
        ai: 'fly',
        yaw: rand(360),
        rise: 0,
        velocity: spec.velocity,
        timer: Math.random() * 3.14,
        leadX: x,
        leadZ: z,
        alpha: 0,
        leaving: false,
      },
    });
  }

  /**
   * `MoveBoid` (ZzzAI.cpp:192): neighbours inside `FLOCK_RANGE` pull the
   * heading toward where they are going, and the near ones inside
   * `FLOCK_CLOSE` push it the other way. Cohesion and separation in one sum,
   * then a turn-rate limit - which is what keeps a flock from snapping.
   */
  function flock(self: Entity, ticks: number): void {
    const s = self.boid!;
    const p = self.transform!.pos;

    let n = 0;
    let tx = 0;
    let tz = 0;

    for (const other of boids) {
      if (other === self) continue;

      const o = other.transform!.pos;
      const dx = p.x - o.x;
      const dz = p.z - o.z;
      const dist = Math.hypot(dx, dz);

      if (dist >= FLOCK_RANGE) continue;

      const ob = other.boid!;
      let ax = ob.leadX - o.x;
      let az = ob.leadZ - o.z;

      if (dist < FLOCK_CLOSE) {
        ax -= ob.leadX - p.x;
        az -= ob.leadZ - p.z;
      } else {
        ax += ob.leadX - p.x;
        az += ob.leadZ - p.z;
      }

      ax *= ticks;
      az *= ticks;

      const len = Math.hypot(ax, az) || 1;

      tx += ax / len;
      tz += az / len;
      n++;
    }

    if (!n) return;

    const aimX = p.x + tx / n;
    const aimZ = p.z + tz / n;
    const want = (Math.atan2(aimX - p.x, aimZ - p.z) / DEG + 360) % 360;

    s.yaw = turnToward(s.yaw, want, spec!.turn * ticks);
  }

  /** `MoveBird`: fly, drop in near the hero, sit, then take off again. */
  function bird(e: Entity, ticks: number, heroPos: IVector3Like): void {
    const s = e.boid!;
    const p = e.transform!.pos;
    const ground = world.getTerrainHeight(p.x, p.z);

    if (s.ai === 'fly') {
      // The original gates the dive on the first quarter of every 8.192 s.
      const range = Math.hypot(p.x - heroPos.x, p.z - heroPos.z);

      if (
        (Date.now() % 8192) < 2048 &&
        range >= 2 &&
        range <= 4 &&
        rolled(64, ticks)
      ) {
        s.ai = 'down';
      }

      s.velocity = 1;
      p.y += (rand(16) - 8) * MU_UNIT * ticks;
      if (p.y < BIRD_LOW) s.rise = BIRD_RISE;
      else if (p.y > BIRD_HIGH) s.rise = -BIRD_RISE;
    }

    if (s.ai === 'down') {
      s.rise = BIRD_DIVE;

      if (p.y < ground) {
        p.y = ground;
        s.ai = 'ground';
      }
    }

    if (s.ai === 'ground') {
      p.y = ground;
      s.rise = 0;

      // Up again when the hero moves nearby, or on its own.
      const near = Math.hypot(p.x - heroPos.x, p.z - heroPos.z) < 3;

      if (near || rolled(256, ticks)) {
        s.ai = 'up';
        s.velocity = 1.1;
        s.rise = -BIRD_DIVE;
      }
    }

    if (s.ai === 'up') {
      p.y += (rand(16) - 8) * MU_UNIT * ticks;
      s.velocity -= 0.005 * ticks;

      if (s.velocity <= 1) {
        s.velocity = 1;
        s.ai = 'fly';
      }
    }
  }

  /** `MoveBat`: pinned over the ground, dipping on a sine. */
  function bat(e: Entity, ticks: number): void {
    const s = e.boid!;
    const p = e.transform!.pos;
    const ground = world.getTerrainHeight(p.x, p.z);

    s.timer += BAT_TIMER_PER_TICK * ticks;
    p.y = ground + BAT_RISE - Math.abs(Math.sin(s.timer)) * BAT_DIP;
    s.rise = 0;
  }

  /** `MoveButterFly`: a wandering climb held inside a band over the ground. */
  function butterfly(e: Entity, ticks: number): void {
    const s = e.boid!;
    const p = e.transform!.pos;
    const ground = world.getTerrainHeight(p.x, p.z);

    if (rolled(32, ticks)) {
      s.yaw = rand(360);
      s.rise = (rand(15) - 7) * MU_UNIT;
    }

    s.rise += (rand(15) - 7) * 0.2 * MU_UNIT * ticks;

    if (p.y < ground + FLY_LOW) {
      s.rise = s.rise * Math.pow(0.8, ticks) + 1 * MU_UNIT * ticks;
    }

    if (p.y > ground + FLY_HIGH) {
      s.rise = s.rise * Math.pow(0.8, ticks) - 1 * MU_UNIT * ticks;
    }

    p.y += (rand(15) - 7) * 0.3 * MU_UNIT * ticks;
  }

  return {
    update(dt) {
      // The wildlife rides the ambient budget, like the leaves and the dust.
      const wanted = GameOptions.ambientParticles ? boidsFor(world.mapIndex) : null;

      if (world.mapIndex !== map || wanted !== spec) {
        despawnAll();
        map = world.mapIndex;
        spec = wanted;
      }

      if (!spec) return;

      const hero = world.playerEntity?.transform?.pos;

      if (!hero) return;

      const ticks = Math.min(dt, 0.1) * TICKS_PER_SECOND;

      let live = 0;

      for (const e of [...boids]) {
        const s = e.boid!;
        const p = e.transform!.pos;

        if (s.kind === 'bird') bird(e, ticks, hero);
        else if (s.kind === 'bat') bat(e, ticks);
        else if (s.kind === 'butterfly') butterfly(e, ticks);

        // The butterflies flock a quarter as often (GOBoid.cpp:1133).
        if (s.ai !== 'ground' && (s.kind !== 'butterfly' || rolled(4, ticks))) {
          flock(e, ticks);
        }

        if (s.ai !== 'ground') {
          const step = s.velocity * FORWARD_PER_TICK * ticks;
          const rad = s.yaw * DEG;
          const fx = Math.sin(rad);
          const fz = Math.cos(rad);

          p.x += fx * step;
          p.z += fz * step;
          p.y += s.rise * ticks;

          s.leadX = p.x + LEAD_AHEAD * fx * step;
          s.leadZ = p.z + LEAD_AHEAD * fz * step;
        }

        // The model faces along its heading; MU yaw is the render angle's
        // mirror, the same relationship every other object here has.
        e.transform!.rot.y = -rad0(s.yaw);

        // Out of range, or its time is up. Either way it is told to leave
        // rather than deleted: the original fades one in and out through
        // `o->Alpha`, and popping a bird out of the middle of the sky is the
        // one thing the eye is guaranteed to catch.
        //
        // The 1-in-512 is the original's own (GOBoid.cpp:1191), but there it
        // sets `Live = false` and the bird is gone between two frames, high up
        // and unwatched. Spread over most of a second it becomes something a
        // player can stand and watch happen, so it only fires on a bird that
        // is flying and already far enough off to be at the edge of the eye.
        //
        // A grounded one is exempt outright. It came down in front of the
        // player and it leaves the way it arrived, by taking off: `bird()`
        // sends it up as soon as the hero is within three tiles, or on its own
        // 1-in-256. Fading one out where it stands is the one place this is
        // certain to be seen.
        const range = Math.hypot(p.x - hero.x, p.z - hero.z);

        if (
          !s.leaving &&
          (range >= FLY_DISTANCE ||
            (s.ai === 'fly' && range >= LEAVE_RANGE && rolled(512, ticks)))
        ) {
          s.leaving = true;
        }

        s.alpha = s.leaving
          ? s.alpha - dt / FADE_OUT
          : Math.min(1, s.alpha + dt / FADE_IN);

        if (s.alpha <= 0) {
          world.remove(e);
          e.modelObject?.dispose();
          continue;
        }

        e.modelObject?.setAlpha(s.alpha);

        live++;
      }

      // Paced, not filled. Left ungated it reached the ceiling within a
      // second of a warp and the flocking knotted the lot of them together.
      sinceSpawn += dt;

      if (live < MAX_BOIDS && sinceSpawn >= SPAWN_INTERVAL) {
        sinceSpawn = 0;
        spawn(hero);
      }
    },
  };
};

const rad0 = (deg: number) => deg * DEG;
