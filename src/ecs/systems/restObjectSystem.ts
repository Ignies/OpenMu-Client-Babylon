import {
  PointerEventTypes,
  Ray,
  Vector3,
} from '../../libs/babylon/exports';
import {
  PlayerAction,
  ServerPlayerActionType,
} from '../../common/objects/enum';
import { resolveGenderedAction } from '../../common/playerActionMapper';
import { TWFlags } from '../../common/terrain/consts';
import {
  findRestObject,
  type RestKind,
} from '../../libs/mu/restObjects';
import { sound } from '../../sound';
import { Store } from '../../store';
import type { ISystemFactory } from '../world';

const SERVER_ACTION: Record<RestKind, ServerPlayerActionType> = {
  sit: ServerPlayerActionType.Sit,
  pose: ServerPlayerActionType.Pose,
  healing: ServerPlayerActionType.Healing,
};

const CLIENT_ACTION: Record<RestKind, PlayerAction> = {
  sit: PlayerAction.PLAYER_SIT1,
  pose: PlayerAction.PLAYER_POSE1,
  healing: PlayerAction.PLAYER_HEALING1,
};

function rotationByte(rotYRadians: number): number {
  let deg = ((rotYRadians * 180) / Math.PI) % 360;
  if (deg < 0) deg += 360;

  return Math.floor(((deg + 22.5) / 360) * 8 + 1) % 8;
}

export const RestObjectSystem: ISystemFactory = world => {
  const scene = world.scene;

  const propsQuery = world.with(
    'modelObject',
    'transform',
    'visibility',
    'modelId',
    'worldIndex'
  );

  const tmpRay = new Ray(Vector3.Zero(), Vector3.Up(), 1);

  let pending: {
    x: number;
    y: number;
    kind: RestKind;
    useObjectAngle: boolean;
    angle: number;
  } | null = null;

  let clickedThisFrame = false;

  let issuedPoint: { x: number; y: number } | null = null;

  let currentMap: number | null = null;

  scene.onPointerObservable.add(ev => {
    if (ev.type !== PointerEventTypes.POINTERDOWN) return;
    if (!world.playerEntity) return;
    // Something selectable (NPC, monster, drop) under the cursor takes the
    // click; the bench / wall behind it must not steal it into a lean.
    if (world.currentPointerTarget) return;

    const pickInfo = scene.pick(ev.event.clientX, ev.event.clientY);
    const ray = pickInfo.ray;
    if (!ray) return;

    tmpRay.origin.copyFrom(ray.origin);
    tmpRay.direction.copyFrom(ray.direction);
    tmpRay.length = ray.length;

    for (const e of propsQuery) {
      if (e.worldIndex !== world.mapIndex) continue;
      if (e.visibility.state === 'hidden') continue;

      const rest = findRestObject(world.mapIndex, e.modelId);
      if (!rest) continue;

      if (!e.modelObject.Ready) continue;
      e.modelObject.UpdateBoundings();
      const bb = e.modelObject.BoundingBoxLocal;
      if (!tmpRay.intersectsBoxMinMax(bb.minimumWorld, bb.maximumWorld)) {
        continue;
      }

      const tileX = ~~e.transform.pos.x;
      const tileY = ~~e.transform.pos.z;

      const wall = world.getTerrainFlag(tileX, tileY);
      if (wall !== TWFlags.Height && wall >= TWFlags.Character) {
        pending = null;
        issuedPoint = null;
        break;
      }

      pending = {
        x: tileX,
        y: tileY,
        kind: rest.kind,
        useObjectAngle: rest.useObjectAngle,
        angle: e.transform.rot.y,
      };
      clickedThisFrame = true;
      break;
    }
  });

  return {
    update: () => {
      if (currentMap !== world.mapIndex) {
        currentMap = world.mapIndex;
        pending = null;
      }

      const playerEntity = world.playerEntity;
      if (!playerEntity) {
        pending = null;
        return;
      }

      if (!pending) return;

      const moveTo = playerEntity.playerMoveTo;

      if (clickedThisFrame) {
        clickedThisFrame = false;

        if (world.isWalkable(pending.x, pending.y)) {
          moveTo.point.x = pending.x;
          moveTo.point.y = pending.y;
          moveTo.handled = false;
          moveTo.sendToServer = true;

          const pathfinding = playerEntity.pathfinding;
          pathfinding.from.x = playerEntity.transform.pos.x;
          pathfinding.from.y = playerEntity.transform.pos.z;
          pathfinding.to.x = pending.x;
          pathfinding.to.y = pending.y;
          pathfinding.calculated = false;
        }
        issuedPoint = { x: moveTo.point.x, y: moveTo.point.y };
        return;
      }

      if (
        issuedPoint &&
        (moveTo.point.x !== issuedPoint.x || moveTo.point.y !== issuedPoint.y)
      ) {
        pending = null;
        issuedPoint = null;
        return;
      }

      if (!moveTo.handled) return;

      const pathfinding = playerEntity.pathfinding;
      if (
        !pathfinding.calculated ||
        (pathfinding.path && pathfinding.path.length > 0)
      ) {
        return;
      }

      const velocity = playerEntity.movement?.velocity;
      if (velocity && (velocity.x !== 0 || velocity.y !== 0)) return;

      const px = ~~playerEntity.transform.pos.x;
      const py = ~~playerEntity.transform.pos.z;

      const done = pending;
      pending = null;
      issuedPoint = null;

      if (Math.max(Math.abs(px - done.x), Math.abs(py - done.y)) > 1) return;

if (done.useObjectAngle) {
        playerEntity.transform.rot.y = done.angle;
      }

      const isFemale = playerEntity.attributeSystem.isAboveZero('isFemale');
      playerEntity.playerAnimation.action = resolveGenderedAction(
        CLIENT_ACTION[done.kind],
        isFemale
      );

      if (!Store.isOffline) {
        Store.sendAnimationRequest(
          rotationByte(playerEntity.transform.rot.y),
          SERVER_ACTION[done.kind]
        );
      }

      if (done.kind !== 'healing') {
        sound.play('Sound/pDropItem');
      }
    },
  };
};
