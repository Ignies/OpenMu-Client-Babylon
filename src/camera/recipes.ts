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

/** Camera sits `CameraDistance - 150` above its base height. */
export const HEIGHT_BACKOFF = 150;
