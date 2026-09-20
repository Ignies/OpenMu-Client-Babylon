import { Vector3 } from '../libs/babylon/exports';
import { ENUM_WORLD } from './types';
import { loadGLTF } from './modelLoader';
import { ModelObject } from './modelObject';
import { createMovableFlare, type MovableFlare } from './effectLights';
import { boneLocalPos } from '../effects/core';
import { TILE_CM } from './terrain/consts';
import { Store } from '../store';
import type { Sounds } from '../libs/soundsManager';
import type { Entity, World } from '../ecs/world';

const eyeLocal = new Vector3();
const eyeWorld = new Vector3();

/**
 * `Boids[]` - the ambient wildlife (GOBoid.cpp:814-1500).
 *
 * `GOBoid.cpp` has two halves and the clone only ever ported one. `Mounts[]`
 * - pets, Fenrir, the Dark Lord's horse - is in `pets.ts` and
 * `petSystem.ts`, cited line by line. `Boids[]` is everything else that
 * moves in the world without being a monster: the birds over Lorencia, the
 * bats in the Dungeon, Noria's butterflies, Blood Castle's crows, the fish
 * over Atlans.
 *
 * It was never written. The giveaway was that the *sounds* had been:
 * `sound/ambientBeds.ts` plays `aBird1`/`aBird2` in Lorencia and `aBat` in
 * the Dungeon on the boids' own dice rolls, naming `MODEL_BIRD01` and
 * `MODEL_BAT01` in its comments. Lorencia has been playing birdsong at an
 * empty sky.
 *
 * ## Which map has what
 *
 * Two tables in the original agree and this is their intersection: what
 * `LoadWorld` *loads* (MapManager.cpp:45-166, which also gives the folder
 * each model comes from - never the current map's) and what `MoveBoids`
 * *spawns* (GOBoid.cpp:1313-1375).
 *
 * The ground-crawling half of the spawner - Lorencia's river fish, the
 * Dungeon's rats, Stadium's bugs, Tarkan's fireflies, Crywolf's scorpions
 * (GOBoid.cpp:1690-1745) - is a second table with its own movement and is
 * not here yet.
 */

/**
 * How many are in the air at once.
 *
 * `MAX_BOIDS` is 40 (_define.h:108) and taking it literally was wrong. That
 * is the size of the original's *array*, shared with the event dragons and
 * the ground-crawlers, and its population settles well below it because a
 * boid flies out of range in a couple of seconds. Filling it instead - which
 * is what happens when the spawn is not rate-limited - put two dozen birds in
 * one shot, and the flocking then pulled them into a single dense knot.
 *
 * A flock reads as a flock at about a dozen.
 */
export const MAX_BOIDS = 13;

/** Seconds between spawns while there is room; the original has no gate. */
export const SPAWN_INTERVAL = 0.55;

/** Seconds a boid takes to fade in, and to fade out before it is dropped. */
export const FADE_IN = 1.1;
export const FADE_OUT = 0.7;

/** Centimetres to world units: the original's positions are all in these. */
export const MU_UNIT = 1 / 100;

/** The original steps its movement per 25 Hz tick. */
export const TICKS_PER_SECOND = 25;

export type BoidKind = 'bird' | 'bat' | 'butterfly' | 'crow' | 'fish' | 'dragon';

export type BoidSpec = {
  readonly kind: BoidKind;
  /**
   * The model, from the folder the original names - which is not the current
   * map's: Noria's butterflies come out of `Object1`, and the Dungeon's bats
   * out of `Object2` whether the hero is in the Dungeon or the Lost Tower.
   */
  readonly models: readonly string[];
  readonly scale: number;
  /** `o->Velocity` at spawn. */
  readonly velocity: number;
  /** `o->Gravity`, which is the turn rate in degrees per tick. */
  readonly turn: number;
  /** `o->LightEnable`; the butterflies alone are drawn unlit and white. */
  readonly lit: boolean;
  /** Slots this species may fill. `MAX_BOIDS` when it says nothing. */
  readonly max?: number;
  /**
   * `rand_fps_check(n)` per free slot per tick, the original's own spawn.
   * Without it the paced `SPAWN_INTERVAL` is used, which is what keeps a
   * flock from arriving all at once.
   */
  readonly spawnOneIn?: number;
  /** `FlyDistance` in MU units; past it from the hero the boid is dropped. */
  readonly flyDistance?: number;
  /** `o->Scale` range when the original rolls one, instead of the flat `scale`. */
  readonly scaleRange?: readonly [number, number];
  /** `o->LifeTime` in ticks, rolled per spawn. Endless when absent. */
  readonly lifeTicks?: readonly [number, number];
  /** The additive metal/chrome pass a golden body carries, linear RGB. */
  readonly shine?: readonly [number, number, number];
  /**
   * Half-turn on the render angle for a model authored the other way round.
   *
   * The wildlife models face along `-yaw`, which is what `boidSystem` writes.
   * Every character and monster in the game faces along
   * `atan2(dz, dx) + PI/2` instead (moveAlongPathSystem, skillCastSystem,
   * headTrackingSystem), and for a boid's own heading that is `PI - yaw` -
   * the same direction turned 180 degrees. A species that borrows a monster
   * model flies tail first without this.
   */
  readonly modelHalfTurn?: boolean;
  /**
   * Two glowing sprites on one bone, `+-spreadCm` apart along the bone's own
   * x - the crow's eyes (`CreateSprite(BITMAP_LIGHT, …, 0.1, Light, o)` at
   * `BoneTransform[1]`, GOBoid.cpp:1573-1583). The flare is repainted every
   * frame at a luminosity rolled in `luminosity`, which is the flicker.
   */
  readonly eyes?: EyeGlow;
  /**
   * A call this species makes while the hero is inside `withinCm`, one chance
   * in `oneIn` a tick. `onSafeZone` is the crow's extra condition: it only
   * caws over a `TW_SAFEZONE` tile (GOBoid.cpp:1495-1500).
   */
  readonly call?: BoidCall;
};

