import { Vector3, type ArcRotateCamera } from '../../libs/babylon/exports';
import type { ISystemFactory } from '../world';

const v3Temp = Vector3.Zero();

export const CameraFollowSystem: ISystemFactory = world => {
  const scene = world.scene;

  return {
    update: () => {
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
    },
  };
};
