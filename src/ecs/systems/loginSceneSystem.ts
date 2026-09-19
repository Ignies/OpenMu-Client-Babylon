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

const speedFor = (waypoint: CameraWaypoint) =>
  (waypoint.moveAccel * REFERENCE_FPS) / MU_SCALE;

/**
 * The tour camera, `CalculateCameraPosition` (CameraUtility.cpp:113-173) in
 * tour mode. The eye is `CameraPosition` itself - the view is a rotate and a
 * translate, no orbit - trailing the path point by `1100 * level * 0.1` MU
 * and standing at `kTourCameraZPosition` (-300) - 100 + distance - 150: head
 * height on the corridor legs, 1.6 units over the floor at level 8. The
 * original also adds `-0.924 * distance * cos(heading)` to that height
 * (`VectorIRotate` of the pitched angle matrix), which puts the camera six
 * units under the floor on the two north-bound legs of World74; that term is
 * left out and the head height kept on every leg.
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
 * `UpdateTourWayPoint` (CameraMove.cpp:757-770): the heading turns toward the
 * leg's direction by a thirtieth of what is left, at most one degree, per
 * 25 Hz tick.
 */
const TOUR_TURN_SHARE = 1 / 30;
const TOUR_TURN_MAX = Math.PI / 180;

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

  let leg = 0;
  let legProgress = 0;
  let heading = 0;
  let headingSet = false;

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
    leg = 0;
    legProgress = 0;
    headingSet = false;
  };

  const turnToward = (goal: number, deltaTime: number) => {
    if (!headingSet) {
      heading = goal;
      headingSet = true;
      return;
    }

    const delta = Math.atan2(Math.sin(goal - heading), Math.cos(goal - heading));
    const step =
      Math.min(Math.abs(delta) * TOUR_TURN_SHARE, TOUR_TURN_MAX) *
      REFERENCE_FPS *
      deltaTime;

    heading =
      Math.abs(delta) <= step ? goal : heading + Math.sign(delta) * step;
  };

  EventBus.on('warpCompleted', resetTour);

  const advanceTour = (deltaTime: number, path: CameraWaypoint[]) => {
    const from = path[leg];
    const to = path[(leg + 1) % path.length];

    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const legLength = Math.hypot(dx, dy) || 1;

    legProgress += (speedFor(from) * deltaTime) / legLength;

    while (legProgress >= 1) {
      legProgress -= 1;
      leg = (leg + 1) % path.length;
    }

    const a = path[leg];
    const b = path[(leg + 1) % path.length];

    const x = a.x + (b.x - a.x) * legProgress;
    const y = a.y + (b.y - a.y) * legProgress;

    turnToward(Math.atan2(b.y - a.y, b.x - a.x), deltaTime);

    const level =
      a.distanceLevel + (b.distanceLevel - a.distanceLevel) * legProgress;
    const distance = level * TOUR_DISTANCE_PER_LEVEL;

    const fx = Math.cos(heading);
    const fy = Math.sin(heading);

    eye.set(x - fx * distance, TOUR_EYE_BASE + distance, y - fy * distance);
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
