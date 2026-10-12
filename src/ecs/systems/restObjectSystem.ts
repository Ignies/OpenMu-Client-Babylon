import {
  Matrix,
  PointerEventTypes,
  Ray,
  Vector3,
} from '../../controllers/render/babylon/exports';
import {
  PlayerAction,
  ServerPlayerActionType,
} from '@versions/shared/objects/enum';
import { resolveGenderedAction } from '../../controllers/anim/playerActionMapper';
import { TWFlags } from '../../controllers/terrain/consts';
import { devQuery } from '../../core/devSeams';
import {
  findRestObject,
  type RestKind,
} from '../../controllers/terrain/restObjects';
import { aimX, aimY } from '../../controllers/camera';
import { sound } from '../../controllers/sound';
import { Hero } from '../../modules/hero';
import { Session } from '../../modules/session';
import { mountKind } from '../../controllers/pets';
import { isOn } from '../../controllers/fidelity';
import { serverSetting } from '../../modules/servers/serverManifest';
import { hitWall, isRestWall, wallStand, type LocalBox, type WallStand } from '../../controllers/terrain/restWalls';
import { propLocalBox } from '../../controllers/render/propBatches';
import { placementMatrix } from '../../controllers/render/propBatchRules';
import type { Entity, ISystemFactory, World } from '../world';
import { isSliding } from './positionSlideSystem';

/** `?autoPick=1`: the old full scene pick, read only for its ray. */
const AUTO_POINTER_PICK = devQuery('autoPick') === '1';

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

/** A rest the hero walks to: the tile, the pose and the facing it ends in. */
export interface RestTarget {
  x: number;
  y: number;
  kind: RestKind;
  useObjectAngle: boolean;
  angle: number;
}

/**
 * `Action`'s MOVEMENT_OPERATE arrival (ZzzInterface.cpp:3447-3593): within a tile of the
 * target, a healing spot plays at once; a pose or seat first parks the server's walker on
 * the target tile with the new facing, and a seat is refused on a mount outside town.
 */
export function arriveAtRest(hero: NonNullable<World['playerEntity']>, done: RestTarget): void {
  const px = ~~hero.transform.pos.x;
  const py = ~~hero.transform.pos.z;
  if (Math.max(Math.abs(px - done.x), Math.abs(py - done.y)) > 1) return;

  if (done.useObjectAngle) hero.transform.rot.y = done.angle;

  if (done.kind !== 'healing') {
    if (!Session.isOffline) Hero.sendWalkStop(done.x, done.y, hero.transform.rot.y);
    const inSafeZone = hero.attributeSystem.isAboveZero('inSafeZone');
    if (done.kind === 'sit' && mountKind(hero.charAppearance?.pet, inSafeZone) !== null) return;
  }

  const isFemale = hero.attributeSystem.isAboveZero('isFemale');
  hero.playerAnimation.action = resolveGenderedAction(CLIENT_ACTION[done.kind], isFemale);

  if (!Session.isOffline) {
    Hero.sendAnimationRequest(rotationByte(hero.transform.rot.y), SERVER_ACTION[done.kind]);
  }

  if (done.kind !== 'healing') sound.play('Sound/pDropItem');
}

/** A map record a wall lean may pick. */
export type WallCandidate = Required<Pick<Entity, 'modelId' | 'transform' | 'worldIndex'>> & Pick<Entity, 'modelObject'>;

/** Tiles from the hero a clicked wall may stand. */
const WALL_REACH = 20;

const wallM = new Matrix();
const wallHit = new Vector3();
const wallStandOut: WallStand = { x: 0, y: 0, rotY: 0 };

/**
 * `restAnyWall`: the lean a click on a straight wall asks for - the nearest wall the
 * ray enters, the tile beside it and the facing away from it. Null on Classic and where the
 * world's `server.json` does not allow it (a lean grants OpenMU's resting regeneration).
 */
