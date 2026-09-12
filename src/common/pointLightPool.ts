import {
  PointLight,
  Vector3,
  Color3,
  type Camera,
  type Scene,
} from '../libs/babylon/exports';
import { GameOptions } from './gameOptions';
import {
  directLightGain,
  pbrMaterialsOn,
  specularLightScale,
} from './materialQuality';
import { dynamicLightGain, pointLightBudget } from './lightingQuality';
import { devQueryNumber } from './devSeams';
import { lookDirector } from '../lighting/director';
import type { TerrainLightColor, TerrainLightEmitter } from './terrainDynamicLight';

/**
 * Torch slots this session, from the lighting tier — see `pointLightBudget`
 * for why it is fixed at startup and what it costs per pixel.
 */
export function pointLightPoolSize(): number {
  const budget = pointLightBudget();
  // Dev seam `?pool=<n>`: fewer slots this session, 0 = no pool.
  const dev = devQueryNumber('pool');

  return dev === null ? budget : Math.max(0, Math.min(budget, Math.floor(dev)));
}

const LIGHT_RANGE = 6;

/**
 * Key units (ARCHITECTURE §4.5), measured against Classic rather than derived:
 * the pool is what carries a torch onto an object on tiers >= 1, where the
 * object samples the baked lightmap without the delta. At 1.1 it gave a chair
 * beside the pub candelabra a 1.10x lift where Classic's delta gives 1.22x,
 * which is the whole "dynamic light does nothing on Ultra" report. 6.0 lands
 * 1.21x and 1.35x on the two chairs against Classic's 1.22x and 1.33x, with
 * the same lift in local contrast and saturation. It scales with the key, so
 * the ratio to the terrain delta is the same indoors and out.
 */
const INTENSITY = 6.0;

/** Dev seam `?poolI=<n>`: the peak in key units, for the tuning rounds. */
const intensityDev = devQueryNumber('poolI');

function poolIntensity(): number {
  return intensityDev ?? INTENSITY;
}

/**
 * The lit scene's level and the room's emitter gain, one product
 * (`AreaLook.candles`, 1 outside a room). `sceneGain` rather than `keyGain`,
 * so a torch pool dims with the ground while an event's omen is up.
 */
function keyGain(): number {
  const look = lookDirector()?.state();

  return look ? look.key.sceneGain * look.key.emitterGain : 1;
}

const HEIGHT_OFFSET = 0.6;

export type PointLightEmitter = {
  readonly position: { x: number; y: number; z: number };
  /**
   * The tile-map emitter this light stands in for while it holds a slot:
   * the ground then takes it per pixel (`terrainLighting.ts`) and the tile
   * map carries only the share the slot's fade has not taken yet.
   */
  readonly terrain?: TerrainLightEmitter;
  readonly heightOffset?: number;
  readonly range?: number;
  readonly wander?: number;
  readonly gain?: number;
  /** Higher wins a pool slot before distance is considered (hero gear = 2). */
  readonly priority?: number;
  /**
   * Skip the fade-in when this emitter takes a slot. For lights that start
   * on an event — a lightning strike, a skill impact — where the 0.35 s
   * swell reads as lag. Fade-out on losing a slot is unchanged.
   */
  readonly instant?: boolean;
  color(elapsedMs: number): TerrainLightColor;
};

const emitters = new Set<PointLightEmitter>();

let pool: PointLight[] = [];

/** One ground light per slot, as `terrainLighting.ts` binds it. */
export type GroundLight = {
  x: number;
  z: number;
  /** Tile-map footprint radius, 0 for an empty slot. */
  range: number;
  falloff: number;
  /** Colour with the floor gain, the fade and the dynamic gain folded in. */
  r: number;
  g: number;
  b: number;
};

const groundLights: GroundLight[] = [];

/** Terrain emitters a slot stands in for this frame, with the slot's fade. */
const heldTerrain = new Map<TerrainLightEmitter, number>();

