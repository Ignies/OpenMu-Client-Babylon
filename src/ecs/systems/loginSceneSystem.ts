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

const MU_SCALE = 100;

const REFERENCE_FPS = 25;

const speedFor = (waypoint: CameraWaypoint) =>
  (waypoint.moveAccel * REFERENCE_FPS) / MU_SCALE;

const TOUR_RADIUS_SCALE = 1.1;

const TOUR_FOV = (65 * Math.PI) / 180;

function backdropFor(uiState: UIState): ENUM_WORLD | null {
  switch (uiState) {
    // The start menu sits on the same scene the server list does: the original
    // never shows a bare screen, and this is the map the next click needs
    // anyway, so loading it here costs nothing later.
    case UIState.Preloader:
    case UIState.Servers:
    case UIState.Login:
      return ENUM_WORLD.WD_73NEW_LOGIN_SCENE;
    case UIState.Characters:
      return ENUM_WORLD.WD_74NEW_CHARACTER_SCENE;
    default:
      return null;
  }
}

export const LoginSceneSystem: ISystemFactory = world => {
  let requestedBackdrop: ENUM_WORLD | null = null;

  let waypoints: CameraWaypoint[] | null = null;
  let scriptForWorld: number | null = null;

  let leg = 0;
  let legProgress = 0;

  const target = new Vector3(0, 0, 0);

  let gameFraming: {
    alpha: number;
    beta: number;
    radius: number;
    fov: number;
  } | null = null;
  let cameraIsOurs = false;

  const resetTour = () => {
    leg = 0;
    legProgress = 0;
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

    target.x = x;
    target.z = y;
    target.y = world.getTerrainHeight(x, y) + a.height / MU_SCALE;

    const heading = Math.atan2(b.y - a.y, b.x - a.x);
    const radius =
      (a.distanceLevel + (b.distanceLevel - a.distanceLevel) * legProgress) *
      TOUR_RADIUS_SCALE;

    return { heading, radius };
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

      const backdrop = backdropFor(Store.uiState);

      if (backdrop === null) {
        requestedBackdrop = null;

        if (cameraIsOurs) {
          camera.alpha = gameFraming.alpha;
          camera.beta = gameFraming.beta;
          camera.radius = gameFraming.radius;
          camera.fov = gameFraming.fov;
          cameraIsOurs = false;
        }

        return;
      }

      if (requestedBackdrop !== backdrop) {
        requestedBackdrop = backdrop;
        resetTour();
        waypoints = null;
        scriptForWorld = null;
        EventBus.emit('requestWarp', { map: backdrop });
        return;
      }

      if (world.mapIndex !== backdrop || !world.terrain) return;

      if (backdrop === ENUM_WORLD.WD_73NEW_LOGIN_SCENE) {
        prefetchWorldTerrain(ENUM_WORLD.WD_74NEW_CHARACTER_SCENE);
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
        const { heading, radius } = advanceTour(deltaTime, waypoints);

        camera.setTarget(target);
        camera.fov = TOUR_FOV;
        camera.alpha = heading + Math.PI;
        camera.beta = gameFraming.beta;
        camera.radius = radius;
        return;
      }

      camera.fov = gameFraming.fov;

      camera.setTarget(characterCameraTarget());
      camera.setPosition(CHARACTER_CAMERA_POSITION);
    },
  };
};
