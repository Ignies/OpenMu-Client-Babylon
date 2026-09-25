import { runInAction } from 'mobx';
import type { ISystemFactory } from '../world';
import { Store, UIState } from '../../store';
import { ENUM_WORLD } from '../../common';
import { EventBus } from '../../libs/eventBus';
import { Vector3, type ArcRotateCamera } from '../../libs/babylon/exports';
import {
  loadCameraWalkScript,
  type CameraWaypoint,
} from '../../libs/mu/cameraWalkScript';
import {
  CHARACTER_CAMERA_POSITION,
  characterCameraTarget,
  characterSelectView,
  characterSlotPosition,
} from '../../common/characterSelect';
import { prefetchWorldTerrain } from '../../libs/mu/prefetchWorld';
import { loadVersionUi, versionUi } from '../../version';
import type {
  PregameBackdrop,
  PregamePhase,
  PregameScene,
} from '../../version/uiContract';

const MU_SCALE = 100;

const REFERENCE_FPS = 25;

/**
 * `UpdateTourWayPoint` (CameraMove.cpp:653-812) keeps two points. One
 * follows the waypoint polyline exactly and decides when the next waypoint
 * is reached; the camera's own point advances along a direction that, within
 * `kTourBlendDistance` (300 MU) of a waypoint, is blended half-way toward
 * the next leg's - so the camera rounds the corner instead of turning on the
 * spot - and the heading target is that blended direction's angle. Both move
 * `fCameraMoveAccel` MU per 25 Hz tick, clamped to `kMinTourAccel` /
 * `kMaxTourAccel`.
 */
const TOUR_BLEND_DISTANCE = 300 / MU_SCALE;
const TOUR_ACCEL_MIN = 0.1;
const TOUR_ACCEL_MAX = 100;

/**
 * The tour camera, `CalculateCameraPosition` (CameraUtility.cpp:113-173) in
 * tour mode. The eye is `CameraPosition` itself - the view is a rotate and a
 * translate, no orbit - trailing the path point by `1100 * level * 0.1` MU
 * and standing at `kTourCameraZPosition` (-300) - 100 + distance - 150: head
 * height on the corridor legs, 1.6 units over the floor at level 8. The
 * original also adds `-0.924 * distance * cos(yaw)` to that height
 * (`VectorIRotate` of the pitched angle matrix), which lifts the camera nine
 * units on World74's two south-bound legs and sinks it six under the floor
 * on the north-bound ones. That term is left out and the head height kept
 * on every leg.
 */
const TOUR_DISTANCE_PER_LEVEL = 110 / MU_SCALE;
const TOUR_EYE_BASE = -550 / MU_SCALE;

/**
 * `SetAngleFrustum(-112.5)` (CameraUtility.cpp:193) is 22.5 degrees above
 * the horizon, framed for an eye that the heading term above keeps swinging
 * up and down. Held at head height on every leg that read as staring at the
 * ceiling, so the pitch is eased down to eight degrees.
 */
const TOUR_PITCH = (8 * Math.PI) / 180;

/**
 * The loop the tour rides. The original moves its tour point by integration,
 * blending its direction toward the next leg over the last `kTourBlendDistance`
 * before a waypoint and toward the previous one after it; every corner
 * leaves that point a fixed offset off the polyline, and over laps the
 * offsets compound. So the rounding is done once, as geometry: each waypoint
 * gets a fillet of the blend distance (or half the shorter leg), sampled as
 * a curve, and the tour point is a distance along the result. The eye rides
 * the same loop `distance` behind the tour point and looks at it: through
 * a corner it keeps its speed, and the turn is spread over the fillet and
 * the trail. Where the eye trails is where this departs from the original,
 * whose fixed offset behind the point swept against the travel through
 * every corner and stalled the eye for two seconds.
 */
type RouteSample = {
  x: number;
  y: number;
  /** Arc length from the loop's start. */
  s: number;
  level: number;
  /** `fCameraMoveAccel` of the waypoint this stretch heads to (`targetCameraAcc`). */
  accel: number;
};

const ARC_STEPS = 8;

