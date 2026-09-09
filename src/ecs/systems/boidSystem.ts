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
import { effects } from '../../effects';
import { FIRE_PUFF, TEX } from '../../effects/recipes';
import { invasionEvent } from '../../events/invasion';
import { playSfx } from '../../libs/sfx';
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

/**
 * The invasion dragon (GOBoid.cpp:1395-1412). It does not flock and it does
 * not turn: `Angle[2]` is fixed at spawn and it holds it, riding a sine
 * between +300 and +400 over the ground and covering `Scale * 40` a tick.
 * `-90` in the original's angles is the same heading its meteors take, so the
 * two stream the same way.
 */
const DRAGON_YAW = 180;
const DRAGON_RIDE = 400 * MU_UNIT;
const DRAGON_DIP = 100 * MU_UNIT;
const DRAGON_TIMER_PER_TICK = 0.05;
const DRAGON_UNITS_PER_TICK = 40 * MU_UNIT;

/** Spawn box off the hero: `rand%600 - 100` and `rand%400 + 200`. */
const DRAGON_SPAWN_X = [-100, 500] as const;
const DRAGON_SPAWN_Z = [200, 600] as const;

/** `SetAction(o, MONSTER01_DIE + 1)` at `PlaySpeed` 0.5 (_define.h:495-506). */
const DRAGON_ACTION = 7;
const DRAGON_ACTION_SPEED = 0.5;

/** `PlayBuffer(SOUND_MONSTER_BULLATTACK1)` on `rand_fps_check(128)`. */
const ROAR_ONE_IN = 128;

/**
 * The mouth: `BoneTransform[11]` in the original (GOBoid.cpp:1546-1549),
 * which the export names `bone_11_attack01`. Skeletons here carry a root bone
 * the BMD does not, so an MU bone index is one lower than the glb's - the
 * same `+ 1` `ModelObject.ParentBoneLink` applies.
 */
const MOUTH_BONE = 11 + 1;

/** `CreateSprite(BITMAP_LIGHTNING + 1, ..., 1.f, red)` at the mouth. */
const BREATH_CARD_TILES = 0.9;
const BREATH_CARD_SECONDS = 0.32;
const BREATH_RED = [1, 0, 0] as const;

/**
 * The original emits one card and one puff per rendered frame, at 25 Hz. A
 * roll instead of a frame, so a 144 Hz client does not put six times the
 * flame in the sky as a 25 Hz one.
 */
