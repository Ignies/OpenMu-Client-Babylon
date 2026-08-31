import { Matrix, Vector2, Vector3 } from '../../libs/babylon/exports';
import {
  clearScreenPositionListeners,
  emitScreenPosition,
} from '../../libs/screenPositionBus';
import { Entity, ISystemFactory } from '../world';

const DIST = 10;

const DIST_SQUARED = DIST ** 2;

const ZERO_MATRIX = Matrix.Identity();

export const CalculateScreenPositionSystem: ISystemFactory = world => {
  const query = world.with('screenPosition', 'worldIndex', 'transform');

  const finalPosition = Vector3.Zero();
  const screenPosition = Vector3.Zero();
  const viewProjection = Matrix.Identity();

  const tmp1 = Vector3.Zero();
  const tmp2 = Vector3.Zero();
  const sidePosition = Vector3.Zero();
  const sideScreen = Vector3.Zero();

  const result = {
    entity: null as Entity | null,
    screenPosition: Vector2.Zero(),
  };

  const hiddenEntities = new Set<Entity>();

  query.onEntityRemoved.subscribe(e => {
    hiddenEntities.delete(e);
    clearScreenPositionListeners(e);
  });

  const scene = world.scene;

  const engine = scene.getEngine();

  return {
    update: () => {
      const terrain = world.terrain;
      if (!terrain) return;
      const playerEntity = world.playerEntity;

      if (!playerEntity) return;

      const camera = scene.activeCamera;
      if (!camera) return;

      const renderW = engine.getRenderWidth();
      const renderH = engine.getRenderHeight();
      camera.viewport.toGlobalToRef(renderW, renderH, world.viewport);

      // Project with the camera's *current* view matrix, not
      // `scene.getTransformMatrix()`, which is the matrix of the previous
      // `scene.render()` - a stale camera makes labels trail their owners.
      camera
        .getViewMatrix()
        .multiplyToRef(camera.getProjectionMatrix(), viewProjection);

      // Labels are CSS-positioned, so convert render pixels to CSS pixels
      // (device pixel ratio / hardware scaling).
      const canvas = engine.getRenderingCanvas();
      const cssW = canvas?.clientWidth || renderW;
      const cssH = canvas?.clientHeight || renderH;
      const ratioX = renderW / cssW;
      const ratioY = renderH / cssH;

      const mapParent = world.mapParent.position;

      const playerTransform = playerEntity.transform;
      tmp1.x = playerTransform.pos.x + (playerTransform.posOffset?.x ?? 0);
      tmp1.y = playerTransform.pos.y + (playerTransform.posOffset?.y ?? 0);
      tmp1.z = playerTransform.pos.z + (playerTransform.posOffset?.z ?? 0);

      query.entities.forEach(entity => {
        if (world.mapIndex !== entity.worldIndex) {
          if (!hiddenEntities.has(entity)) {
            hiddenEntities.add(entity);
            entity.screenPosition.x = entity.screenPosition.y = 0;
            result.screenPosition.copyFrom(entity.screenPosition);
            emitScreenPosition(entity, result.screenPosition);
          }
          return;
        }

        screenPosition.setAll(0);

        // Anchor at the rendered position: `transform.pos` is the tile
        // corner, `posOffset` centres characters on the tile (RenderSystem /
        // HeadTrackingSystem apply the same sum).
        const { pos, posOffset } = entity.transform;
        finalPosition.x = pos.x + (posOffset?.x ?? 0) + mapParent.x;
        finalPosition.y = pos.y + (posOffset?.y ?? 0) + mapParent.y;
        finalPosition.z = pos.z + (posOffset?.z ?? 0) + mapParent.z;

        tmp2.copyFrom(finalPosition);

        finalPosition.y += entity.screenPosition.worldOffsetZ;

        const distSquared = Vector3.DistanceSquared(tmp1, tmp2);

        if (distSquared < DIST_SQUARED) {
          Vector3.ProjectToRef(
            finalPosition,
            ZERO_MATRIX,
            viewProjection,
            world.viewport,
            screenPosition
          );
        }

        const scrPos = entity.screenPosition;

        scrPos.x = screenPosition.x / ratioX;
        scrPos.y = screenPosition.y / ratioY;

        // An emoji bubble hangs off its own world anchor (over the head, or
        // on the shoulder facing the camera — placed by EmojiBubbleSystem)
        // rather than off the balloon anchor above, so it gets its own
        // projection here, where the matrices and the ratios are to hand.
        const bubble = entity.emojiBubble;

        if (bubble) {
          sidePosition.x = bubble.anchor.x + mapParent.x;
          sidePosition.y = bubble.anchor.y + mapParent.y;
          sidePosition.z = bubble.anchor.z + mapParent.z;

          // Behind the camera the projection folds back onto the screen, so
          // test the clip-space w before trusting it.
          const m = viewProjection.m;
          const w =
            sidePosition.x * m[3] +
            sidePosition.y * m[7] +
            sidePosition.z * m[11] +
            m[15];

          if (w > 0) {
            Vector3.ProjectToRef(
              sidePosition,
              ZERO_MATRIX,
              viewProjection,
              world.viewport,
              sideScreen
            );

            bubble.screenX = sideScreen.x / ratioX;
            bubble.screenY = sideScreen.y / ratioY;
            bubble.onScreen = true;
          } else {
            bubble.onScreen = false;
          }
        }

        result.screenPosition.copyFrom(scrPos);

        const uiDistSqrt = scrPos.x * scrPos.x + scrPos.y * scrPos.y;

        const isHidden = uiDistSqrt < 0.1;

        if (isHidden) {
          if (!hiddenEntities.has(entity)) {
            hiddenEntities.add(entity);
            emitScreenPosition(entity, result.screenPosition);
          }

          return;
        }

        hiddenEntities.delete(entity);

        emitScreenPosition(entity, result.screenPosition);
      });
    },
  };
};
