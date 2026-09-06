import {
  PointerEventTypes,
  type ArcRotateCamera,
} from '../../libs/babylon/exports';
import type { ISystemFactory, World } from '../world';
import { Store, UIState } from '../../store';
import { isMobileDevice } from '../../common/mobile';
import { MoveTargetEffect } from '../../common/moveTargetEffect';
import { GameOptions } from '../../common/gameOptions';
import { WALK_KEYS } from '../../common/keyBindings';
import { aimX, aimY } from '../../camera';

const MOVE_DELAY = 0.25;

/**
 * How far ahead a held walk key aims, in tiles. Long enough that the walk
 * never runs out of path between two re-issues, short enough that letting go
 * does not leave the server walking a route the hero abandoned.
 */
const WALK_AHEAD_TILES = 3;

/** Points left on the path when the next keyboard walk is asked for. */
const WALK_REISSUE_AT = 2;

/** Shortest gap between two keyboard walk requests, seconds. */
const WALK_REISSUE_SECONDS = 0.15;

const OCTANT = Math.PI / 4;

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
      aimX(lastClientX),
      aimY(lastClientY),
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

  /** The tile step the walk is currently aimed along; 0,0 when idle. */
  let walkStepX = 0;
  let walkStepY = 0;
  let walkDelay = 0;
  let walking = false;

  /** How many tiles of the straight run out of (x, y) are walkable, capped. */
  function walkableRun(
    x: number,
    y: number,
    stepX: number,
    stepY: number
  ): number {
    if (!stepX && !stepY) return 0;

    let steps = 0;

    while (
      steps < WALK_AHEAD_TILES &&
      world.isWalkable(x + stepX * (steps + 1), y + stepY * (steps + 1))
    ) {
      steps++;
    }

    return steps;
  }

  /**
   * Keys let go of: stop at the next tile instead of finishing the run the
   * walk was aimed at. The server keeps walking its own copy to the end of
   * the chunk it was sent and the next walk request re-anchors it there -
   * the same short overshoot a path truncated for an attack already leaves.
   */
  function stopWalking(playerEntity: World['playerEntity']): void {
    if (!walking) return;

    walking = false;
    walkStepX = 0;
    walkStepY = 0;

    const path = playerEntity?.pathfinding.path;
    if (path && path.length > 1) path.length = 1;
  }

  /**
   * Walk on the held W/A/S/D keys, camera-relative: forward is the way the
   * camera looks, flattened onto the ground. Returns whether a direction is
   * held - the click walk stands down while one is.
   *
   * The hero still walks the tile grid the server knows: the direction is
   * quantised to one of the eight tile steps and aimed a few tiles ahead, so
   * this produces ordinary walk requests and nothing downstream (pathfinding,
   * the network chunking, the walk speed) learns about the keyboard at all.
   */
  function keyboardWalk(dt: number): boolean {
    walkDelay = Math.max(0, walkDelay - dt);

    const playerEntity = world.playerEntity;
    const camera = scene.activeCamera as ArcRotateCamera | null;

    let forward = 0;
    let strafe = 0;

    if (
      GameOptions.wsadMovement &&
      playerEntity &&
      camera &&
      // Dead until the server respawns us, the same gate the click walk has.
      !playerEntity.dying &&
      Store.uiState === UIState.World
    ) {
      const keys = world.keyboardInput.pressedKeys;

      if (keys.has(WALK_KEYS.forward)) forward++;
      if (keys.has(WALK_KEYS.back)) forward--;
      if (keys.has(WALK_KEYS.right)) strafe++;
      if (keys.has(WALK_KEYS.left)) strafe--;
    }

    if ((!forward && !strafe) || !playerEntity || !camera) {
      stopWalking(playerEntity);
      return false;
    }

    // ArcRotateCamera sits at target + r * (cos a, _, sin a) * sin b, so the
    // way it looks, flattened, is -(cos a, sin a); right is cross(up,
    // forward) in Babylon's left-handed world.
    const lookX = -Math.cos(camera.alpha);
    const lookZ = -Math.sin(camera.alpha);

    const octant = Math.round(
      Math.atan2(
        forward * lookZ - strafe * lookX,
        forward * lookX + strafe * lookZ
      ) / OCTANT
    );

    let stepX = Math.round(Math.cos(octant * OCTANT));
    let stepY = Math.round(Math.sin(octant * OCTANT));

    const tileX = ~~playerEntity.transform.pos.x;
    const tileY = ~~playerEntity.transform.pos.z;

    let steps = walkableRun(tileX, tileY, stepX, stepY);

    // Nose against a wall: drop the blocked half of a diagonal and slide
    // along the other, rather than standing still against it.
    if (steps === 0 && stepX && stepY) {
      if (world.isWalkable(tileX + stepX, tileY)) stepY = 0;
      else if (world.isWalkable(tileX, tileY + stepY)) stepX = 0;

      steps = walkableRun(tileX, tileY, stepX, stepY);
    }

    if (steps === 0) {
      stopWalking(playerEntity);
      return true;
    }

    const path = playerEntity.pathfinding.path;
    const turned = stepX !== walkStepX || stepY !== walkStepY;
    const running = walking && !!path && path.length > WALK_REISSUE_AT;

    if (!turned && running) return true;
    // Turning under the mouse look would otherwise ask for a walk every
    // frame; the walk is aimed far enough ahead to sit out the wait.
    if (walkDelay > 0) return true;

    walkDelay = WALK_REISSUE_SECONDS;
    walkStepX = stepX;
    walkStepY = stepY;
    walking = true;

    const moveTo = playerEntity.playerMoveTo;

    moveTo.point.x = tileX + stepX * steps + 0.5;
    moveTo.point.y = tileY + stepY * steps + 0.5;
    moveTo.handled = false;
    moveTo.sendToServer = true;
    moveTo.silent = true;

    world.attackTarget = null;
    world.pickupTarget = null;
    world.talkTarget = null;

    return true;
  }

  return {
    update: dt => {
      delay -= dt;

      moveTarget.update(dt);

      const steering = keyboardWalk(dt);

      // A press that is still down repeats the walk on the throttle; a press
      // already released walks once. Either way the throttle holds - a tap
      // inside it waits its turn rather than being thrown away.
      if (steering) {
        // The keys steer; a click made while they are held is not a walk
        // waiting to happen once they are let go.
        pressPending = false;
      } else if (world.pointerPressed || pressPending) {
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

        const silent = playerMoveTo.silent === true;
        playerMoveTo.silent = false;

        pathfinding.calculated = false;

        pathfinding.from.x = transform.pos.x;
        pathfinding.from.y = transform.pos.z;

        pathfinding.to.x = ~~playerMoveTo.point.x;
        pathfinding.to.y = ~~playerMoveTo.point.y;

        if (localPlayer && !silent) {
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
