/**
 * THE FACADE - the original client's main-scene camera, behind the
 * `cameraControl` option. Copy `_template.ts` to add a map override.
 *
 * Ported from CameraUtility.cpp / SceneCommon.cpp: Ctrl+wheel steps the
 * discrete distance levels (opening mid-range), Insert/Delete rotate the
 * heading, pitch -48.5, vertical FOV 30. Ctrl+middle-button drag is the web
 * client's addition: left/right rotates the heading, up/down pitches the
 * view. Home is taken by the MU Helper hot key, so the frame resets on warp
 * instead. `layers.ts` holds the per-map overrides.
 *
 * The ladder in `recipes.ts` extends past the ported five at both ends: the
 * steps below 1000 blend the ported geometry toward an eye-level shot and
 * the innermost one is first person, where the hero's body is hidden.
 *
 * Single writer of alpha/beta/radius/fov, and of the target's Y lift, while
 * the option is on and the game is in the World state; `cameraFollowSystem`
 * is the only caller.
 * Option off: the classic framing captured at install is restored once and
 * the camera is never touched again.
 */

import type { ENUM_WORLD } from '../common/types';
import type { ArcRotateCamera, TransformNode } from '../libs/babylon/exports';
import { GameOptions } from '../common/gameOptions';
import { EventBus } from '../libs/eventBus';
import type { CameraLayer } from './layer';
import { CAMERA_LAYERS } from './layers';
import { hideHeroBody, showHeroBody } from './heroBody';
import {
  CAMERA_FOV_DEG,
  CAMERA_PITCH_DEG,
  CLOSE_BAND_MU,
  DEFAULT_CAMERA_LEVEL,
  DEFAULT_HEADING_DEG,
  DISTANCE_BY_LEVEL,
  DISTANCE_EASE,
  EYE_HEIGHT_MU,
  FIRST_PERSON_FOV_DEG,
  FIRST_PERSON_MU,
  FIRST_PERSON_NEAR_MU,
  FIRST_PERSON_PITCH_LIMIT_DEG,
  HEIGHT_BACKOFF,
  HERO_HIDE_MU,
  MAX_CAMERA_LEVEL,
  MIN_RADIUS_MU,
  MU_SCALE,
  PITCH_DRAG_DEG_PER_PX,
  PITCH_OFFSET_MAX_DEG,
  PITCH_OFFSET_MIN_DEG,
  REFERENCE_FPS,
  ROTATE_DRAG_DEG_PER_PX,
  ROTATE_STEP_DEG,
} from './recipes';

export type { CameraLayer } from './layer';
export { showHeroBody } from './heroBody';

const RAD = Math.PI / 180;

const byWorld = new Map<ENUM_WORLD, CameraLayer>();

for (const layer of CAMERA_LAYERS) {
  for (const world of layer.worlds) byWorld.set(world, layer);
}

/** `g_shCameraLevel`, 0..4. */
let level = DEFAULT_CAMERA_LEVEL;

/** `CameraAngle[2]`, degrees. */
let headingDeg = DEFAULT_HEADING_DEG;

/**
 * Drag pitch, degrees added to the ported frame's tilt. Zero is the
 * original's fixed pitch; positive looks toward the horizon.
 */
let pitchOffsetDeg = 0;

/** `CameraDistance`, original units, eased toward the level's target. */
let distance = DISTANCE_BY_LEVEL[DEFAULT_CAMERA_LEVEL];

let wroteCamera = false;

let classic: {
  alpha: number;
  beta: number;
  radius: number;
  fov: number;
  minZ: number;
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
    minZ: camera.minZ,
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

  // Ctrl + middle-button drag: left/right rotates the heading, up/down
  // pitches. Ctrl is only needed to start the drag; pointer capture keeps
  // it alive off-canvas until release.
  let dragPointer: number | null = null;
  let dragLastX = 0;
  let dragLastY = 0;

  if (canvas) {
    canvas.addEventListener('pointerdown', ev => {
      if (ev.button !== 1 || !ev.ctrlKey) return;
      if (!GameOptions.cameraControl || !isActive()) return;

      dragPointer = ev.pointerId;
      dragLastX = ev.clientX;
      dragLastY = ev.clientY;
      canvas.setPointerCapture(ev.pointerId);
      // Middle-button autoscroll would swallow the drag.
      ev.preventDefault();
    });

    canvas.addEventListener('pointermove', ev => {
      if (ev.pointerId !== dragPointer) return;

      headingDeg -= (ev.clientX - dragLastX) * ROTATE_DRAG_DEG_PER_PX;
      // Drag up (clientY shrinks) pitches up toward the horizon.
      pitchOffsetDeg -= (ev.clientY - dragLastY) * PITCH_DRAG_DEG_PER_PX;
      pitchOffsetDeg = Math.max(
        -FIRST_PERSON_PITCH_LIMIT_DEG,
        Math.min(FIRST_PERSON_PITCH_LIMIT_DEG, pitchOffsetDeg)
      );
      dragLastX = ev.clientX;
      dragLastY = ev.clientY;
    });

    const endDrag = (ev: PointerEvent) => {
      if (ev.pointerId === dragPointer) dragPointer = null;
    };
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);
  }

  // World change resets the level (WSclient.cpp:600); heading, pitch and
  // distance snap with it so the new map opens on the default frame.
  EventBus.on('warpCompleted', ({ map }) => {
    level = DEFAULT_CAMERA_LEVEL;
    headingDeg = DEFAULT_HEADING_DEG;
    pitchOffsetDeg = 0;
    distance = targetDistanceFor(map);
  });
}

