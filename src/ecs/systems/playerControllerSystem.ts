import { PointerEventTypes } from '../../libs/babylon/exports';
import type { ISystemFactory } from '../world';
import { Store } from '../../store';
import { MoveTargetEffect } from '../../common/moveTargetEffect';

const MOVE_DELAY = 0.25;

export const PlayerControllerSystem: ISystemFactory = world => {
  const query = world.with('playerMoveTo', 'transform', 'pathfinding');

  const moveTarget = new MoveTargetEffect(world);

  const scene = world.scene;

  let lastClientX = 0;
  let lastClientY = 0;

  scene.onPointerObservable.add(ev => {
    if (ev.type === PointerEventTypes.POINTERMOVE) {
      lastClientX = ev.event.clientX;
      lastClientY = ev.event.clientY;
    }
  });

  let delay = MOVE_DELAY;
  function tryMove() {
    const playerEntity = world.playerEntity;
    if (!playerEntity) return;

    // Dead until the server respawns us (Hero->Dead in the original): no
    // walking and no new path, or the corpse strolls off with HP 0.
    if (playerEntity.dying) return;

    if (world.currentPointerTarget) return;

    if (Store.pickedItem) return;

    const pickInfo = scene.pick(
      lastClientX,
      lastClientY,
      m => m === world.terrain?.mesh,
      true
    );

    if (!pickInfo) return;

    const point = pickInfo.pickedPoint;

    if (!point) return;

    if (point.lengthSquared() < 0.01) return;

    const x = ~~point.x;
    const z = ~~point.z;

    if (!world.isWalkable(x, z)) return;

playerEntity.playerMoveTo.point.x = point.x;
    playerEntity.playerMoveTo.point.y = point.z;
    playerEntity.playerMoveTo.handled = false;
    playerEntity.playerMoveTo.sendToServer = true;

    world.attackTarget = null;
    world.pickupTarget = null;
    world.talkTarget = null;
  }

  return {
    update: dt => {
      delay -= dt;

      moveTarget.update(dt);

      if (world.pointerPressed) {
        if (delay <= 0) {
          delay = MOVE_DELAY;
          tryMove();
        }
      }

      for (const {
        playerMoveTo,
        transform,
        pathfinding,
        localPlayer,
      } of query) {
        if (playerMoveTo.handled) continue;

        playerMoveTo.handled = true;

        pathfinding.calculated = false;

        pathfinding.from.x = transform.pos.x;
        pathfinding.from.y = transform.pos.z;

        pathfinding.to.x = ~~playerMoveTo.point.x;
        pathfinding.to.y = ~~playerMoveTo.point.y;

        if (localPlayer) {
          moveTarget.spawn(
            playerMoveTo.point.x,
            world.getTerrainHeight(playerMoveTo.point.x, playerMoveTo.point.y),
            playerMoveTo.point.y,
            Math.PI * 2 - transform.rot.y
          );
        }
      }
    },
  };
};
