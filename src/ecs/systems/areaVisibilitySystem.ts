import { MapTileObject } from '../../common/mapTileObject';
import type { ModelObject } from '../../common/modelObject';
import type { TransformNode } from '../../libs/babylon/exports';
import { lookDirector } from '../../lighting/director';
import type { AreaRect } from '../../lighting/profiles';
import type { ISystemFactory } from '../world';

/**
 * A room owns its frame: while an area is active (the director publishes one
 * on tiers >= 1 only) every model outside the area's rect is disabled, and
 * re-enabled when the area changes or ends. A map object is judged once per
 * room by its world box, so a wall whose origin sits on the line stays with
 * the room it bounds; figures, drops and pets are judged every frame by
 * position. The terrain masks the ground with the same rect.
 */

/** A box this close to the rect touches it: the walls meet the floor exactly, the clutter outside does not. */
const TOUCH = 0.1;

export const AreaVisibilitySystem: ISystemFactory = world => {
  const query = world.with('transform', 'modelObject', 'worldIndex');

  /** Models disabled by this system. Weak: a model disposed at the visibility boundary needs no undo. */
  let hidden = new WeakSet<ModelObject>();
  /** Map objects already judged for the current rect. */
  let judged = new WeakSet<ModelObject>();
  let rectKey = '';

  const keyOf = (rect: AreaRect) =>
    `${rect.minX},${rect.minY},${rect.maxX},${rect.maxY}`;

  const setVisible = (mo: ModelObject, visible: boolean) => {
    if (mo instanceof MapTileObject) mo.setRoomVisible(visible);
    else mo.node.setEnabled(visible);
  };

  const restore = () => {
    for (const { modelObject } of query) {
      if (hidden.has(modelObject)) setVisible(modelObject, true);
    }
    hidden = new WeakSet();
    judged = new WeakSet();
  };

  /**
   * Whether the model's world box clears the rect; null when no mesh has
   * vertices. A model that streamed in while the room was active has never
   * been drawn, so its world matrices are forced before the bounds are read.
   */
  const boxOutside = (root: TransformNode, rect: AreaRect): boolean | null => {
    let minX = Infinity;
    let minZ = Infinity;
    let maxX = -Infinity;
    let maxZ = -Infinity;

    for (const mesh of root.getChildMeshes(false)) {
      if (mesh.getTotalVertices() === 0) continue;
      mesh.computeWorldMatrix(true);
      const box = mesh.getBoundingInfo().boundingBox;
      minX = Math.min(minX, box.minimumWorld.x);
      maxX = Math.max(maxX, box.maximumWorld.x);
      minZ = Math.min(minZ, box.minimumWorld.z);
      maxZ = Math.max(maxZ, box.maximumWorld.z);
    }

    if (minX === Infinity) return null;

    return (
      maxX + TOUCH < rect.minX ||
      minX - TOUCH > rect.maxX ||
      maxZ + TOUCH < rect.minY ||
      minZ - TOUCH > rect.maxY
    );
  };

  const pointOutside = (
    e: { transform: { pos: { x: number; z: number }; posOffset?: { x: number; z: number } } },
    rect: AreaRect
  ): boolean => {
    const { pos, posOffset } = e.transform;
    const x = pos.x + (posOffset?.x ?? 0);
    const z = pos.z + (posOffset?.z ?? 0);

    return x < rect.minX || x > rect.maxX || z < rect.minY || z > rect.maxY;
  };

  return {
    update: () => {
      const area = lookDirector()?.state().area ?? null;
      const key = area ? keyOf(area.rect) : '';

      if (key !== rectKey) {
        rectKey = key;
        restore();
      }

      if (!area) return;

      const { rect } = area;
      const map = world.mapIndex;
      const hero = world.playerEntity?.modelObject;

      for (const e of query) {
        const mo = e.modelObject;
        if (e.worldIndex !== map || mo === hero) continue;

        let outside: boolean;

        if (mo.IsMapObject) {
          if (judged.has(mo) || !mo.Ready) continue;
          // Effect-only objects carry no mesh: their emitter sits at the origin.
          const byBox = mo.gltf ? boxOutside(mo.gltf.mesh, rect) : pointOutside(e, rect);
          if (byBox === null) continue;
          judged.add(mo);
          outside = byBox;
        } else {
          outside = pointOutside(e, rect);
        }

        if (outside === hidden.has(mo)) continue;

        if (outside) hidden.add(mo);
        else hidden.delete(mo);
        setVisible(mo, !outside);
      }
    },
  };
};