/**
 * Per-frame write, after the follow target is set. `pressedKeys` is the
 * keyboard system's already-filtered set (no text-field keys in it);
 * `heroModel` is the local player's model node, hidden while the camera is
 * inside it.
 */
export function updateGameCamera(
  camera: ArcRotateCamera,
  world: ENUM_WORLD,
  pressedKeys: ReadonlySet<string>,
  heroModel: TransformNode | null,
  dt: number
): void {
  if (!GameOptions.cameraControl) {
    if (wroteCamera && classic) {
      camera.alpha = classic.alpha;
      camera.beta = classic.beta;
      camera.radius = classic.radius;
      camera.fov = classic.fov;
      camera.minZ = classic.minZ;
      showHeroBody();
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

  // How far into the close band the eased distance sits: 0 at every ported
  // level and every step outside them, 1 at the eye. The ported geometry
  // breaks down under 150 units (the camera would sit on the ground, then
  // under it), so this is what carries the frame the rest of the way in.
  const close = Math.min(
    1,
    Math.max(0, (CLOSE_BAND_MU - distance) / (CLOSE_BAND_MU - FIRST_PERSON_MU))
  );

  // CalculateCameraPosition: back off distance*cos(pitch) horizontally and
  // sit distance-150 above the base height (the hero's ground, unless the
  // map pins it).
  const horizontal = distance * Math.cos(CAMERA_PITCH_DEG * RAD);
  let vertical = Math.max(0, distance - HEIGHT_BACKOFF);

  if (layer?.groundHeight !== undefined) {
    vertical += layer.groundHeight - camera.target.y * MU_SCALE;
  }

  // Closing in drops the camera to the target's own height while the target
  // rises from the hero's feet to their eyes, so the shot ends up looking
  // out of the head instead of down at it.
  vertical *= 1 - close;
  camera.target.y += (EYE_HEIGHT_MU * close) / MU_SCALE;

  // The drag pitch orbits the ported frame around the target: same radius,
  // tilt added to beta, so offset 0 is the original's camera exactly. At the
  // eye the orbit clamp would stop the player looking up or down, so the
  // range opens with the band.
  const pitchMin =
    PITCH_OFFSET_MIN_DEG +
    (-FIRST_PERSON_PITCH_LIMIT_DEG - PITCH_OFFSET_MIN_DEG) * close;
  const pitchMax =
    PITCH_OFFSET_MAX_DEG +
    (FIRST_PERSON_PITCH_LIMIT_DEG - PITCH_OFFSET_MAX_DEG) * close;
  const pitch = Math.max(pitchMin, Math.min(pitchMax, pitchOffsetDeg));

  camera.radius =
    Math.max(MIN_RADIUS_MU, Math.hypot(horizontal, vertical)) / MU_SCALE;
  camera.beta = Math.atan2(horizontal, vertical) + pitch * RAD;
  camera.alpha = headingDeg * RAD;
  camera.fov =
    (CAMERA_FOV_DEG + (FIRST_PERSON_FOV_DEG - CAMERA_FOV_DEG) * close) * RAD;

  // Closing in walks the near plane out with the frame: at the eye it is what
  // keeps the hero's own aura and crackle - which emit around the body the
  // camera now sits in - out of the shot.
  if (classic) {
    camera.minZ =
      classic.minZ +
      (FIRST_PERSON_NEAR_MU / MU_SCALE - classic.minZ) * close;
  }

  wroteCamera = true;

  if (heroModel && distance < HERO_HIDE_MU) hideHeroBody(heroModel, dt);
  else showHeroBody();
}