function buildRoute(path: readonly CameraWaypoint[]): RouteSample[] {
  const n = path.length;
  const out: RouteSample[] = [];
  let s = 0;

  const push = (x: number, y: number, level: number, accel: number) => {
    const last = out[out.length - 1];
    if (last) s += Math.hypot(x - last.x, y - last.y);
    out.push({ x, y, s, level, accel });
  };

  for (let i = 0; i < n; i++) {
    const a = path[i];
    const b = path[(i + 1) % n];
    const c = path[(i + 2) % n];

    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const ab = Math.hypot(abx, aby) || 1;
    const bcx = c.x - b.x;
    const bcy = c.y - b.y;
    const bc = Math.hypot(bcx, bcy) || 1;

    const rIn = Math.min(TOUR_BLEND_DISTANCE, ab / 2);
    const rOut = Math.min(TOUR_BLEND_DISTANCE, bc / 2);
    const inX = abx / ab;
    const inY = aby / ab;
    const outX = bcx / bc;
    const outY = bcy / bc;

    // The straight of leg a-b, between the two fillets.
    push(a.x + inX * rIn, a.y + inY * rIn, levelAt(a, b, rIn / ab), b.moveAccel);
    const endX = b.x - inX * rIn;
    const endY = b.y - inY * rIn;
    push(endX, endY, levelAt(a, b, 1 - rIn / ab), b.moveAccel);

    // The fillet at b: a quadratic curve from the straight's end, through b's
    // corner as control point, to the next straight's start.
    const exitX = b.x + outX * rOut;
    const exitY = b.y + outY * rOut;
    for (let k = 1; k <= ARC_STEPS; k++) {
      const u = k / ARC_STEPS;
      const w0 = (1 - u) * (1 - u);
      const w1 = 2 * (1 - u) * u;
      const w2 = u * u;
      push(
        w0 * endX + w1 * b.x + w2 * exitX,
        w0 * endY + w1 * b.y + w2 * exitY,
        b.distanceLevel,
        u < 0.5 ? b.moveAccel : c.moveAccel
      );
    }
  }

  return out;
}

function levelAt(a: CameraWaypoint, b: CameraWaypoint, t: number): number {
  return a.distanceLevel + (b.distanceLevel - a.distanceLevel) * t;
}

/** The loop's point `s` along it, into `out`. */
function routePoint(
  loop: RouteSample[],
  s: number,
  out: { x: number; y: number; level: number; accel: number }
): void {
  let hi = loop.length - 1;
  let lo = 0;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (loop[mid].s <= s) lo = mid;
    else hi = mid;
  }

  const a = loop[lo];
  const b = loop[hi];
  const t = b.s > a.s ? Math.min(1, Math.max(0, (s - a.s) / (b.s - a.s))) : 0;
  out.x = a.x + (b.x - a.x) * t;
  out.y = a.y + (b.y - a.y) * t;
  out.level = a.level + (b.level - a.level) * t;
  out.accel = b.accel;
}

/** `SetCameraFOV` (CameraUtility.cpp:284): the login world in tour mode. */
const TOUR_FOV = (65 * Math.PI) / 180;

/** `MoveCamera` (LoginScene.cpp:256): the scene's own camera, the one the character line-up is shot with. */
const CHARACTER_FOV = (45 * Math.PI) / 180;

/** Right-click close-up: aim this high above the slot's floor, from this far. */
const ZOOM_AIM_HEIGHT = 1.1;
const ZOOM_DISTANCE = 5;
/** Ease rate of the close-up, per second (exponential approach). */
const ZOOM_SPEED = 4;

/**
 * Which pre-game screen the backdrop is standing behind, or null in the
 * world. The start menu sits on the same backdrop the server list does: the
 * original never shows a bare screen, and it is what the next click needs
 * anyway, so putting it up here costs nothing later.
 */
function phaseFor(uiState: UIState): PregamePhase | null {
  switch (uiState) {
    case UIState.Preloader:
    case UIState.Servers:
    case UIState.Login:
      return 'login';
    case UIState.Characters:
      return 'characters';
    default:
      return null;
  }
}

