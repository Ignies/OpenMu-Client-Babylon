import type { ModelObject } from '../../common/modelObject';
import { lookDirector } from '../../lighting/director';
import type { AreaRect } from '../../lighting/profiles';
import type { ISystemFactory } from '../world';

/**
 * A room owns its frame: while an area is active (the director publishes one
 * on tiers >= 1 only) every model whose tile is outside the area's rect is
 * disabled, and re-enabled when the area changes or ends. Map objects never
 * move, so each is judged once per room; figures, drops and pets are judged
 * every frame. The terrain does the same for the ground (terrainMaterial's
 * roomRect), so the two seams share one rect.
 */
export const AreaVisibilitySystem: ISystemFactory = world => {
  const query = world.with('transform', 'modelObject', 'worldIndex');

  /** Models disabled by this system. Weak: a model disposed at the visibility boundary needs no undo. */
  let hidden = new WeakSet<ModelObject>();
  /** Map objects already judged for the current rect. */
  let judged = new WeakSet<ModelObject>();
  let rectKey = '';

  const keyOf = (rect: AreaRect) =>
    `${rect.minX},${rect.minY},${rect.maxX},${rect.maxY}`;

  const restore = () => {
    for (const { modelObject } of query) {
      if (hidden.has(modelObject)) modelObject.node.setEnabled(true);
    }
    hidden = new WeakSet();
    judged = new WeakSet();
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
        if (mo.IsMapObject) {
          if (judged.has(mo)) continue;
          judged.add(mo);
        }

        const { pos, posOffset } = e.transform;
        const x = pos.x + (posOffset?.x ?? 0);
        const z = pos.z + (posOffset?.z ?? 0);
        const outside =
          x < rect.minX || x > rect.maxX || z < rect.minY || z > rect.maxY;

        if (outside === hidden.has(mo)) continue;

        if (outside) hidden.add(mo);
        else hidden.delete(mo);
        mo.node.setEnabled(!outside);
      }
    },
  };
};
