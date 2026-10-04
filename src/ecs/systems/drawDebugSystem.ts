import { DEBUG_SHOW_BOUNDING_BOXES } from '../../app/consts';
import {
  CreateBox,
  Matrix,
  Quaternion,
  StandardMaterial,
  Vector3,
} from '../../controllers/render/babylon/exports';
import type { ISystemFactory } from '../world';

const vec3Tmp = new Vector3();
const qTmp = Quaternion.Identity();

export const DrawDebugSystem: ISystemFactory = world => {
  const boundingBoxQuery = world.with('transform', 'modelObject', 'visibility');

  const box = CreateBox(
    '__bb__',
    { width: 1, height: 1, depth: 1 },
    world.scene
  );
  box.setParent(world.mapParent);
  box.position.set(0, 0, 0);
  box.scaling.setAll(1);
  const boxMaterial = new StandardMaterial('__bb__mat', world.scene);
  boxMaterial.alpha = 0.6;
  boxMaterial.disableLighting = true;
  box.alwaysSelectAsActiveMesh = true;
  box.material = boxMaterial;
  box.thinInstanceEnablePicking = true;
  box.isPickable = true;
  box.setEnabled(DEBUG_SHOW_BOUNDING_BOXES);
  // box.showBoundingBox = true;

  let delay = 1;

  // world.scene.constantlyUpdateMeshUnderPointer = true;

  const cache = new Map<any, number>();

  return {
    update: dt => {
      // Debug-only: the bounds walk below is pure cost when the boxes are
      // not drawn.
      if (!DEBUG_SHOW_BOUNDING_BOXES) return;

      delay -= dt;
      if (delay > 0) return;
      delay = 0.1;

      for (const {
        transform,
        modelObject,
        visibility,
        attributeSystem,
      } of boundingBoxQuery) {
        if (!modelObject.Ready) continue;
        if (!attributeSystem) continue;
        if (visibility.state === 'hidden') continue;

        modelObject.UpdateBoundings();

        const bb = modelObject.BoundingBoxLocal;

        // console.log(bb);

        const size = bb.maximumWorld.subtractToRef(bb.minimumWorld, vec3Tmp);

        //size.scaleToRef(0.5, vec3Tmp2);
        const center = bb.maximumWorld.add(bb.minimumWorld).scaleInPlace(0.5); //bb.center.scaleToRef(0.01, vec3Tmp2);
        const pos = center;

        Quaternion.FromEulerAnglesToRef(
          transform.rot.x,
          transform.rot.y,
          transform.rot.z,
          qTmp
        );

        const m = Matrix.Compose(size, qTmp, pos);

        if (DEBUG_SHOW_BOUNDING_BOXES) {
          if (cache.has(transform)) {
            box.thinInstanceSetMatrixAt(cache.get(transform)!, m, false);
          } else {
            const ind = box.thinInstanceAdd(m, false);
            cache.set(transform, ind);
          }
        }
      }

      DEBUG_SHOW_BOUNDING_BOXES && box!.thinInstanceBufferUpdated('matrix');
    },
  };
};
