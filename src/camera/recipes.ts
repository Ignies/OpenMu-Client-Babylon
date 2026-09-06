/**
 * The shared numbers, ported from the reference client. Original-client
 * units throughout (100 per tile, degrees); the facade converts once.
 */

/** Original units per tile (`TERRAIN_SCALE`). */
export const MU_SCALE = 100;

/**
 * Innermost zoom distance: the first-person eye. Not a distance the original
 * client has - it stopped at 1000 - so it is this client's own step.
 */
export const FIRST_PERSON_MU = 5;

/**
 * The original's five wheel-zoom distances, `g_shCameraLevel` 0..4
 * (CameraUtility.cpp `UpdateCameraDistance`). Kept exact: these five frame
 * the hero the way the original client does.
 */
const PORTED_DISTANCES: readonly number[] = [1000, 1100, 1200, 1300, 1400];

/** The distance the original's default level framed the hero at. */
const PORTED_DEFAULT_DISTANCE = 1200;

/**
 * Camera distance per wheel-zoom level. The ported five sit in the middle;
 * the steps outside them do not exist in the original client. Level 0 is the
 * first-person eye, 2000 is the original's own level-5 distance
 * (`CDirection.cpp:72`), and the last step frames a whole town square.
 *
 * Nothing sits between 300 and the eye on purpose: closer than that the hero
 * fills the frame and blocks the very view the player zoomed in for, so the
 * last step in glides past it into first person rather than stopping there.
 */
export const DISTANCE_BY_LEVEL: readonly number[] = [
  FIRST_PERSON_MU,
  300,
  480,
  660,
  840,
  ...PORTED_DISTANCES,
  1700,
  2000,
  2400,
  2900,
];

export const MAX_CAMERA_LEVEL = DISTANCE_BY_LEVEL.length - 1;

/**
 * Level the camera opens at and returns to on warp - the original's own
 * default distance, found in the ladder so it cannot drift when steps are
 * added at either end.
 */
export const DEFAULT_CAMERA_LEVEL =
  DISTANCE_BY_LEVEL.indexOf(PORTED_DEFAULT_DISTANCE);

/** `CameraDistance += (target - CameraDistance) / 3`, per 25 fps frame. */
export const DISTANCE_EASE = 1 / 3;

/** The original stepped its camera math at this frame rate. */
export const REFERENCE_FPS = 25;

/** Main-scene pitch, `CameraAngle[0] = -48.5` (`SetCameraAngle`). */
export const CAMERA_PITCH_DEG = 48.5;

/** `CameraFOV = 30` (`SetCameraFOV`), gluPerspective vertical degrees. */
export const CAMERA_FOV_DEG = 30;

/**
 * First-person frustum. 30 degrees is a telephoto lens on a face; the
 * original itself opens to 65 for its tour camera (`SetCameraFOV`).
 */
export const FIRST_PERSON_FOV_DEG = 65;

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

/**
 * Pitch drag range at the eye, where the orbit clamp would leave the player
 * unable to look at the sky or their own feet.
 */
export const FIRST_PERSON_PITCH_LIMIT_DEG = 60;

/** Camera sits `CameraDistance - 150` above its base height. */
export const HEIGHT_BACKOFF = 150;

/**
 * Distance at which the frame starts blending out of the ported geometry
 * toward the eye. Equal to the ported band's floor, so every ported level
 * keeps its exact framing.
 */
export const CLOSE_BAND_MU = PORTED_DISTANCES[0];

/**
 * Hero eye height above the entity's ground position, original units. The
 * player model's local bounding box tops out at 1.2 tiles
 * (`playerObject.ts` constructor).
 */
export const EYE_HEIGHT_MU = 115;

/**
 * Below this the camera is behind the hero's eyes rather than behind their
 * back, so the body is hidden. Only the glide into the innermost step reaches
 * it, and it is set where the near plane below has caught up with the body -
 * hiding earlier would leave the hero's own aura floating in an empty frame.
 */
export const HERO_HIDE_MU = 60;

/**
 * Near plane at the eye. The hero's own item aura and crackle emit over the
 * body they are worn on, so at the eye they emit around the camera; half a
 * tile of near plane clips them without ever slicing world geometry the
 * player is not already standing inside.
 */
export const FIRST_PERSON_NEAR_MU = 50;

/**
 * The eased distance can land on the innermost step exactly, which would put
 * the camera on top of its own target and hand Babylon a zero forward vector.
 */
export const MIN_RADIUS_MU = 2;

/** How often a hidden hero's mesh list is re-scanned for streamed-in parts. */
export const HERO_RESCAN_SECONDS = 0.25;
