/**
 * Lights that belong to the map: torches, braziers, hearths, street lamps,
 * candelabra, the Tarkan glow lamps - anything a map object throws by being
 * there. Each map's table is its own (`MapLighting.objectLights`, usually in
 * `versions/shared/maps/<map>/spec.ts`), keyed by `Object<n>.obj` type; a host
 * (the `MapObjectLights` adapter on `ModelObject`, or a map object class)
 * resolves its rows and calls `lightMapObject`.
 *
 * The original lights the ground under these objects with `AddTerrainLight`
 * from `MoveObjectSetting` / `RenderObjectVisual` (ZzzObject.cpp); the point
 * light is ours - the original has no per-pixel dynamic lights - and reaches
 * the walls and bodies around each flame.
 */
import type { Scene } from '../render/babylon/exports';
import type { ENUM_WORLD } from '../../core/types';
import type { Emission } from '../fx/effectParticles';
import { maps, type MapLayer } from '../maps';
import type { LightingLayer } from './layer';
import type { FlareSpec } from './effectLights';
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
 * `sprite` and `emissions` are the visuals that ride along - a flare card
 * (`controllers/lighting/effectLights.ts`) and a particle recipe (`controllers/fx/effectParticles.ts`)
 * - which the host draws, tinted by this light's colour.
 */
export type LightEmitter = {
  /** The flare card; its `texture` is the sheet the original names (`BITMAP_LIGHT` when left out). */
  readonly sprite?: FlareSpec;
  /** MU units, in the object's local frame; rotated by the host. */
  readonly offset?: readonly [number, number, number];
  /**
   * The offset is a bone's, where it sits at scale 1: it grows with the object as the original's
   * bone transforms do (`BodyScale`, ZzzBMD.cpp:168-180). A plain offset (`o->Position + p`) does not.
   */
  readonly bone?: boolean;
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

/**
 * Login-scene wall torch, type 37: at `bone_1_`, a breathing flare on case 37's BITMAP_FLARE sheet.
 * Its warm tint gives Flare.jpg, already an orange star, the mean colour [1, 0.45, 0.15] gave the
 * white flare01.jpg it was tuned on (`empireguardian4/spec.test.ts` works it out from the pixels).
 */
export const LOGIN_WALL_TORCH: LightEmitter = {
  sprite: {
    scale: 4,
    color: [0.395, 0.277, 0.279],
    pulse: { speed: 0.039, amount: 0.2, base: 0.6 },
    texture: 'flare',
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

/** A map's light table by object type (`MapLighting.objectLights`). */
export type MapObjectLights = Partial<Record<number, readonly LightEmitter[]>>;

const lightsOf = (l: MapLayer) => l.lighting?.objectLights;

/** The rows for a map object type on a world, or nothing. */
export function lightEmittersFor(
  world: ENUM_WORLD,
  type: number
): readonly LightEmitter[] | undefined {
  return maps.rowFor(world, lightsOf)?.[type];
}

/**
 * The adapter from a table row to the framework's recipe. Null when the row
 * has no `terrain` block - a bare flare (Icarus type 10) lights nothing.
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
 * position is held by reference - a host whose flame moves (the candelabra
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
