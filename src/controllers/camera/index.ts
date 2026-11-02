/**
 * THE FACADE - the original client's main-scene camera (CameraUtility.cpp /
 * SceneCommon.cpp), behind the `cameraControl` option. See controllers/camera/readme.md.
 */

import { observable, runInAction } from 'mobx';
import type { ENUM_WORLD } from '../../core/types';
import type { ArcRotateCamera, TransformNode } from '../render/babylon/exports';
import { GameOptions } from '@/controllers/settings';
import { isOn } from '@/controllers/fidelity';
import { EventBus } from '../../core/eventBus';
import type { CameraLayer } from './layer';
import { CAMERA_LAYERS } from './layers';
import { hideHeroBody, showHeroBody } from './heroBody';
import {
  installMouseLook,
  isMouseLookActive,
  releaseMouseLook,
} from './mouseLook';
import {
  BOB_EASE,
  BOB_JUMP_MU,
  BOB_RISE_MU,
  BOB_STRIDE_MU,
  BOB_WALK_MIN,
  CAMERA_PITCH_DEG,
  CLOSE_BAND_MU,
  DEFAULT_CAMERA_LEVEL,
  DEFAULT_HEADING_DEG,
  DISTANCE_BY_LEVEL,
  DISTANCE_EASE,
  EYE_HEIGHT_MU,
  FIRST_PERSON_MU,
  FIRST_PERSON_NEAR_MU,
  FIRST_PERSON_PITCH_LIMIT_DEG,
  FIRST_PERSON_WIDEN_DEG,
  HEIGHT_BACKOFF,
  HERO_HIDE_MU,
  MAX_CAMERA_LEVEL,
  MIN_RADIUS_MU,
  MOUSE_LOOK_DEG_PER_PX,
  MU_SCALE,
  PITCH_DRAG_DEG_PER_PX,
  PITCH_OFFSET_MAX_DEG,
  PITCH_OFFSET_MIN_DEG,
  REFERENCE_FPS,
  ROTATE_DRAG_DEG_PER_PX,
  ROTATE_STEP_DEG,
} from './recipes';
import { isMobileDevice } from '@/controllers/interface/mobile';

export type { CameraLayer } from './layer';
export { showHeroBody } from './heroBody';
export { aimX, aimY, isMouseLookActive, releaseMouseLook } from './mouseLook';

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

/** The level the current map opened on, which a reset goes back to. */
let openingLevel = DEFAULT_CAMERA_LEVEL;

/** `cameraKeepsView`: the view is zoomed, turned or tilted off the map's opening frame. */
export const cameraView = observable({ moved: false });

/** Back to the map's opening frame: its level, the default heading, no tilt. */
export function resetCamera(): void {
  level = openingLevel;
  headingDeg = DEFAULT_HEADING_DEG;
  pitchOffsetDeg = 0;
}

function syncMoved(): void {
  const turn = Math.abs(((((headingDeg - DEFAULT_HEADING_DEG) % 360) + 540) % 360) - 180);
  const moved =
    GameOptions.cameraControl &&
    isOn('cameraKeepsView') &&
    (level !== openingLevel || Math.abs(pitchOffsetDeg) > 0.5 || turn > 0.5);
  if (moved !== cameraView.moved) runInAction(() => (cameraView.moved = moved));
}

let wroteCamera = false;

/** `EarthQuake`, degrees on the view's pitch (DefaultCamera.cpp:712). */
let quakeDeg = 0;
/** Seconds the value set this tick holds before it decays. */
let quakeHold = 0;
/** The beta the shake added last frame, taken back where nothing else rewrites the camera. */
let quakeBeta = 0;

/**
 * An effect's `EarthQuake = deg`: set it every tick the shake runs. It holds
 * for that tick, then falls x0.2 a 25 fps frame (MainScene.cpp:197).
 */
export function earthQuake(deg: number): void {
  quakeDeg = deg;
  quakeHold = 1 / REFERENCE_FPS;
}

/**
 * `Angle[0] += EarthQuake` turns the view about the eye, so the eye stays and
 * the target swings; a negative value turns it toward the horizon.
 */
