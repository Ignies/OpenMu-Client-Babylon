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
 * Where the eye trails is where this departs from the original. There the
 * offset is a fixed vector behind the tour point on a heading that turns at
 * most one degree per tick (CameraMove.cpp:757-770), so through a corner the
 * offset sweeps against the direction of travel and the eye slows to a
 * quarter of its speed for two seconds, then picks up again. Here the eye
 * sits on the tour point's own rounded path, `distance` behind it, and looks
 * along the path at it: same speed as the point, the turn spread over the
 * corner's blend and the trail.
 */
type TrailPoint = { x: number; y: number; s: number };

/** `SetCameraFOV` (CameraUtility.cpp:284): the login world in tour mode. */
const TOUR_FOV = (65 * Math.PI) / 180;

/** `MoveCamera` (LoginScene.cpp:256): the scene's own camera, the one the character line-up is shot with. */
const CHARACTER_FOV = (45 * Math.PI) / 180;

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

  let waypoints: CameraWaypoint[] | null = null;
  let scriptForWorld: number | null = null;

  let tourStarted = false;
  let targetIndex = 0;
  let heading = 0;
  /** `m_CurrentCameraPos`: on the polyline. */
  const follower = { x: 0, y: 0 };
  /** `m_vTourCameraPos`: the rounded path the camera trails. */
  const tour = { x: 0, y: 0 };
  /** Where the tour point has been, with the arc length at each sample. */
  const trail: TrailPoint[] = [];

  const eye = new Vector3(0, 0, 0);
  const lookAt = new Vector3(0, 0, 0);

  let gameFraming: {
    alpha: number;
    beta: number;
    radius: number;
    fov: number;
  } | null = null;
  let cameraIsOurs = false;

  /** The standalone set piece, for a version whose backdrop is not a world. */
  let setPiece: PregameScene | null = null;

  const resetTour = () => {
    tourStarted = false;
  };

  EventBus.on('warpCompleted', resetTour);

  /**
   * The point `behind` units back along the trail, into `out`. Before the
   * trail is that long the start is extended straight back along the first
   * heading.
   */
  const trailPoint = (behind: number, out: { x: number; y: number }) => {
    const last = trail[trail.length - 1];
    const wanted = last.s - behind;

    if (wanted <= trail[0].s) {
      const first = trail[0];
      const back = first.s - wanted;
      out.x = first.x - Math.cos(heading) * back;
      out.y = first.y - Math.sin(heading) * back;
      return;
    }

    let i = trail.length - 1;
    while (i > 0 && trail[i - 1].s > wanted) i--;

    const a = trail[i - 1];
    const b = trail[i];
    const t = b.s > a.s ? (wanted - a.s) / (b.s - a.s) : 1;
    out.x = a.x + (b.x - a.x) * t;
    out.y = a.y + (b.y - a.y) * t;

    // Older than the eye and one sample of margin: never needed again.
    if (i > 2) trail.splice(0, i - 2);
  };

  /** The direction of the leg into `path[i]`, from the waypoint before it. */
  const legInto = (path: CameraWaypoint[], i: number) => {
    const from = path[(i + path.length - 1) % path.length];
    const to = path[i];
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy);

    return length > 0 ? { x: dx / length, y: dy / length } : null;
  };

  const advanceTour = (deltaTime: number, path: CameraWaypoint[]) => {
    const ticks = deltaTime * REFERENCE_FPS;

    if (!tourStarted) {
      // `PlayCameraWalk`: both points at the first waypoint, facing the second.
      const start = path[0];
      follower.x = tour.x = start.x;
      follower.y = tour.y = start.y;
      targetIndex = 1 % path.length;
      heading = Math.atan2(
        path[targetIndex].y - start.y,
        path[targetIndex].x - start.x
      );
      trail.length = 0;
      trail.push({ x: start.x, y: start.y, s: 0 });
      tourStarted = true;
    }

    let level = path[targetIndex].distanceLevel;

    for (let guard = 0; guard < path.length; guard++) {
      const target = path[targetIndex];
      const originIndex = (targetIndex + path.length - 1) % path.length;
      const origin = path[originIndex];

      const step =
        (Math.min(Math.max(target.moveAccel, TOUR_ACCEL_MIN), TOUR_ACCEL_MAX) *
          ticks) /
        MU_SCALE;

      const toTargetX = target.x - follower.x;
      const toTargetY = target.y - follower.y;
      const toTarget = Math.hypot(toTargetX, toTargetY);
      const toOrigin = Math.hypot(origin.x - follower.x, origin.y - follower.y);

      // Reached: switch and move on within the same tick, as the original's
      // `continue` does.
      if (toTarget <= step) {
        targetIndex = (targetIndex + 1) % path.length;
        continue;
      }

      const forwardX = toTargetX / toTarget;
      const forwardY = toTargetY / toTarget;
      let tourX = forwardX;
      let tourY = forwardY;

      const blendWith = (dir: { x: number; y: number } | null, at: number) => {
        if (!dir) return;
        const rate = (at / TOUR_BLEND_DISTANCE) * 0.5 + 0.5;
        tourX = dir.x * (1 - rate) + forwardX * rate;
        tourY = dir.y * (1 - rate) + forwardY * rate;
        const length = Math.hypot(tourX, tourY) || 1;
        tourX /= length;
        tourY /= length;
      };

      if (toTarget <= TOUR_BLEND_DISTANCE) {
        blendWith(legInto(path, (targetIndex + 1) % path.length), toTarget);
      } else if (toOrigin <= TOUR_BLEND_DISTANCE) {
        blendWith(legInto(path, originIndex), toOrigin);
      }

      follower.x += forwardX * step;
      follower.y += forwardY * step;
      tour.x += tourX * step;
      tour.y += tourY * step;

      const last = trail[trail.length - 1];
      trail.push({ x: tour.x, y: tour.y, s: last.s + step });

      const span = toOrigin + toTarget;
      level =
        span > 0
          ? (origin.distanceLevel * toTarget + target.distanceLevel * toOrigin) /
            span
          : target.distanceLevel;
      break;
    }

    const distance = level * TOUR_DISTANCE_PER_LEVEL;

    const behind = { x: 0, y: 0 };
    trailPoint(distance, behind);

    const toTourX = tour.x - behind.x;
    const toTourY = tour.y - behind.y;
    if (Math.hypot(toTourX, toTourY) > 1e-3) {
      heading = Math.atan2(toTourY, toTourX);
    }

    const fx = Math.cos(heading);
    const fy = Math.sin(heading);

    eye.set(behind.x, TOUR_EYE_BASE + distance, behind.y);
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

      camera.setTarget(characterCameraTarget());
      camera.setPosition(CHARACTER_CAMERA_POSITION);
    },
  };
};