export type EyeGlow = {
  readonly bone: number;
  readonly spreadCm: number;
  readonly scale: number;
  readonly colour: readonly [number, number, number];
  readonly luminosity: readonly [number, number];
};

export type BoidCall = {
  readonly sound: Sounds;
  readonly withinCm: number;
  readonly oneIn: number;
  readonly onSafeZone?: boolean;
};

const BIRD: BoidSpec = {
  kind: 'bird',
  models: ['Object1/Bird01.glb'],
  scale: 0.8,
  velocity: 1,
  turn: 13,
  lit: true,
};

const BAT: BoidSpec = {
  kind: 'bat',
  models: ['Object2/Bat01.glb'],
  scale: 0.8,
  velocity: 1,
  turn: 13,
  lit: true,
};

/** `Velocity` 0.3, `LightEnable` false, `Light` white (GOBoid.cpp:1334-1339). */
const BUTTERFLY: BoidSpec = {
  kind: 'butterfly',
  models: ['Object1/Butterfly01.glb'],
  scale: 0.8,
  velocity: 0.3,
  turn: 13,
  lit: false,
};

/**
 * Blood Castle's crow. `MoveBird` moves it (GOBoid.cpp:1437-1439) - the same
 * flight, dive and landing the Lorencia bird gets. What is its own: two red
 * eyes, and a caw it only makes over the safe zone.
 */
const CROW: BoidSpec = {
  kind: 'crow',
  models: ['Object12/Crow01.glb'],
  scale: 0.8,
  velocity: 1,
  turn: 13,
  lit: true,
  eyes: {
    bone: 1,
    spreadCm: 5,
    scale: 0.1,
    colour: [1, 0.2, 0],
    luminosity: [1.28, 1.6],
  },
  call: {
    sound: 'Sound/eCrow',
    withinCm: 600,
    oneIn: 128,
    onSafeZone: true,
  },
};

/**
 * `CreateAtlanseFish` (GOBoid.cpp:885-895) picks `MODEL_FISH01 + 1 + rand()%2`
 * out of the eight `Object8` fish the map loads - so Fish02 or Fish03, never
 * the Lorencia Fish01 that shares the slot name.
 */
const FISH: BoidSpec = {
  kind: 'fish',
  models: ['Object8/Fish02.glb', 'Object8/Fish03.glb'],
  scale: 0.8,
  velocity: 1,
  turn: 15,
  lit: true,
};

/**
 * The invasion dragons (GOBoid.cpp:1274-1300). While `EnableEvent` is set the
 * spawner skips its per-map branch entirely and every free slot rolls for one
 * of these instead, so a Lorencia invasion has dragons overhead and no birds.
 *
 * `MONSTER_MODEL_DRAGON` is 31, which is `Monster32` (ZzzOpenData.cpp:2322).
 * Five slots is the default map's budget (GOBoid.cpp:1257); the roar, the
 * mouth fire and the flight path are the system's, not this table's.
 */
const DRAGON_MAX = 5;

const DRAGON: BoidSpec = {
  kind: 'dragon',
  models: ['Monster/Monster32.glb'],
  scale: 0.7,
  scaleRange: [0.6, 0.8],
  velocity: 0.5,
  turn: 0,
  lit: true,
  max: DRAGON_MAX,
  spawnOneIn: 300,
  flyDistance: 4000,
  lifeTicks: [128, 256],
  modelHalfTurn: true,
};