function shakeView(camera: ArcRotateCamera, dt: number): void {
  if (quakeHold > 0) quakeHold -= dt;
  else quakeDeg *= Math.pow(0.2, dt * REFERENCE_FPS);
  if (Math.abs(quakeDeg) < 0.01) quakeDeg = 0;
  quakeBeta = 0;
  if (quakeDeg === 0) return;

  const b0 = camera.beta;
  const b1 = b0 - quakeDeg * RAD;
  const r = camera.radius;
  const ds = r * (Math.sin(b0) - Math.sin(b1));
  camera.target.x += Math.cos(camera.alpha) * ds;
  camera.target.y += r * (Math.cos(b0) - Math.cos(b1));
  camera.target.z += Math.sin(camera.alpha) * ds;
  camera.beta = b1;
  quakeBeta = b1 - b0;
}

let classic: {
  alpha: number;
  beta: number;
  radius: number;
  fov: number;
  minZ: number;
} | null = null;

/**
 * The level a map opens on. A layer's distance is the frame the original
 * client pinned that map to; here it only picks the opening step, so the
 * wheel still works once the player is standing there. The ladder holds
 * every pinned value exactly (1100 and 2000 are both steps), so the nearest
 * step is that frame, not an approximation of it.
 */
function openingLevelFor(world: ENUM_WORLD): number {
  const pinned = byWorld.get(world)?.distance;

  if (pinned === undefined) return DEFAULT_CAMERA_LEVEL;

  let best = DEFAULT_CAMERA_LEVEL;

  for (let i = 0; i < DISTANCE_BY_LEVEL.length; i++) {
    const closer =
      Math.abs(DISTANCE_BY_LEVEL[i] - pinned) <
      Math.abs(DISTANCE_BY_LEVEL[best] - pinned);

    if (closer) best = i;
  }

  return best;
}

/**
 * The camera is at the hero's eyes rather than behind their back - the same
 * band that hides the body, which is the point at which there is nothing left
 * on screen to orbit and the frame reads as a first-person one.
 */
export function isFirstPerson(): boolean {
  return GameOptions.cameraControl && distance < HERO_HIDE_MU;
}

/**
 * Whether the frame is one the mouse may hold the pointer lock in. Tied to
 * `wsadMovement` because the lock takes the cursor away and the walk keys are
 * what is left to move with; first person only, unless the player asked for
 * it in third person too. The World-state half of the gate is the caller's.
 */
function canMouseLook(): boolean {
  // Never on a phone: the pointer lock freezes the touch stick.
  if (isMobileDevice()) return false;
  if (!GameOptions.wsadMovement) return false;

  return GameOptions.thirdPersonMouseLook
    ? GameOptions.cameraControl
    : isFirstPerson();
}

/**
 * Turn the view by a mouse movement, in pixels. Right and down are positive,
 * the way the browser reports them: right turns the view right, up pitches
 * toward the horizon. Shared by the middle-button drag and the first-person
 * look, which only differ in how many degrees a pixel is worth.
 */
