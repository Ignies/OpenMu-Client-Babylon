import { PointerEventTypes } from '../../controllers/render/babylon/exports';
import { Bag } from '../../modules/inventory';
import { Drops } from '../../modules/drops';
import { QuickItemActions } from '../../modules/inventory/quickItemActions';
import { pickGround } from '../../controllers/terrain/terrainPick';
import { bottomBarScreenHeight } from '../../controllers/interface/components/mu_window';
import { EventBus } from '../../core/eventBus';
import type { Entity, ISystemFactory, World } from '../world';

/**
 * MOVEMENT_GET (ZzzInterface.cpp:3543-3575): clicking a drop - its model or
 * its name label - walks the hero next to it (CheckTile 1.5 tiles) and only
 * then sends the pickup request. A ground click or another target cancels it.
 */

/** Chebyshev tile distance at which the hero reaches for the item. */
const PICKUP_RANGE = 1;
/** Seconds between path refreshes while approaching (the drop never moves). */
const APPROACH_INTERVAL = 0.4;
/** `AutoGetItem`'s reach: under 300 units, three tiles (NewUIHotKey.cpp:472). */
const AUTO_GET_RANGE = 3;

/**
 * `CNewUIHotKey::AutoGetItem` (NewUIHotKey.cpp:455-490): the first live, drawn item under three
 * tiles from the hero, in the client's own order (not the nearest), becomes the MOVEMENT_GET
 * target. True when one did.
 */
export function autoGetItem(world: World): boolean {
  const hero = world.playerEntity?.transform?.pos;
  if (!hero) return false;
  for (const e of world.netObjsQuery.entities) {
    if (!e.droppedItem || e.objOutOfScope || e.visibility?.state !== 'visible') continue;
    if (e.worldIndex !== undefined && e.worldIndex !== world.mapIndex) continue;
    const p = e.transform.pos;
    if (Math.hypot(p.x - hero.x, p.y - hero.y, p.z - hero.z) < AUTO_GET_RANGE) {
      world.pickupTarget = e;
      return true;
    }
  }
  return false;
}

export const ItemPickupSystem: ISystemFactory = world => {
  // Space (NewUIHotKey.cpp:150): no carried item, the pointer off the bottom bar; a focused field
  // never broadcasts the key (keyboardInputSystem.ts).
  let pointerY = -1;
  // No window under the tests' node.
  if (typeof window !== 'undefined') {
    window.addEventListener('pointermove', e => (pointerY = e.clientY), { passive: true });
  }
  EventBus.on('keyPressed', code => {
    if (code !== 'Space' || Bag.pickedItem) return;
    if (pointerY >= window.innerHeight - bottomBarScreenHeight()) return;
    autoGetItem(world);
  });

  world.scene.onPointerObservable.add(event => {
    if (event.type !== PointerEventTypes.POINTERDOWN) return;
    if (event.event.button !== 0) return;

    if (Bag.pendingItemMove) return;

    const picked = Bag.pickedItem;

    if (picked) {
      const point = pickGround(world, event.event.clientX, event.event.clientY);
      if (!point) return;

      QuickItemActions.dropPickedItem(~~point.x, ~~point.z);
      return;
    }

    const target = world.currentPointerTarget;
    if (!target?.droppedItem) {
      // Clicking anything else (monster, NPC, ground) gives up the pickup.
      world.pickupTarget = null;
      return;
    }

    world.pickupTarget = target;
  });

  let approachDelay = 0;

  function isStillOnGround(target: Entity): boolean {
    return (
      !!target.droppedItem &&
      target.netId !== undefined &&
      !target.objOutOfScope &&
      target.worldIndex === world.mapIndex &&
      !!target.transform &&
      world.has(target)
    );
  }

  return {
    update: dt => {
      approachDelay -= dt;

      const target = world.pickupTarget;
      if (!target) return;

      const playerEntity = world.playerEntity;
      if (!playerEntity || playerEntity.dying || !isStillOnGround(target)) {
        world.pickupTarget = null;
        return;
      }

      const playerPos = playerEntity.transform.pos;
      const targetPos = target.transform!.pos;

      const dx = Math.abs(~~targetPos.x - ~~playerPos.x);
      const dz = Math.abs(~~targetPos.z - ~~playerPos.z);

      if (Math.max(dx, dz) > PICKUP_RANGE) {
        if (approachDelay <= 0) {
          approachDelay = APPROACH_INTERVAL;
          const moveTo = playerEntity.playerMoveTo;
          moveTo.point.x = targetPos.x;
          moveTo.point.y = targetPos.z;
          moveTo.handled = false;
          moveTo.sendToServer = true;
        }
        return;
      }

      // In reach: stop walking and ask for the item.
      const { pathfinding } = playerEntity;
      if (pathfinding.path && pathfinding.path.length > 0) {
        pathfinding.path = null;
        pathfinding.from = { x: ~~playerPos.x, y: ~~playerPos.z };
        pathfinding.to = { x: ~~playerPos.x, y: ~~playerPos.z };
      }

      world.pickupTarget = null;
      if (target.droppedItem) target.droppedItem.pickupAsked = true;
      Drops.pickupItemRequest(target.netId!);
    },
  };
};
