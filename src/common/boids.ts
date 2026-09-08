import { ENUM_WORLD } from './types';
import { loadGLTF } from './modelLoader';
import { ModelObject } from './modelObject';
import type { Entity, World } from '../ecs/world';

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

const CROW: BoidSpec = {
  kind: 'crow',
  models: ['Object12/Crow01.glb'],
  scale: 0.8,
  velocity: 1,
  turn: 13,
  lit: true,
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

    async init(world: World, _entity: Entity) {
      const shine = spec.shine;

      if (shine) this.BodyShine.tint.set(shine[0], shine[1], shine[2]);

      this.load(await loadGLTF(model, world));
    }
  }

  Object.defineProperty(BoidModel, 'name', {
    value: model.replace(/^.*\/|\.glb$/g, ''),
  });

  factories.set(key, BoidModel);

  return BoidModel;
}
