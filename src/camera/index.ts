/**
 * THE FACADE - the original client's main-scene camera, behind the
 * `cameraControl` option. Copy `_template.ts` to add a map override.
 *
 * Ported from CameraUtility.cpp / SceneCommon.cpp: Ctrl+wheel steps the
 * discrete distance levels, Insert/Delete rotate the heading (Home is taken
 * by the MU Helper hot key, so the heading resets on warp instead), pitch
 * -48.5, vertical FOV 30. `layers.ts` holds the per-map overrides.
 *
 * Single writer of alpha/beta/radius/fov while the option is on and the
 * game is in the World state; `cameraFollowSystem` is the only caller.
 * Option off: the classic framing captured at install is restored once and
 * the camera is never touched again.
 */

import type { ENUM_WORLD } from '../common/types';
import type { ArcRotateCamera } from '../libs/babylon/exports';
import { GameOptions } from '../common/gameOptions';
import { EventBus } from '../libs/eventBus';
import type { CameraLayer } from './layer';
import { CAMERA_LAYERS } from './layers';
import {
  CAMERA_FOV_DEG,
  CAMERA_PITCH_DEG,
  DEFAULT_HEADING_DEG,
  DISTANCE_BY_LEVEL,
  DISTANCE_EASE,
  HEIGHT_BACKOFF,
  MAX_CAMERA_LEVEL,
  MU_SCALE,
  REFERENCE_FPS,
  ROTATE_STEP_DEG,
} from './recipes';

export type { CameraLayer } from './layer';

const RAD = Math.PI / 180;

const byWorld = new Map<ENUM_WORLD, CameraLayer>();

for (const layer of CAMERA_LAYERS) {
  for (const world of layer.worlds) byWorld.set(world, layer);
}

/** `g_shCameraLevel`, 0..4. */
let level = 0;

/** `CameraAngle[2]`, degrees. */
let headingDeg = DEFAULT_HEADING_DEG;

/** `CameraDistance`, original units, eased toward the level's target. */
let distance = DISTANCE_BY_LEVEL[0];

let wroteCamera = false;

let classic: {
  alpha: number;
  beta: number;
  radius: number;
  fov: number;
} | null = null;

function targetDistanceFor(world: ENUM_WORLD): number {
  return byWorld.get(world)?.distance ?? DISTANCE_BY_LEVEL[level];
}

/**
 * Install the input listeners and capture the classic framing to restore
 * when the option goes off. Once, from `cameraFollowSystem`'s factory -
 * before any system has moved the camera. `isActive` is the wiring's gate
 * (the World state), so this module stays store-free.
 */
export function installCameraControl(
  camera: ArcRotateCamera,
  isActive: () => boolean
): void {
  classic = {
    alpha: camera.alpha,
    beta: camera.beta,
    radius: camera.radius,
    fov: camera.fov,
  };

  const canvas = camera.getEngine().getRenderingCanvas();

  // SetViewPortLevel (SceneCommon.cpp:237-253): Ctrl+wheel, up zooms in.
  // Canvas only, so UI scroll areas keep their wheel; main.tsx already
  // preventDefaults the browser's Ctrl+wheel page zoom.
  window.addEventListener(
    'wheel',
    ev => {
      if (!ev.ctrlKey || ev.target !== canvas) return;
      if (!GameOptions.cameraControl || !isActive()) return;

      if (ev.deltaY < 0) level--;
      else if (ev.deltaY > 0) level++;

      level = Math.max(0, Math.min(MAX_CAMERA_LEVEL, level));
    },
    { passive: true }
  );

  // World change resets the level (WSclient.cpp:600); heading and distance
  // snap with it so the new map opens on the default frame.
  EventBus.on('warpCompleted', ({ map }) => {
    level = 0;
    headingDeg = DEFAULT_HEADING_DEG;
    distance = targetDistanceFor(map);
  });
}

/**
 * Per-frame write, after the follow target is set. `pressedKeys` is the
 * keyboard system's already-filtered set (no text-field keys in it).
 */
export function updateGameCamera(
  camera: ArcRotateCamera,
  world: ENUM_WORLD,
  pressedKeys: ReadonlySet<string>,
  dt: number
): void {
  if (!GameOptions.cameraControl) {
    if (wroteCamera && classic) {
      camera.alpha = classic.alpha;
      camera.beta = classic.beta;
      camera.radius = classic.radius;
      camera.fov = classic.fov;
      wroteCamera = false;
    }
    return;
  }

  // Insert/Delete held: 15 degrees per reference frame (CameraUtility.cpp
  // :305-311), dt-scaled.
  const step = ROTATE_STEP_DEG * REFERENCE_FPS * dt;

  if (pressedKeys.has('Insert')) headingDeg += step;
  if (pressedKeys.has('Delete')) headingDeg -= step;
  headingDeg = ((headingDeg % 360) + 360) % 360 - 360;

  const layer = byWorld.get(world);
  const target = layer?.distance ?? DISTANCE_BY_LEVEL[level];

  // CameraDistance += (target - CameraDistance) / 3 per 25 fps frame.
  distance += (target - distance) * (1 - Math.pow(1 - DISTANCE_EASE, dt * REFERENCE_FPS));

  // CalculateCameraPosition: back off distance*cos(pitch) horizontally and
  // sit distance-150 above the base height (the hero's ground, unless the
  // map pins it).
  const horizontal = distance * Math.cos(CAMERA_PITCH_DEG * RAD);
  let vertical = distance - HEIGHT_BACKOFF;

  if (layer?.groundHeight !== undefined) {
    vertical += layer.groundHeight - camera.target.y * MU_SCALE;
  }

  camera.radius = Math.hypot(horizontal, vertical) / MU_SCALE;
  camera.beta = Math.atan2(horizontal, vertical);
  camera.alpha = headingDeg * RAD;
  camera.fov = CAMERA_FOV_DEG * RAD;
  wroteCamera = true;
}
