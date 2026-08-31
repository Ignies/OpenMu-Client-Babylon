/**
 * Lights that belong to the map: torches, braziers, hearths, street lamps,
 * candelabra, the Tarkan glow lamps — anything a map object throws by being
 * there. The per-world tables live here (or in `maps/<map>/spec.ts` for the
 * maps that already have one), keyed by `Object<n>.obj` type; a host (the
 * `MapObjectLights` adapter on `ModelObject`, or a map object class) resolves
 * its rows and calls `lightMapObject`.
 *
 * The original lights the ground under these objects with `AddTerrainLight`
 * from `MoveObjectSetting` / `RenderObjectVisual` (ZzzObject.cpp); the point
 * light is ours — the original has no per-pixel dynamic lights — and reaches
 * the walls and bodies around each flame.
 */
import type { Scene } from '../libs/babylon/exports';
import { ENUM_WORLD } from '../common/types';
import type { Emission } from '../common/effectParticles';
import { DUNGEON_LIGHTS } from '../maps/dungeon/spec';
import { ICARUS_LIGHTS } from '../maps/icarus/spec';
import { LOST_TOWER_LIGHTS } from '../maps/losttower/spec';
import { ATLANS_LIGHTS } from '../maps/atlans/spec';
import { NORIA_LIGHTS } from '../maps/noria/spec';
import { TARKAN_LIGHTS } from '../maps/tarkan/spec';
import { STADIUM_LIGHTS } from '../maps/stadium/spec';
import { KALIMA_LIGHTS } from '../maps/kalima/spec';
import { LAND_OF_TRIALS_LIGHTS } from '../maps/landoftrials/spec';
import { AIDA_LIGHTS } from '../maps/aida/spec';
import { CRYWOLF_LIGHTS } from '../maps/crywolf/spec';
import { KANTURU1_LIGHTS } from '../maps/kanturu1/spec';
import { KANTURU2_LIGHTS } from '../maps/kanturu2/spec';
import { KANTURU3_LIGHTS } from '../maps/kanturu3/spec';
import { BALGAS_LIGHTS } from '../maps/balgasbarracks/spec';
import { ELBELAND_LIGHTS } from '../maps/elbeland/spec';
import { SWAMP_LIGHTS } from '../maps/swamp/spec';
import { VULCANUS_LIGHTS } from '../maps/vulcanus/spec';
import { DUEL_ARENA_LIGHTS } from '../maps/duelarena/spec';
import { DOPPELGANGER2_LIGHTS } from '../maps/doppelganger2/spec';
import { DOPPELGANGER4_LIGHTS } from '../maps/doppelganger4/spec';
import { EMPIRE_GUARDIAN_LIGHTS } from '../maps/empireguardian/spec';
import { LOREN_MARKET_LIGHTS } from '../maps/lorenmarket/spec';
import { KARUTAN_LIGHTS } from '../maps/karutan1/spec';
import { KALIMA_WORLDS, onWorlds } from '../common/worldAssets';
import type { LightingLayer } from './layer';
import {
  LightSource,
  PRIORITY_TORCH,
  TORCH_FLICKER_SMOOTHING,
  type LightRecipe,
} from './lightSource';

// ---- 1. tuning + tables ----------------------------------------------------

/**
 * One row of a map's light table. `terrain` is the light itself (MU's
 * `AddTerrainLight` range and colour, plus our point-light knobs beside it);
 * `sprite` and `emissions` are the visuals that ride along — a flare card
 * (`common/effectLights.ts`) and a particle recipe (`common/effectParticles.ts`)
 * — which the host draws, tinted by this light's colour.
 */
export type LightEmitter = {
  readonly sprite?: {
    readonly scale: number;
    readonly color: readonly [number, number, number];
    readonly pulse?: { speed: number; amount: number; base: number };
  };
  /** MU units, in the object's local frame; rotated by the host. */
  readonly offset?: readonly [number, number, number];
  /** Point-light radius in tiles; defaults to the terrain range. */
  readonly pointRange?: number;
  /**
   * Height of the point light above the resolved position, in tiles. Rows
   * with an `offset` default to 0 (the offset already put it at the flame);
   * rows without one leave it to the pool's default hover.
   */
  readonly pointDrop?: number;
  readonly pointGain?: number;
  readonly wander?: number;
  /**
   * Particle recipe. A function is called with the object's own scale, for
   * emitters whose instances differ in size across a map (Devias 66 burns
   * both as a full-size camp fire and as a 0.7-scale hearth flame).
   */
  readonly emissions?:
    | readonly Emission[]
    | ((scale: number) => readonly Emission[]);
  readonly terrain?: {
    readonly range: number;
    readonly color: readonly [number, number, number];
    readonly flicker?: { min: number; max: number; steps: number };
    readonly falloff?: number;
    readonly floorGain?: number;
  };
};

