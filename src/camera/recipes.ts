/**
 * The shared numbers, ported from the reference client. Original-client
 * units throughout (100 per tile, degrees); the facade converts once.
 */

/** Original units per tile (`TERRAIN_SCALE`). */
export const MU_SCALE = 100;

/**
 * Camera distance per wheel-zoom level, `g_shCameraLevel` 0..4
 * (CameraUtility.cpp `UpdateCameraDistance`).
 */
export const DISTANCE_BY_LEVEL: readonly number[] = [
  1000, 1100, 1200, 1300, 1400,
];

export const MAX_CAMERA_LEVEL = DISTANCE_BY_LEVEL.length - 1;

/**
 * Level the camera opens at and returns to on warp. The original started
 * at level 0 (closest); the middle of the range reads better on the web
 * client, and either end is one Ctrl+wheel step away.
 */
export const DEFAULT_CAMERA_LEVEL = Math.floor(MAX_CAMERA_LEVEL / 2);

/** `CameraDistance += (target - CameraDistance) / 3`, per 25 fps frame. */
export const DISTANCE_EASE = 1 / 3;

/** The original stepped its camera math at this frame rate. */
export const REFERENCE_FPS = 25;

/** Main-scene pitch, `CameraAngle[0] = -48.5` (`SetCameraAngle`). */
export const CAMERA_PITCH_DEG = 48.5;

/** `CameraFOV = 30` (`SetCameraFOV`), gluPerspective vertical degrees. */
export const CAMERA_FOV_DEG = 30;

/** Main-scene heading, `CameraAngle[2] = -45` (MainScene.cpp:117). */
export const DEFAULT_HEADING_DEG = -45;

/** Insert/Delete rotate step, degrees per reference frame while held. */
export const ROTATE_STEP_DEG = 15;

/**
 * Ctrl + middle-button drag, left/right: degrees of heading per pixel.
 * Not in the original client (it had no mouse rotate); sign matches
 * Babylon's default orbit feel - drag right, camera orbits clockwise.
 */
export const ROTATE_DRAG_DEG_PER_PX = 0.25;

/**
 * Ctrl + middle-button drag, up/down: degrees of pitch per pixel. Drag up
 * pitches the view up toward the horizon, drag down looks further down.
 */
export const PITCH_DRAG_DEG_PER_PX = 0.25;

/**
 * Pitch drag range, degrees added to the ported frame's tilt. Zero is the
 * original's fixed pitch; negative goes toward top-down, positive toward
 * the horizon. Kept narrow enough that the map edge stays out of frame.
 */
export const PITCH_OFFSET_MIN_DEG = -25;
export const PITCH_OFFSET_MAX_DEG = 25;

/** Camera sits `CameraDistance - 150` above its base height. */
export const HEIGHT_BACKOFF = 150;