const BREATH_ONE_IN = 2;

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

    const dragon = spec.kind === 'dragon';

    // The dragons come in off one shoulder rather than out of a box centred
    // on the hero, and they all fly the same way (GOBoid.cpp:1288-1299).
    const x = dragon
      ? heroPos.x + (DRAGON_SPAWN_X[0] + rand(DRAGON_SPAWN_X[1] - DRAGON_SPAWN_X[0])) * MU_UNIT
      : heroPos.x + (rand(1024) - 512) * MU_UNIT;
    const z = dragon
      ? heroPos.z + (DRAGON_SPAWN_Z[0] + rand(DRAGON_SPAWN_Z[1] - DRAGON_SPAWN_Z[0])) * MU_UNIT
      : heroPos.z + (rand(1024) - 512) * MU_UNIT;
    const ground = world.getTerrainHeight(x, z);
    const model = spec.models[rand(spec.models.length)];
    const range = spec.scaleRange;
    const scale = range
      ? range[0] + Math.random() * (range[1] - range[0])
      : spec.scale;
    const ticks = spec.lifeTicks;

    world.add({
      worldIndex: world.mapIndex,
      transform: {
        pos: new Vector3(x, ground + SPAWN_RISE_MIN + Math.random() * SPAWN_RISE_SPAN, z),
        rot: new Vector3(0, 0, 0),
        scale,
      },
      modelFactory: boidFactoryFor(spec, model),
      visibility: { state: 'hidden', lastChecked: 0 },
      boid: {
        kind: spec.kind,
        ai: 'fly',
        yaw: dragon ? DRAGON_YAW : rand(360),
        rise: 0,
        velocity: spec.velocity,
        timer: dragon ? rand(10) * 0.1 : Math.random() * 3.14,
        life: ticks
          ? (ticks[0] + rand(ticks[1] - ticks[0])) / TICKS_PER_SECOND
          : Infinity,
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

  /**
   * `MoveBoids`' event branch: no flock rule, no turn, a fixed heading and a
   * sine ride over the ground, breathing fire and roaring as it goes.
   */
  function dragon(e: Entity, ticks: number): void {
    const s = e.boid!;
    const p = e.transform!.pos;
    const scale = e.transform!.scale;

    s.timer += scale * DRAGON_TIMER_PER_TICK * ticks;
    p.y =
      world.getTerrainHeight(p.x, p.z) +
      DRAGON_RIDE -
      Math.abs(Math.sin(s.timer)) * DRAGON_DIP;
    s.rise = 0;

    const model = e.modelObject;

    if (!model) return;

    model.setActionSpeed(DRAGON_ACTION, DRAGON_ACTION_SPEED);
    model.playAction(DRAGON_ACTION, true);

    if (rolled(ROAR_ONE_IN, ticks)) playSfx('Sound/mBullAttack1', p);

    if (!rolled(BREATH_ONE_IN, ticks)) return;

    const gltf = model.gltf;
    const bone = gltf?.skeleton?.bones[MOUTH_BONE];

    if (!gltf || !bone) return;

    const mouth = bone.getAbsolutePosition(gltf.mesh);

    effects.spawn('particles', world.scene, mouth, {
      recipe: FIRE_PUFF,
      count: 1,
    });
    effects.spawn('sprite', world.scene, mouth, {
      texture: TEX.lightning2,
      colour: BREATH_RED,
      size: BREATH_CARD_TILES * scale,
      seconds: BREATH_CARD_SECONDS,
    });
  }

  return {
    update(dt) {
      // The wildlife rides the ambient budget, like the leaves and the dust.
      // An invasion takes the sky over from the map's own species.
      const wanted = GameOptions.ambientParticles
        ? boidsFor(world.mapIndex, invasionEvent())
        : null;

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
        else if (s.kind === 'dragon') dragon(e, ticks);

        // The butterflies flock a quarter as often (GOBoid.cpp:1133); the
        // dragons never do - the original holds their spawn angle.
        if (
          s.ai !== 'ground' &&
          s.kind !== 'dragon' &&
          (s.kind !== 'butterfly' || rolled(4, ticks))
        ) {
          flock(e, ticks);
        }

        if (s.ai !== 'ground') {
          const step =
            s.kind === 'dragon'
              ? e.transform!.scale * DRAGON_UNITS_PER_TICK * ticks
              : s.velocity * FORWARD_PER_TICK * ticks;
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
        // mirror, the same relationship every other object here has - plus a
        // half turn for a species wearing a monster model, which the rest of
        // the game orients the other way round (`BoidSpec.modelHalfTurn`).
        e.transform!.rot.y = spec.modelHalfTurn
          ? Math.PI - rad0(s.yaw)
          : -rad0(s.yaw);

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
        //
        // A dragon is exempt from both: the original gives it a `LifeTime`
        // instead (GOBoid.cpp:1284) and a `FlyDistance` of its own
        // (:1178-1181), and never rolls the 1-in-512 on it.
        const range = Math.hypot(p.x - hero.x, p.z - hero.z);
        const flyDistance = spec.flyDistance
          ? spec.flyDistance * MU_UNIT
          : FLY_DISTANCE;

        s.life -= dt;

        if (
          !s.leaving &&
          (range >= flyDistance ||
            s.life <= 0 ||
            (s.kind !== 'dragon' &&
              s.ai === 'fly' &&
              range >= LEAVE_RANGE &&
              rolled(512, ticks)))
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

      const max = spec.max ?? MAX_BOIDS;

      if (live >= max) return;

      // The dragons keep the original's own gate instead: one roll per free
      // slot per tick (GOBoid.cpp:1277). There are five slots and they cross
      // the map in a few seconds, so pacing them would empty the sky.
      if (spec.spawnOneIn) {
        for (let i = live; i < max; i++) {
          if (rolled(spec.spawnOneIn, ticks)) spawn(hero);
        }

        return;
      }

      if (sinceSpawn >= SPAWN_INTERVAL) {
        sinceSpawn = 0;
        spawn(hero);
      }
    },
  };
};

const rad0 = (deg: number) => deg * DEG;