const EMPIRE_GUARDIAN_4_LIGHTS: Partial<
  Record<number, readonly LightEmitter[]>
> = {
  79: [
    {
      sprite: { scale: 2, color: [1, 0.2, 0] },
      pointRange: 6,
      wander: 0.08,
      terrain: {
        range: 3,
        color: [1, 0.6, 0.2],
        flicker: { min: 0.3, max: 0.6, steps: 4 },
      },
    },
  ],

  80: [
    {
      sprite: {
        scale: 8,
        color: [0.1, 0.1, 0.5],
        pulse: { speed: 0.04, amount: 0.3, base: 0.4 },
      },
      pointRange: 4,
      terrain: {
        range: 2,
        color: [0.1, 0.1, 0.5],
      },
    },
  ],
};

function createFire(
  offset: readonly [number, number, number]
): LightEmitter {
  return {
    offset,
    pointRange: 7,
    wander: 0.12,
    terrain: {
      range: 4,
      color: [1, 0.6, 0.4],
      flicker: { min: 0.6, max: 1, steps: 5 },
    },
    emissions: [
      {
        kinds: ['fire0', 'fire0b'],
        every: 2,
        jitter: 8,
      },
    ],
  };
}

const LORENCIA_LIGHTS: Partial<Record<number, readonly LightEmitter[]>> = {
  50: [createFire([0, 0, 200])],

  51: [createFire([0, -30, 60])],

  52: [createFire([0, 0, 60])],

  55: [createFire([-150, -150, 140]), createFire([150, -150, 140])],

  80: [createFire([90, -200, 30]), createFire([90, 200, 30])],

  90: [
    {
      pointRange: 6,
      terrain: {
        range: 3,
        color: [1, 0.8, 0.6],
        flicker: { min: 0.6, max: 0.7, steps: 2 },
      },
    },
  ],

  130: [createFire([0, 0, 0])],

  150: [
    {
      offset: [0, 0, 78],
      pointDrop: -0.12,
      sprite: { scale: 3, color: [1, 0.62, 0.22] },
      pointRange: 5,
      pointGain: 1.6,
      wander: 0.05,
      terrain: {
        range: 5,
        color: [1, 0.52, 0.16],
        flicker: { min: 0.3, max: 0.6, steps: 4 },
        falloff: 1.6,
        floorGain: 2.5,
      },
    },
  ],
};

/**
 * Devias (Object3). The original lights nothing here; these are ours, so
 * the placements were checked against EncTerrain3.obj first:
 *  - 36 fireplace + 66 fire sit on the same spot (tavern 232/27.5,
 *    202.5/62, 225/44.5); the fire gets the flame, the hearth nothing.
 *    66 also burns alone as the camp fires (11.5/77.5, 174/192, …).
 *  - 54 / 56 candelabra are DeviasCandleObject: flames and light come from
 *    the wick bones (DEVIAS_CANDELABRA below), nothing is needed here.
 */
/** Above this object scale a Devias 66 is a camp fire, below it a hearth. */
const DEVIAS_HEARTH_SCALE = 0.9;

const DEVIAS_LIGHTS: Partial<Record<number, readonly LightEmitter[]>> = {
  66: [
    {
      ...createFire([0, 0, 30]),
      pointRange: 8,
      sprite: { scale: 4.5, color: [1, 0.45, 0.15] },
      terrain: {
        range: 5,
        color: [1, 0.6, 0.35],
        flicker: { min: 0.6, max: 1, steps: 5 },
      },
      // EncTerrain3.obj carries 66 in two sizes and the emitter multiplies
      // its sprites by the object's own scale, so one recipe cannot serve
      // both:
      //  - Hearths (0.70-0.78, always sharing a spot with a 36) come out
      //    small, so spawn twice a tick to fill the grate and keep the smoke
      //    tight — it is going up a chimney.
      //  - Camp fires (1.00 at 11.5/77.5, 108.6/242.4, 174/192, 162.6/233.6,
      //    plus the 0.72 one at 238.5/194.5) already have the mass at full
      //    size, so one a tick is enough and the second only burned fill
      //    rate. They spend it on wider, more frequent smoke instead —
      //    that is what reads at distance against snow.
      emissions: scale =>
        scale < DEVIAS_HEARTH_SCALE
          ? [
              { kinds: ['fire0', 'fire0b'], every: 1, count: 2, jitter: 10 },
              { kinds: ['smoke0'], every: 5, jitter: 10, scale: 1.4 },
            ]
          : [
              { kinds: ['fire0', 'fire0b'], every: 1, count: 1, jitter: 16 },
              { kinds: ['smoke0'], every: 3, jitter: 18, scale: 1.9 },
            ],
    },
  ],
};

