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
import type { TerrainLightColor } from './terrainDynamicLight';

/**
 * Torch slots this session, from the lighting tier — see `pointLightBudget`
 * for why it is fixed at startup and what it costs per pixel.
 */
export function pointLightPoolSize(): number {
  return pointLightBudget();
}

const LIGHT_RANGE = 6;

const INTENSITY = 3;

const HEIGHT_OFFSET = 0.6;

export type PointLightEmitter = {
  readonly position: { x: number; y: number; z: number };
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

  if (!GameOptions.dynamicLights || emitters.size === 0) {
    for (const light of pool) light.intensity = 0;
    for (const slot of slots) {
      slot.emitter = null;
      slot.fade = 0;
    }
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

  for (let i = 0; i < pool.length; i++) {
    const light = pool[i];
    const slot = slots[i];

    const keep = slot.emitter !== null && desired.has(slot.emitter);

    slot.fade = keep
      ? Math.min(1, slot.fade + step)
      : Math.max(0, slot.fade - step);

    if (!keep && slot.fade <= 0) {
      slot.emitter = incoming.pop() ?? null;

      if (slot.emitter?.instant) slot.fade = 1;
    }

    if (!slot.emitter) {
      light.intensity = 0;
      continue;
    }

    const emitter = slot.emitter;
    const { r, g, b } = emitter.color(elapsedMs);

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
      INTENSITY *
      (emitter.gain ?? 1) *
      slot.fade *
      directLightGain() *
      dynamicLightGain();
  }
}
