import { PointerEventTypes } from '../../libs/babylon/exports';
import { Store } from '../../store';
import type { Entity, ISystemFactory } from '../world';

/**
 * MOVEMENT_GET (ZzzInterface.cpp:3543-3575): clicking a drop — its model or
 * its name label — walks the hero next to it (CheckTile 1.5 tiles) and only
 * then sends the pickup request. A ground click or another target cancels it.
 */

/** Chebyshev tile distance at which the hero reaches for the item. */
const PICKUP_RANGE = 1;
/** Seconds between path refreshes while approaching (the drop never moves). */
const APPROACH_INTERVAL = 0.4;

export const ItemPickupSystem: ISystemFactory = world => {
  world.scene.onPointerObservable.add(event => {
    if (event.type !== PointerEventTypes.POINTERDOWN) return;
    if (event.event.button !== 0) return;

    if (Store.pendingItemMove) return;

    const picked = Store.pickedItem;

    if (picked) {
      const pickInfo = world.scene.pick(
        event.event.clientX,
        event.event.clientY,
        m => m === world.terrain?.mesh,
        true
      );

      const point = pickInfo?.pickedPoint;
      if (!point) return;

      Store.dropPickedItem(~~point.x, ~~point.z);
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
      Store.pickupItemRequest(target.netId!);
    },
  };
};