/**
 * Devias standing candelabra (Object3 types 54 / 56), lit from the average
 * of the three wick bones by `DeviasCandleObject`. Lorencia's table candle
 * (150 above) minus the fixed offset, reaching further and yellower: the
 * wicks sit ~1.7 tiles over the floor. A lower peak over a longer, softer
 * falloff — ~0.41 at two tiles, ~0.24 at three, ~0.13 at four — now that the
 * delta texture has a shoulder (`DELTA_KNEE`) and the interior key lifts the
 * floor between pools (`INTERIOR_GROUND_KEY`, sceneLook.ts).
 */
export const DEVIAS_CANDELABRA: LightEmitter = {
  pointRange: 7,
  pointDrop: 0,
  pointGain: 1.4,
  wander: 0.05,
  terrain: {
    range: 5.5,
    color: [1, 0.66, 0.3],
    flicker: { min: 0.45, max: 0.75, steps: 4 },
    falloff: 1.4,
    floorGain: 1.3,
  },
};

/**
 * Login-scene (World 74) chandelier, type 157: three wick bones with fire,
 * one light at the object origin. The colour is the table candle's.
 */
export const LOGIN_CHANDELIER: LightEmitter = {
  terrain: {
    range: 5,
    color: [1, 0.62, 0.22],
    flicker: { min: 0.3, max: 0.6, steps: 4 },
  },
};

/** Login-scene wall torch, type 37: at `bone_1_`, a breathing flare. */
export const LOGIN_WALL_TORCH: LightEmitter = {
  sprite: {
    scale: 4,
    color: [1, 0.45, 0.15],
    pulse: { speed: 0.039, amount: 0.2, base: 0.6 },
  },
  terrain: {
    range: 2,
    color: [1, 0.6, 0.2],
    flicker: { min: 0.3, max: 0.6, steps: 4 },
  },
};

/**
 * Tarkan 7, the red glow lamp (ZzzObject.cpp:4058-4069):
 * `sinf((WorldTime + Angle[2] * 100) * 0.002f) * 0.35f + 0.65f`, then
 * `AddTerrainLight(x, y, (L, L*0.6, L*0.2), 3, …)`. The pulse's `phase` is
 * the lamp's yaw in degrees × 100 ms, so the 98 lamps breathe out of step.
 * `(sin + 1) * amount + base` is the recipe's shape, hence base 0.30 for the
 * original's 0.65 ± 0.35. Point range 6 is Lorencia's street light (90).
 */
export function tarkanGlowLamp(phaseMs: number): LightRecipe {
  return {
    color: [1, 0.6, 0.2],
    range: 3,
    pointRange: 6,
    pulse: { speed: 0.002, amount: 0.35, base: 0.3, phase: phaseMs },
    priority: PRIORITY_TORCH,
    instant: false,
  };
}

const LIGHTS_BY_WORLD: Partial<
  Record<ENUM_WORLD, Partial<Record<number, readonly LightEmitter[]>>>
