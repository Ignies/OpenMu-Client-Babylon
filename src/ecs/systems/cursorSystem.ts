import {
  Matrix,
  PointerEventTypes,
  Ray,
  Vector3,
} from '../../libs/babylon/exports';
import { TWFlags } from '../../common/terrain/consts';
import { isFlagInBinaryMask } from '../../common/utils';
import { aimX, aimY } from '../../camera';
import { LEAN_CURSOR_OBJECTS, findRestObject } from '../../libs/mu/restObjects';
import { Store } from '../../store';
import type { CursorHover } from '../../ui/components/gameCursor/cursors';
import type { Entity, ISystemFactory, World } from '../world';
import { isAttackableEntity, isNpcOrTrapType } from './attackSystem';

const SAMPLE_INTERVAL = 0.05;


function isNpcEntity(e: Entity): boolean {
  const type = e.npcType;

  if (type === undefined) return false;
  if (type >= 100 && type <= 110) return false;
  return isNpcOrTrapType(type);
}

function isDontMoveTile(world: World, x: number, y: number): boolean {
  const flag = world.getTerrainFlag(x, y);

  if (flag < TWFlags.NoGround) return false;
  if (isFlagInBinaryMask(flag, TWFlags.Action)) return false;
  if (isFlagInBinaryMask(flag, TWFlags.Height)) return false;

  return true;
}

export const CursorSystem: ISystemFactory = world => {
  const scene = world.scene;

  const propsQuery = world.with(
    'modelObject',
    'transform',
    'visibility',
    'modelId',
    'worldIndex'
  );

  const tmpRay = new Ray(Vector3.Zero(), Vector3.Up(), 1);

  const identity = Matrix.Identity();

  let lastClientX = 0;
  let lastClientY = 0;

  scene.onPointerObservable.add(ev => {
    if (ev.type !== PointerEventTypes.POINTERMOVE) return;

    lastClientX = ev.event.clientX;
    lastClientY = ev.event.clientY;
  });

  function hoveredRestObject(): CursorHover | null {
    scene.createPickingRayToRef(
      aimX(lastClientX),
      aimY(lastClientY),
      identity,
      tmpRay,
      null
    );

    for (const e of propsQuery) {
      if (e.worldIndex !== world.mapIndex) continue;
      if (e.visibility.state === 'hidden') continue;
      if (!findRestObject(world.mapIndex, e.modelId)) continue;
      if (!e.modelObject.Ready) continue;

      e.modelObject.UpdateBoundings();
      const bb = e.modelObject.BoundingBoxLocal;

      if (!tmpRay.intersectsBoxMinMax(bb.minimumWorld, bb.maximumWorld)) {
        continue;
      }

      return LEAN_CURSOR_OBJECTS[world.mapIndex]?.has(e.modelId)
        ? 'lean'
        : 'sit';
    }

    return null;
  }

  function resolveHover(): CursorHover | null {
    const target = world.currentPointerTarget;

    if (target) {
      if (target.droppedItem) return Store.pickedItem ? null : 'get';
      if (isNpcEntity(target)) return 'talk';
      if (isAttackableEntity(world, target)) return 'attack';

      return null;
    }

    return hoveredRestObject();
  }

  let delay = 0;

  return {
    update: dt => {
      delay -= dt;
      if (delay > 0) return;
      delay = SAMPLE_INTERVAL;

      world.cursorHover = resolveHover();

      if (!world.pointerPressed) return;

      const pickInfo = scene.pick(
        aimX(lastClientX),
        aimY(lastClientY),
        m => m === world.terrain?.mesh,
        true
      );

      const point = pickInfo?.pickedPoint;

      world.cursorBlocked = point
        ? isDontMoveTile(world, ~~point.x, ~~point.z)
        : false;
    },
  };
};