/** The pool's lights as the ground takes them per pixel this frame. */
export function pointLightPoolGroundLights(): readonly GroundLight[] {
  return groundLights;
}

/** Tile-map emitters the pool lights per pixel this frame, and how far in. */
export function pointLightPoolHeldTerrain(): ReadonlyMap<TerrainLightEmitter, number> {
  return heldTerrain;
}

function clearGroundLight(g: GroundLight): void {
  g.x = 0;
  g.z = 0;
  g.range = 0;
  g.falloff = 1;
  g.r = 0;
  g.g = 0;
  g.b = 0;
}
let poolScene: Scene | null = null;

export function initPointLightPool(scene: Scene): void {
  if (poolScene === scene && pool.length) return;

  pool = [];
  poolScene = scene;

  for (let i = 0; i < pointLightPoolSize(); i++) {
    const light = new PointLight(`torchLight${i}`, Vector3.Zero(), scene);

    light.intensity = 0;
    light.range = LIGHT_RANGE;

    light.specular = Color3.Black();
  }
  pool = scene.lights.filter(
    (l): l is PointLight => l instanceof PointLight && l.name.startsWith('torchLight')
  );
}

/**
 * The pool's lights as placed this frame — position, diffuse, intensity and
 * range — for a shader that has no Babylon light binding of its own (the
 * terrain, for the reflections in standing water). An unused slot has
 * intensity 0; readers must treat that as "no light".
 */
export function pointLightPoolLights(): readonly PointLight[] {
  return pool;
}

export function registerPointLightEmitter(
  emitter: PointLightEmitter
): () => void {
  emitters.add(emitter);

  return () => {
    emitters.delete(emitter);
  };
}

const byDistance: { emitter: PointLightEmitter; d: number }[] = [];

const FADE_SECONDS = 0.35;

const WANDER_CHASE = 6;

type Slot = {
  emitter: PointLightEmitter | null;
  fade: number;
  wx: number;
  wy: number;
  wz: number;
};

const slots: Slot[] = [];

let lastElapsedMs = 0;

const desired = new Set<PointLightEmitter>();
const incoming: PointLightEmitter[] = [];

