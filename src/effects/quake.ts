/**
 * Quake - the camera shake. The original's global `EarthQuake`: an effect
 * writes a random pitch in degrees every tick it wants the ground to shake
 * (Strike of Destruction's `rand() % 8 - 4) * 0.1`, MoveHandlers.cpp:7541),
 * and the camera adds it to its own pitch that frame (DefaultCamera.cpp:712).
 *
 * Here the offset is put on the active camera's `beta` just before it renders
 * and taken off again right after, so no camera code ever reads it back and
 * the orbit it keeps is untouched. One value for the whole scene, like the
 * original's global: the newest roll of any live quake wins.
 *
 * Driven by: `effects.spawn('quake', ...)`. Read by: nobody.
 */
import type { Camera, Scene, Vector3 } from '../libs/babylon/exports';
import { LiveList, TICK } from './core';
import type { EffectHandle, EffectLayer } from './layer';

// ---- 1. tuning -------------------------------------------------------------

/** Degrees to radians. */
const RAD = Math.PI / 180;

// ---- 2. state + readers ----------------------------------------------------

export interface QuakeOptions {
  /** How long it shakes, seconds. */
  seconds: number;
  /** The pitch roll's range in degrees, re-rolled every tick. */
  min: number;
  max: number;
}

const live = new LiveList();

/** Radians to add to the active camera's pitch this frame. */
let pitch = 0;
/** What was put on the camera before this render, to take back after it. */
let applied = 0;
const hooked = new WeakSet<Scene>();

/** How many quakes are shaking (debug). */
export function quakeCount(): number {
  return live.size;
}

type Orbit = Camera & { beta?: number };

function hook(scene: Scene): void {
  if (hooked.has(scene)) return;
  hooked.add(scene);
  scene.onBeforeCameraRenderObservable.add(camera => {
    const orbit = camera as Orbit;
    if (pitch === 0 || camera !== scene.activeCamera || orbit.beta === undefined) return;
    applied = pitch;
    orbit.beta += applied;
  });
  scene.onAfterCameraRenderObservable.add(camera => {
    const orbit = camera as Orbit;
    if (applied === 0 || orbit.beta === undefined) return;
    orbit.beta -= applied;
    applied = 0;
  });
}

function spawn(scene: Scene, _at: Vector3, opts: QuakeOptions): EffectHandle {
  hook(scene);
  let t = 0;
  let sinceRoll = TICK;
  return live.push({
    update(dt) {
      t += dt;
      if (t >= opts.seconds) return false;
      sinceRoll += dt;
      if (sinceRoll >= TICK) {
        sinceRoll = 0;
        pitch = (opts.min + Math.random() * (opts.max - opts.min)) * RAD;
      }
      return true;
    },
    release() {},
  });
}

function update(_map: number, dt: number): void {
  live.update(dt);
  if (live.size === 0) pitch = 0;
}

function reset(): void {
  live.clear();
  pitch = 0;
}

// ---- 3. the layer ----------------------------------------------------------

export const quakeLayer: EffectLayer<QuakeOptions, 'quake'> = {
  name: 'quake',
  update,
  reset,
  spawn,
};