export const LoginSceneSystem: ISystemFactory = world => {
  /**
   * The version's backdrop plan. Not available on the first frames - the UI
   * chunk loads after the app graph is up - so until it lands the system
   * does nothing, which is what it did anyway while the backdrop terrain
   * downloaded.
   */
  let backdropPlan: PregameBackdrop | null =
    versionUi()?.pregame.backdrop ?? null;

  if (!backdropPlan) {
    void loadVersionUi().then(ui => {
      backdropPlan = ui.pregame.backdrop;
    });
  }

  let requestedBackdrop: ENUM_WORLD | null = null;

  let waypoints: readonly CameraWaypoint[] | null = null;
  let scriptForWorld: number | null = null;

  /** The loop the tour rides, built once per waypoint list. */
  let route: RouteSample[] | null = null;
  let routeOf: readonly CameraWaypoint[] | null = null;
  /** Arc length of the tour point along the loop. */
  let along = 0;

  const eye = new Vector3(0, 0, 0);
  const lookAt = new Vector3(0, 0, 0);

  let gameFraming: {
    alpha: number;
    beta: number;
    radius: number;
    fov: number;
  } | null = null;
  let cameraIsOurs = false;

  // Close-up state: 0 = the line-up shot, 1 = on the focused character. The
  // aim point eases too, so switching focus while zoomed glides across.
  let zoom = 0;
  const zoomAim = Vector3.Zero();
  const baseTarget = characterCameraTarget();
  const camTarget = Vector3.Zero();
  const camPosition = Vector3.Zero();
  const closePosition = Vector3.Zero();

  /** The standalone set piece, for a version whose backdrop is not a world. */
  let setPiece: PregameScene | null = null;

  const resetTour = () => {
    route = null;
    routeOf = null;
    along = 0;
  };

  EventBus.on('warpCompleted', resetTour);

  const tourPoint = { x: 0, y: 0, level: 8, accel: 0 };
  const eyePoint = { x: 0, y: 0, level: 8, accel: 0 };

  const advanceTour = (deltaTime: number, path: readonly CameraWaypoint[]) => {
    if (routeOf !== path) {
      route = buildRoute(path);
      routeOf = path;
      along = 0;
    }

    const loop = route!;
    const length = loop[loop.length - 1].s;

    routePoint(loop, along, tourPoint);
    const step =
      (Math.min(Math.max(tourPoint.accel, TOUR_ACCEL_MIN), TOUR_ACCEL_MAX) *
        deltaTime *
        REFERENCE_FPS) /
      MU_SCALE;
    along = (along + step) % length;

    routePoint(loop, along, tourPoint);
    const distance = tourPoint.level * TOUR_DISTANCE_PER_LEVEL;
    routePoint(loop, (along - distance + length) % length, eyePoint);

    const heading = Math.atan2(
      tourPoint.y - eyePoint.y,
      tourPoint.x - eyePoint.x
    );
    const fx = Math.cos(heading);
    const fy = Math.sin(heading);

    eye.set(eyePoint.x, TOUR_EYE_BASE + distance, eyePoint.y);
    lookAt.set(
      eye.x + fx * Math.cos(TOUR_PITCH),
      eye.y + Math.sin(TOUR_PITCH),
      eye.z + fy * Math.cos(TOUR_PITCH)
    );
  };

  return {
    update: (deltaTime: number) => {
      const camera = world.scene.activeCamera as ArcRotateCamera;
      if (!camera) return;

      if (!gameFraming) {
        gameFraming = {
          alpha: camera.alpha,
          beta: camera.beta,
          radius: camera.radius,
          fov: camera.fov,
        };
      }

      const plan = backdropPlan;
      const phase = plan ? phaseFor(Store.uiState) : null;

      // Leaving the line-up drops the close-up, so it never greets a return.
      if (phase !== 'characters') {
        zoom = 0;
        if (characterSelectView.zoomedOn) {
          runInAction(() => (characterSelectView.zoomedOn = null));
        }
      }

      if (phase === null) {
        requestedBackdrop = null;

        if (setPiece) {
          setPiece.dispose();
          setPiece = null;
        }

        if (cameraIsOurs) {
          camera.alpha = gameFraming.alpha;
          camera.beta = gameFraming.beta;
          camera.radius = gameFraming.radius;
          camera.fov = gameFraming.fov;
          cameraIsOurs = false;
        }

        return;
      }

      if (plan!.kind === 'scene') {
        setPiece ??= plan!.create(world);
        cameraIsOurs = true;
        setPiece.update(deltaTime, phase);
        return;
      }

      const backdrop = phase === 'login' ? plan!.login : plan!.characters;

      if (requestedBackdrop !== backdrop) {
        requestedBackdrop = backdrop;
        resetTour();
        waypoints = null;
        scriptForWorld = null;
        EventBus.emit('requestWarp', { map: backdrop });
        return;
      }

      if (world.mapIndex !== backdrop || !world.terrain) return;

      if (backdrop === plan!.login) {
        prefetchWorldTerrain(plan!.characters);
      }

      const worldNum = backdrop + 1;

      if (scriptForWorld !== worldNum) {
        scriptForWorld = worldNum;
        loadCameraWalkScript(worldNum).then(loaded => {
          if (scriptForWorld === worldNum) waypoints = loaded;
        });
      }

      cameraIsOurs = true;

      if (waypoints && waypoints.length > 1) {
        advanceTour(deltaTime, waypoints);

        camera.fov = TOUR_FOV;
        camera.setTarget(lookAt);
        camera.setPosition(eye);
        return;
      }

      camera.fov = CHARACTER_FOV;

      const zoomedOn = Store.charactersList.find(
        c => c.Name === characterSelectView.zoomedOn
      );
      const slot = zoomedOn ? characterSlotPosition(zoomedOn.SlotIndex) : null;
      const ease = 1 - Math.exp(-ZOOM_SPEED * deltaTime);

      if (slot) {
        slot.y += ZOOM_AIM_HEIGHT;
        if (zoom === 0) zoomAim.copyFrom(slot);
        else Vector3.LerpToRef(zoomAim, slot, ease, zoomAim);
      }

      zoom += ((slot ? 1 : 0) - zoom) * ease;
      if (zoom < 0.001) zoom = 0;

      // Same viewing direction as the line-up shot, just ZOOM_DISTANCE away.
      zoomAim
        .subtractToRef(CHARACTER_CAMERA_POSITION, closePosition)
        .normalize()
        .scaleInPlace(-ZOOM_DISTANCE)
        .addInPlace(zoomAim);
      Vector3.LerpToRef(CHARACTER_CAMERA_POSITION, closePosition, zoom, camPosition);
      Vector3.LerpToRef(baseTarget, zoomAim, zoom, camTarget);
      camera.setTarget(camTarget);
      camera.setPosition(camPosition);
    },
  };
};