function applyLook(
  dx: number,
  dy: number,
  headingDegPerPx: number,
  pitchDegPerPx: number
): void {
  headingDeg -= dx * headingDegPerPx;
  pitchOffsetDeg -= dy * pitchDegPerPx;
  pitchOffsetDeg = Math.max(
    -FIRST_PERSON_PITCH_LIMIT_DEG,
    Math.min(FIRST_PERSON_PITCH_LIMIT_DEG, pitchOffsetDeg)
  );
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
  // Canvas only, so UI scroll areas keep their wheel; app/main.tsx already
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

      applyLook(
        ev.clientX - dragLastX,
        ev.clientY - dragLastY,
        ROTATE_DRAG_DEG_PER_PX,
        PITCH_DRAG_DEG_PER_PX
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

  installMouseLook(
    canvas,
    () => isActive() && canMouseLook(),
    (dx, dy) => applyLook(dx, dy, MOUSE_LOOK_DEG_PER_PX, MOUSE_LOOK_DEG_PER_PX)
  );

  // World change resets the level (WSclient.cpp:600); heading, pitch and
  // distance snap with it so the new map opens on its own default frame.
  // `cameraKeepsView` keeps the player's view unless the map pins a distance.
  EventBus.on('warpCompleted', ({ map }) => {
    openingLevel = openingLevelFor(map);
    if (isOn('cameraKeepsView') && byWorld.get(map)?.distance === undefined) return;
    resetCamera();
    distance = DISTANCE_BY_LEVEL[level];
  });
}

/** Distance walked into the current stride, and how much bob is showing. */
let bobWalkedMu = 0;
let bobLevel = 0;
let bobLastX = 0;
let bobLastZ = 0;
let bobSeeded = false;

/**
 * The eye's rise and fall over a stride, in original units. Zero outside the
 * close band, with the option off, and while the hero is standing.
 *
 * `camera.target` is the hero's own position for the frame - the follow system
 * copies it in before this runs and only the Y lift below is ours - so the
 * walk is read from how far it moved rather than from movement state plumbed
 * through from the controller. That also means it covers every way the hero
 * travels, keys or click.
 */
function headBob(camera: ArcRotateCamera, close: number, dt: number): number {
  if (!GameOptions.firstPersonBob || close <= 0) {
    bobSeeded = false;
    bobLevel = 0;
    return 0;
  }

  const { x, z } = camera.target;

  if (!bobSeeded) {
    bobLastX = x;
    bobLastZ = z;
    bobSeeded = true;
  }

  const moved = Math.hypot(x - bobLastX, z - bobLastZ) * MU_SCALE;
  const walked = moved < BOB_JUMP_MU ? moved : 0;

  bobLastX = x;
  bobLastZ = z;

  const standing = dt <= 0 || walked / MU_SCALE / dt < BOB_WALK_MIN;

  bobLevel += ((standing ? 0 : 1) - bobLevel) * Math.min(1, BOB_EASE * dt);

  // Kept inside one stride: the phase is a distance that would otherwise grow
  // for the length of the session, and a float that large has no room left for
  // the centimetres this is made of.
  bobWalkedMu = (bobWalkedMu + walked) % BOB_STRIDE_MU;

  const phase = (bobWalkedMu / BOB_STRIDE_MU) * 2 * Math.PI;

  return Math.sin(phase) * BOB_RISE_MU * bobLevel * close;
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
  // Zoomed back out, or an option went off under the lock: hand the pointer
  // back. The World-state half of the gate is the wiring's, which releases
  // the lock itself on the way out. Reads last frame's distance, which is a
  // frame the player spends still holding the mouse.
  if (isMouseLookActive() && !canMouseLook()) releaseMouseLook();

  if (!GameOptions.cameraControl) {
    syncMoved();
    camera.beta -= quakeBeta;
    if (wroteCamera && classic) {
      camera.alpha = classic.alpha;
      camera.beta = classic.beta;
      camera.radius = classic.radius;
      camera.fov = classic.fov;
      camera.minZ = classic.minZ;
      showHeroBody();
      wroteCamera = false;
    }
    shakeView(camera, dt);
    return;
  }

  // Insert/Delete held: 15 degrees per reference frame (CameraUtility.cpp
  // :305-311), dt-scaled.
  const step = ROTATE_STEP_DEG * REFERENCE_FPS * dt;

  if (pressedKeys.has('Insert')) headingDeg += step;
  if (pressedKeys.has('Delete')) headingDeg -= step;
  headingDeg = ((headingDeg % 360) + 360) % 360 - 360;
  syncMoved();

  const layer = byWorld.get(world);
  const target = DISTANCE_BY_LEVEL[level];

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
  camera.target.y += (EYE_HEIGHT_MU * close + headBob(camera, close, dt)) / MU_SCALE;

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
  // The slider sets the frame the player picked and the eye widens over it,
  // so first person moves with the slider and the default still lands on
  // FIRST_PERSON_FOV_DEG.
  camera.fov =
    (GameOptions.cameraFov + FIRST_PERSON_WIDEN_DEG * close) * RAD;

  // Closing in walks the near plane out with the frame: at the eye it is what
  // keeps the hero's own aura and crackle - which emit around the body the
  // camera now sits in - out of the shot.
  if (classic) {
    camera.minZ =
      classic.minZ +
      (FIRST_PERSON_NEAR_MU / MU_SCALE - classic.minZ) * close;
  }

  wroteCamera = true;
  shakeView(camera, dt);

  if (heroModel && distance < HERO_HIDE_MU) hideHeroBody(heroModel, dt);
  else showHeroBody();
}
