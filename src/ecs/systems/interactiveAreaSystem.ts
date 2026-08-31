import type { ISystemFactory } from '../world';
import { Vector3 } from '../../libs/babylon/exports';

const v3Temp = Vector3.Zero();

export const InteractiveAreaSystem: ISystemFactory = world => {
  const query = world.with('interactiveArea', 'worldIndex');

  return {
    update: () => {
      const playerEntity = world.playerEntity;
      if (!playerEntity) return;

      v3Temp.copyFrom(playerEntity.transform.pos as any);

      if (playerEntity.transform.posOffset !== undefined) {
        v3Temp.addInPlace(playerEntity.transform.posOffset as any);
      }

      for (const e of query) {
        if (e.worldIndex !== playerEntity.worldIndex) continue;

        const { min, max } = e.interactiveArea;

        const old = !!e.interactiveArea.inside;
        const newInside =
          v3Temp.x >= min.x &&
          v3Temp.x <= max.x &&
          v3Temp.z >= min.y &&
          v3Temp.z <= max.y;

        e.interactiveArea.inside = newInside;

        if (old !== newInside) {
          if (newInside) {
            e.interactiveArea.onEnter?.();
          } else {
            e.interactiveArea.onLeave?.();
          }
        }
      }
    },
  };
};