export function updatePointLightPool(elapsedMs: number, camera: Camera): void {
  if (!pool.length) return;

  const dt = Math.min(Math.max((elapsedMs - lastElapsedMs) / 1000, 0), 0.25);
  lastElapsedMs = elapsedMs;

  while (slots.length < pool.length) {
    slots.push({
      emitter: null,
      fade: 0,
      wx: 0,
      wy: 0,
      wz: 0,
    });
  }

  while (groundLights.length < pool.length) {
    groundLights.push({ x: 0, z: 0, range: 0, falloff: 1, r: 0, g: 0, b: 0 });
  }
  heldTerrain.clear();

  if (!GameOptions.dynamicLights || emitters.size === 0) {
    for (const light of pool) light.intensity = 0;
    for (const slot of slots) {
      slot.emitter = null;
      slot.fade = 0;
    }
    for (const g of groundLights) clearGroundLight(g);
    return;
  }

  // Rank from what the player is looking *at*, not from where the camera
  // stands. The arc camera sits ~10 tiles back and above the hero, so
  // camera-distance ranking favoured emitters in the bottom of the frame —
  // between the lens and the hero — over the torch the hero is standing next
  // to. The camera target is the hero (or the login-scene focus), which is
  // the centre of the screen and the thing the lights are for.
  const focus = (camera as { target?: Vector3 }).target ?? camera.globalPosition;

  byDistance.length = 0;

  for (const emitter of emitters) {
    const dx = emitter.position.x - focus.x;
    const dy = emitter.position.y - focus.y;
    const dz = emitter.position.z - focus.z;

    byDistance.push({ emitter, d: dx * dx + dy * dy + dz * dz });
  }

  byDistance.sort(
    (a, b) =>
      (b.emitter.priority ?? 0) - (a.emitter.priority ?? 0) || a.d - b.d
  );

  const active = Math.min(pool.length, byDistance.length);

  desired.clear();
  for (let i = 0; i < active; i++) desired.add(byDistance[i].emitter);

  incoming.length = 0;

  for (let i = 0; i < active; i++) {
    const { emitter } = byDistance[i];
    let held = false;

    for (const slot of slots) {
      if (slot.emitter === emitter) {
        held = true;
        break;
      }
    }

    if (!held) incoming.push(emitter);
  }

  const step = FADE_SECONDS > 0 ? dt / FADE_SECONDS : 1;

  // `incoming` is in rank order (priority, then distance), so a freeing slot
  // takes the best emitter still waiting. Popping the *end* of it handed the
  // slot to the worst one instead, which is the emitter that had just been
  // pushed out.
  let next = 0;

  for (let i = 0; i < pool.length; i++) {
    const light = pool[i];
    const slot = slots[i];

    const keep = slot.emitter !== null && desired.has(slot.emitter);

    slot.fade = keep
      ? Math.min(1, slot.fade + step)
      : Math.max(0, slot.fade - step);

    if (!keep) {
      const waiting = incoming[next] ?? null;

      // A slot changes hands when it has faded out - except for an event
      // light, which asks for a slot on the frame the strike happens and is
      // over inside the 0.35 s that fade takes. Waiting for it meant a skill
      // flash never lit anything on a map with more torches than slots.
      // Torch to torch still cross-fades.
      if (waiting && (slot.fade <= 0 || waiting.instant)) {
        slot.emitter = waiting;
        next++;

        if (waiting.instant) slot.fade = 1;
      } else if (slot.fade <= 0) {
        slot.emitter = null;
      }
    }

    const ground = groundLights[i];

    if (!slot.emitter) {
      light.intensity = 0;
      clearGroundLight(ground);
      continue;
    }

    const emitter = slot.emitter;
    const { r, g, b } = emitter.color(elapsedMs);

    // The ground's share of this light: the tile emitter's own footprint,
    // colour and floor gain, taken per pixel instead of per tile.
    const terrain = emitter.terrain;

    if (terrain) {
      const tc = terrain.color(elapsedMs);
      const k = (terrain.floorGain ?? 1) * slot.fade * dynamicLightGain();

      ground.x = terrain.position.x;
      ground.z = terrain.position.z;
      ground.range = terrain.range;
      ground.falloff = terrain.falloff ?? 1;
      ground.r = tc.r * k;
      ground.g = tc.g * k;
      ground.b = tc.b * k;
      heldTerrain.set(terrain, slot.fade);
    } else {
      clearGroundLight(ground);
    }

    light.range = emitter.range ?? LIGHT_RANGE;

    const wander = emitter.wander ?? 0;

    if (wander > 0) {
      const chase = Math.min(1, dt * WANDER_CHASE);

      slot.wx += ((Math.random() * 2 - 1) * wander - slot.wx) * chase;
      slot.wy += ((Math.random() * 2 - 1) * wander - slot.wy) * chase;
      slot.wz += ((Math.random() * 2 - 1) * wander - slot.wz) * chase;
    } else {
      slot.wx = slot.wy = slot.wz = 0;
    }

    light.position.set(
      emitter.position.x + slot.wx,
      emitter.position.y + (emitter.heightOffset ?? HEIGHT_OFFSET) + slot.wy,
      emitter.position.z + slot.wz
    );

    const peak = Math.max(r, g, b, 0.001);

    light.diffuse.set(r / peak, g / peak, b / peak);
    // The Standard material has no specular term, so the pool ships black
    // specular; the PBR material is what makes armour glisten under a
    // passing torch, and only it gets to see the highlight.
    if (pbrMaterialsOn()) {
      light.specular.copyFrom(light.diffuse).scaleInPlace(specularLightScale());
    } else light.specular.set(0, 0, 0);
    light.intensity =
      peak *
      poolIntensity() *
      keyGain() *
      (emitter.gain ?? 1) *
      slot.fade *
      directLightGain() *
      dynamicLightGain();
  }
}