/**
 * `EnableEvent == 3` is the Golden Dragon and its only difference is
 * `SubType = 1` (GOBoid.cpp:1293), which the original renders as the
 * `RENDER_METAL | RENDER_BRIGHT` / `RENDER_CHROME | RENDER_BRIGHT` pair -
 * the same pass `monsters/goldenMonsters.ts` gives the rest of the golden
 * line, at the same tint.
 */
const GOLDEN_DRAGON: BoidSpec = { ...DRAGON, shine: [1, 0.5, 0] };

const BLOOD_CASTLE: readonly ENUM_WORLD[] = [
  ENUM_WORLD.WD_11BLOODCASTLE1,
  12,
  13,
  14,
  15,
  16,
  ENUM_WORLD.WD_11BLOODCASTLE_END,
  ENUM_WORLD.WD_52BLOODCASTLE_MASTER_LEVEL,
] as ENUM_WORLD[];

const BY_WORLD: Partial<Record<ENUM_WORLD, BoidSpec>> = {
  [ENUM_WORLD.WD_0LORENCIA]: BIRD,
  [ENUM_WORLD.WD_1DUNGEON]: BAT,
  [ENUM_WORLD.WD_4LOSTTOWER]: BAT,
  [ENUM_WORLD.WD_3NORIA]: BUTTERFLY,
  [ENUM_WORLD.WD_7ATLANSE]: FISH,
  [ENUM_WORLD.WD_67DOPPLEGANGER3]: FISH,
};

for (const w of BLOOD_CASTLE) BY_WORLD[w] = CROW;

/**
 * What flies on this map, or null. A running invasion (`MapEventState`, so 1
 * Red or 3 Golden) takes the sky over from the map's own species on every
 * map, exactly as the original's spawner does.
 */
export function boidsFor(map: ENUM_WORLD, invasion = 0): BoidSpec | null {
  if (invasion) return invasion === 3 ? GOLDEN_DRAGON : DRAGON;

  return BY_WORLD[map] ?? null;
}

const factories = new Map<string, typeof ModelObject>();

/**
 * One `ModelObject` subclass per model file, the same shape `petFactoryFor`
 * uses: the boid is an ordinary model entity and the system only moves it.
 */
export function boidFactoryFor(spec: BoidSpec, model: string): typeof ModelObject {
  // The two dragons share one model file and differ only by the shine, so the
  // key has to carry it or the first one loaded decides the colour of both.
  const key = spec.shine ? `${model}|${spec.shine.join()}` : model;
  const cached = factories.get(key);
  if (cached) return cached;

  class BoidModel extends ModelObject {
    static {
      BoidModel.OverrideScale = spec.scale;
    }

    CastsShadow = false;

    #entity: Entity | null = null;
    #eyes: (MovableFlare | null)[] = [];
    #asked = false;
    #disposed = false;

    async init(world: World, entity: Entity) {
      const shine = spec.shine;

      if (shine) this.BodyShine.tint.set(shine[0], shine[1], shine[2]);

      this.#entity = entity;

      this.load(await loadGLTF(model, world));
    }

    dispose(): void {
      this.#disposed = true;
      for (const eye of this.#eyes) eye?.dispose();
      this.#eyes = [];
      this.#entity = null;
      super.dispose();
    }

    Update(gameTime: World['gameTime']): void {
      super.Update(gameTime);

      const eyes = spec.eyes;
      const entity = this.#entity;
      if (!eyes || !entity || !this.Ready) return;

      if (!this.#asked) {
        this.#asked = true;
        this.#makeEyes(eyes);
      }

      if (this.#eyes.length < 2 || this.OutOfView) return;

      const [lo, hi] = eyes.luminosity;
      const lumi = lo + Math.random() * (hi - lo);

      for (let i = 0; i < 2; i++) {
        const eye = this.#eyes[i];
        if (!eye) continue;
        eyeLocal.set(((i === 0 ? -1 : 1) * eyes.spreadCm) / TILE_CM, 0, 0);
        boneLocalPos(entity, eyes.bone, eyeLocal, eyeWorld);
        eye.moveTo(eyeWorld.x, eyeWorld.y, eyeWorld.z);
        eye.setLuminosity(lumi);
      }
    }

    #makeEyes(eyes: EyeGlow): void {
      const scene = Store.world?.scene;
      if (!scene) return;

      for (let i = 0; i < 2; i++) {
        this.#eyes.push(null);
        void createMovableFlare(scene, eyes.scale, eyes.colour).then(flare => {
          if (!flare) return;
          if (this.#disposed) {
            flare.dispose();
            return;
          }
          this.#eyes[i] = flare;
        });
      }
    }
  }

  Object.defineProperty(BoidModel, 'name', {
    value: model.replace(/^.*\/|\.glb$/g, ''),
  });

  factories.set(key, BoidModel);

  return BoidModel;
}