export function wallRestTarget(
  world: World,
  candidates: Iterable<WallCandidate>,
  ray: Ray,
  boxOf: (e: WallCandidate) => LocalBox | null
): RestTarget | null {
  if (!isOn('restAnyWall') || !serverSetting('restAnyWall')) return null;
  const hero = world.playerEntity;
  if (!hero) return null;
  const hx = hero.transform.pos.x;
  const hz = hero.transform.pos.z;

  let best: WallCandidate | null = null;
  let bestBox: LocalBox | null = null;
  let bestT = Number.POSITIVE_INFINITY;
  for (const e of candidates) {
    if (e.worldIndex !== world.mapIndex) continue;
    const pos = e.transform.pos;
    if (Math.abs(pos.x - hx) > WALL_REACH || Math.abs(pos.z - hz) > WALL_REACH) continue;
    if (findRestObject(world.mapIndex, e.modelId)) continue;
    const box = boxOf(e);
    if (!box || !isRestWall(box, e.transform.scale)) continue;
    const t = hitWall(box, placementMatrix(e.transform, wallM), ray.origin, ray.direction, wallHit);
    if (t >= 0 && t < bestT) {
      bestT = t;
      best = e;
      bestBox = box;
    }
  }
  if (!best || !bestBox) return null;

  hitWall(bestBox, placementMatrix(best.transform, wallM), ray.origin, ray.direction, wallHit);
  const walkable = (x: number, y: number) => world.isWalkable(x, y);
  if (!wallStand(bestBox, wallM, wallHit, hx, hz, walkable, wallStandOut)) return null;

  return { x: wallStandOut.x, y: wallStandOut.y, kind: 'pose', useObjectAngle: true, angle: wallStandOut.rotY };
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

  const tmpRay = new Ray(Vector3.Zero(), Vector3.Up(), Number.MAX_VALUE);
  const identity = Matrix.Identity();

  let pending: RestTarget | null = null;

  let clickedThisFrame = false;

  let issuedPoint: { x: number; y: number } | null = null;

  let currentMap: number | null = null;

  // Each map type's box, measured once its model (or batch) has loaded.
  const wallQuery = world.with('modelId', 'transform', 'worldIndex');
  const wallBoxes = new Map<number, LocalBox>();
  let wallBoxMap = -1;
  const boxMin = new Vector3();
  const boxMax = new Vector3();
  const wallBox = (e: WallCandidate): LocalBox | null => {
    if (wallBoxMap !== world.mapIndex) {
      wallBoxes.clear();
      wallBoxMap = world.mapIndex;
    }
    const known = wallBoxes.get(e.modelId);
    if (known) return known;
    if (!propLocalBox(world, e.modelId, e.modelObject, boxMin, boxMax)) return null;
    const box = { min: boxMin.clone(), max: boxMax.clone() };
    wallBoxes.set(e.modelId, box);
    return box;
  };

  scene.onPointerObservable.add(ev => {
    if (ev.type !== PointerEventTypes.POINTERDOWN) return;
    if (!world.playerEntity) return;
    // `MoveHero` returns while the server slides the hero in (`JumpTime > 0`): the click is lost.
    if (isSliding(world.playerEntity)) return;
    // Something selectable (NPC, monster, drop) under the cursor takes the
    // click; the bench / wall behind it must not steal it into a lean.
    if (world.currentPointerTarget) return;

    if (AUTO_POINTER_PICK) {
      const pickInfo = scene.pick(ev.event.clientX, ev.event.clientY);
      const ray = pickInfo.ray;
      if (!ray) return;

      tmpRay.origin.copyFrom(ray.origin);
      tmpRay.direction.copyFrom(ray.direction);
      tmpRay.length = ray.length;
    } else {
      // The ray scene.pick would return, without its walk over the terrain.
      // Aimed like the other picks: the crosshair under the pointer lock.
      scene.createPickingRayToRef(
        aimX(ev.event.clientX),
        aimY(ev.event.clientY),
        identity,
        tmpRay,
        null
      );
    }

    let restHit = false;
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

      restHit = true;
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
    if (restHit) return;

    const lean = wallRestTarget(world, wallQuery, tmpRay, wallBox);
    if (lean) {
      pending = lean;
      clickedThisFrame = true;
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
      // `MoveHero` waits out the server's slide (`JumpTime > 0`).
      if (isSliding(playerEntity)) return;

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

      const done = pending;
      pending = null;
      issuedPoint = null;

      arriveAtRest(playerEntity, done);
    },
  };
};
