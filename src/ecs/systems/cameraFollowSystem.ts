import { Vector3, type ArcRotateCamera } from '../../libs/babylon/exports';
import type { ISystemFactory } from '../world';
import { Store, UIState } from '../../store';
import { installCameraControl, updateGameCamera } from '../../camera';

const v3Temp = Vector3.Zero();

export const CameraFollowSystem: ISystemFactory = world => {
  const scene = world.scene;

  // At factory time nothing has moved the camera yet, so the classic framing
  // the module captures is the constructor's.
  installCameraControl(
    scene.defaultCamera,
    () => Store.uiState === UIState.World
  );

  return {
    update: dt => {
      const camera = scene.activeCamera as ArcRotateCamera;

      if (!camera) return;

      const playerEntity = world.playerEntity;
      if (!playerEntity) return;

      v3Temp.copyFrom(playerEntity.transform.pos as any);

      const offset = playerEntity.transform.posOffset;
      if (offset !== undefined) {
        // Component-wise: posOffset may be a plain {x, y, z} (see renderSystem).
        v3Temp.x += offset.x;
        v3Temp.y += offset.y;
        v3Temp.z += offset.z;
      }

      camera.target.copyFrom(v3Temp);

      // The login/character screens keep their own camera (loginSceneSystem).
      if (Store.uiState !== UIState.World) return;

      updateGameCamera(
        camera,
        world.mapIndex,
        world.keyboardInput.pressedKeys,
        dt
      );
    },
  };
};
