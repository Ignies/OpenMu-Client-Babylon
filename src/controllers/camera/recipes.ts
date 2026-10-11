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
 * Range the FOV slider offers around the original 30. The eye adds its own
 * widening on top, so the slider carries first person with it: the innermost
 * step runs 45 to 85 as the slider runs 20 to 60.
 */
export const CAMERA_FOV_MIN_DEG = 20;
export const CAMERA_FOV_MAX_DEG = 60;

/**
 * First-person frustum at the slider's default, vertical degrees. 30 is a
 * telephoto lens on a face, so the innermost step opens up.
 *
 * It opened to 65, the figure the original's own tour camera uses
 * (`SetCameraFOV`). That is a vertical figure and Babylon reads it as one too,
 * so on a 16:9 window it is a 97 degree frustum across - wider than the wide
 * end of what an FPS ships, and the outer third of the frame is stretched
 * along its own radius. On the near grass and foliage, which is card geometry
 * a tile from the eye, that stretch is the smearing at the edges of the shot.
 * 55 is about 86 across: still open for a subject this near, and short of
 * where the stretch starts to show.
 */
export const FIRST_PERSON_FOV_DEG = 55;

/**
 * What the eye adds to the third-person frustum. Held as a difference rather
 * than an absolute so the FOV slider moves both ends together - the reason
 * the eye opens up is the near subject, which does not stop being true
 * because the player widened their view.
 */
export const FIRST_PERSON_WIDEN_DEG = FIRST_PERSON_FOV_DEG - CAMERA_FOV_DEG;

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
 * First-person mouse look: degrees per pixel of raw mouse movement. Lower
 * than the drag rates above - a drag moves the cursor across the screen once,
 * a locked mouse keeps going, and 0.15 puts a full turn inside a mouse pad at
 * a typical 800 dpi.
 */
export const MOUSE_LOOK_DEG_PER_PX = 0.15;

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
 * Hero eye height above the entity's ground position, original units.
 *
 * Measured off the rig, not off `playerObject.ts`: that constructor's
 * `BoundingBoxLocal` is a hand-drawn picking box that stops at 1.2 tiles,
 * which is the hero's chest, and aiming the eye there put the camera in
 * their ribcage. The skeleton's own head bone (`Bip01 Head`, bone 20 - the
 * one headTrackingSystem drives) stands at 1.61 tiles in the male idle and
 * 1.59 in the female one, dropping to about 1.52 in the weapon stances.
 */
export const EYE_HEIGHT_MU = 160;

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

/**
 * First-person head bob: how far the eye rises and falls, and how far the hero
 * covers between footfalls, in original units.
 *
 * The phase rides the distance walked rather than the clock, so it holds to
 * the stride at any speed, stops dead when the hero does and cannot drift on a
 * stutter. 70 units is about two thirds of a tile, which is a step at the
 * scale a 160-unit eye implies. The rise is deliberately small: what sells the
 * eye is not the movement, it is that the camera stops being a fixed point in
 * space.
 */
export const BOB_RISE_MU = 3;
export const BOB_STRIDE_MU = 70;

/** Under this, in tiles a second, the hero counts as standing. */
export const BOB_WALK_MIN = 0.35;

/** How fast the bob comes and goes at the ends of a walk, per second. */
export const BOB_EASE = 6;

/**
 * A step no hero takes: a warp, a teleport or a server correction moves the
 * target this far in one frame, and walking it into the phase would put the
 * bob wherever the jump happened to land.
 */
export const BOB_JUMP_MU = 200;

/** How often a hidden hero's mesh list is re-scanned for streamed-in parts. */
export const HERO_RESCAN_SECONDS = 0.25;
