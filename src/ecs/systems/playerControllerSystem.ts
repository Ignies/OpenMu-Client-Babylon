import { PointerEventTypes } from '../../libs/babylon/exports';
import type { ISystemFactory } from '../world';
import { Store } from '../../store';
import { isMobileDevice } from '../../common/mobile';
import { MoveTargetEffect } from '../../common/moveTargetEffect';

const MOVE_DELAY = 0.25;

export const PlayerControllerSystem: ISystemFactory = world => {
  const query = world.with('playerMoveTo', 'transform', 'pathfinding');

  const moveTarget = new MoveTargetEffect(world);

  const scene = world.scene;

  let lastClientX = 0;
  let lastClientY = 0;
  /**
   * A press was seen and has not been walked on yet. The walk used to be
   * driven purely by polling `world.pointerPressed` once a frame, which can
   * only see a button that is still down when a frame runs: a measured touch
   * tap is held ~29 ms and no render tick observed it at all, so the tap was
   * dropped whole. Remembering the press instead makes it an edge, and the
   * poll below still repeats the walk for as long as the button stays down.
   */
  let pressPending = false;

  scene.onPointerObservable.add(ev => {
    // The press counts as well as the move: a touch tap fires POINTERDOWN and
    // POINTERUP with no POINTERMOVE between them, so on a phone this was the
    // only sample there ever was and `tryMove` picked against the screen
    // corner. A mouse always moves to where it clicks, so the down event
    // carries the coordinates the move already wrote.
    if (
      ev.type === PointerEventTypes.POINTERMOVE ||
      ev.type === PointerEventTypes.POINTERDOWN
    ) {
      lastClientX = ev.event.clientX;
      lastClientY = ev.event.clientY;
    }

    // Left button only, the same button `pointerInputSystem` walks on: the
    // middle one belongs to the camera and the right one casts.
    if (ev.type === PointerEventTypes.POINTERDOWN && ev.event.button === 0) {
      pressPending = true;
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
    // Touch only: a skill fired from the mobile pad leaves a cast standing
    // while the hero walks into range, the way a held right button does. With
    // no button to let go of, a tap on the ground is how it is called off. On
    // a mouse the right-drag repeat re-arms `castRequest` on every move event,
    // so clearing it there would fight the desktop repeat cast.
    if (isMobileDevice()) world.castRequest = null;
  }

  return {
    update: dt => {
      delay -= dt;

      moveTarget.update(dt);

      // A press that is still down repeats the walk on the throttle; a press
      // already released walks once. Either way the throttle holds - a tap
      // inside it waits its turn rather than being thrown away.
      if (world.pointerPressed || pressPending) {
        if (delay <= 0) {
          delay = MOVE_DELAY;
          pressPending = false;
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