> = {
  [ENUM_WORLD.WD_0LORENCIA]: LORENCIA_LIGHTS,
  [ENUM_WORLD.WD_1DUNGEON]: DUNGEON_LIGHTS,
  [ENUM_WORLD.WD_3NORIA]: NORIA_LIGHTS,
  [ENUM_WORLD.WD_4LOSTTOWER]: LOST_TOWER_LIGHTS,
  [ENUM_WORLD.WD_6STADIUM]: STADIUM_LIGHTS,
  [ENUM_WORLD.WD_7ATLANSE]: ATLANS_LIGHTS,
  [ENUM_WORLD.WD_8TARKAN]: TARKAN_LIGHTS,
  [ENUM_WORLD.WD_10ICARUS]: ICARUS_LIGHTS,
  [ENUM_WORLD.WD_2DEVIAS]: DEVIAS_LIGHTS,
  // Season 2-6 worlds ("Later worlds").
  ...onWorlds(KALIMA_WORLDS, KALIMA_LIGHTS),
  [ENUM_WORLD.WD_31HUNTING_GROUND]: LAND_OF_TRIALS_LIGHTS,
  [ENUM_WORLD.WD_33AIDA]: AIDA_LIGHTS,
  [ENUM_WORLD.WD_34CRYWOLF_1ST]: CRYWOLF_LIGHTS,
  [ENUM_WORLD.WD_37KANTURU_1ST]: KANTURU1_LIGHTS,
  [ENUM_WORLD.WD_38KANTURU_2ND]: KANTURU2_LIGHTS,
  [ENUM_WORLD.WD_39KANTURU_3RD]: KANTURU3_LIGHTS,
  [ENUM_WORLD.WD_40AREA_FOR_GM]: KANTURU1_LIGHTS,
  [ENUM_WORLD.WD_41CHANGEUP3RD_1ST]: BALGAS_LIGHTS,
  [ENUM_WORLD.WD_42CHANGEUP3RD_2ND]: BALGAS_LIGHTS,
  [ENUM_WORLD.WD_51ELBELAND]: ELBELAND_LIGHTS,
  [ENUM_WORLD.WD_56MAP_SWAMP_OF_QUIET]: SWAMP_LIGHTS,
  [ENUM_WORLD.WD_63PK_FIELD]: VULCANUS_LIGHTS,
  [ENUM_WORLD.WD_64DUELARENA]: DUEL_ARENA_LIGHTS,
  [ENUM_WORLD.WD_66DOPPLEGANGER2]: DOPPELGANGER2_LIGHTS,
  [ENUM_WORLD.WD_68DOPPLEGANGER4]: DOPPELGANGER4_LIGHTS,
  [ENUM_WORLD.WD_69EMPIREGUARDIAN1]: EMPIRE_GUARDIAN_LIGHTS,
  [ENUM_WORLD.WD_70EMPIREGUARDIAN2]: EMPIRE_GUARDIAN_LIGHTS,
  [ENUM_WORLD.WD_71EMPIREGUARDIAN3]: EMPIRE_GUARDIAN_LIGHTS,
  [ENUM_WORLD.WD_79UNITEDMARKETPLACE]: LOREN_MARKET_LIGHTS,
  [ENUM_WORLD.WD_80KARUTAN1]: KARUTAN_LIGHTS,
  [ENUM_WORLD.WD_81KARUTAN2]: KARUTAN_LIGHTS,
  [ENUM_WORLD.WD_72EMPIREGUARDIAN4]: EMPIRE_GUARDIAN_4_LIGHTS,
  [ENUM_WORLD.WD_73NEW_LOGIN_SCENE]: EMPIRE_GUARDIAN_4_LIGHTS,
  [ENUM_WORLD.WD_74NEW_CHARACTER_SCENE]: EMPIRE_GUARDIAN_4_LIGHTS,
};

/** The rows for a map object type on a world, or nothing. */
export function lightEmittersFor(
  world: ENUM_WORLD,
  type: number
): readonly LightEmitter[] | undefined {
  return LIGHTS_BY_WORLD[world]?.[type];
}

/**
 * The adapter from a table row to the framework's recipe. Null when the row
 * has no `terrain` block — a bare flare (Icarus type 10) lights nothing.
 */
export function recipeFromEmitter(emitter: LightEmitter): LightRecipe | null {
  const terrain = emitter.terrain;

  if (!terrain) return null;

  // Sprite pulses used to drive the terrain luminosity too when the row had
  // no flicker (the login-scene orb): keep that.
  const pulse = terrain.flicker ? undefined : emitter.sprite?.pulse;

  return {
    color: terrain.color,
    range: terrain.range,
    pointRange: emitter.pointRange ?? terrain.range,
    gain: emitter.pointGain,
    floorGain: terrain.floorGain,
    falloff: terrain.falloff,
    flicker: terrain.flicker,
    flickerSmoothing: TORCH_FLICKER_SMOOTHING,
    pulse,
    wander: emitter.wander,
    heightOffset:
      emitter.pointDrop ?? (emitter.offset ? 0 : undefined),
    priority: PRIORITY_TORCH,
    instant: false,
  };
}

// ---- 2. state + readers ----------------------------------------------------

const sources = new Set<LightSource>();

/**
 * Command: light a map object's row at a resolved world position. The
 * position is held by reference — a host whose flame moves (the candelabra
 * wicks) mutates it. Returns null when the row has no light. The host owns
 * the handle and `dispose()`s it with the object; `update` forgets the dead.
 */
export function lightMapObject(
  scene: Scene,
  emitter: LightEmitter,
  position: { x: number; y: number; z: number }
): LightSource | null {
  const recipe = recipeFromEmitter(emitter);

  if (!recipe) return null;

  return lightMapObjectWith(scene, recipe, position);
}

/** Same, from a recipe the host built itself (`tarkanGlowLamp`). */
export function lightMapObjectWith(
  scene: Scene,
  recipe: LightRecipe,
  position: { x: number; y: number; z: number }
): LightSource {
  const source = LightSource.attach(scene, recipe, { position });

  sources.add(source);

  return source;
}

function update(): void {
  for (const source of sources) if (!source.alive) sources.delete(source);
}

function reset(): void {
  sources.clear();
}

function emitters(): readonly LightSource[] {
  return Array.from(sources);
}

// ---- 3. the layer ----------------------------------------------------------

export const mapObjectLightsLayer: LightingLayer = {
  name: 'mapObjectLights',
  update,
  reset,
  emitters,
};
