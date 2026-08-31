import {
  HEAD_ANCHOR_HEIGHT_RATIO,
  SIDE_ANCHOR_DISTANCE,
  SIDE_ANCHOR_HEIGHT_RATIO,
  emojiBubbleById,
  type EmojiBubbleId,
} from '../../common/emojiBubbles';
import type { Entity, ISystemFactory, World } from '../world';

/**
 * Owns the lifetime of every emoji bubble and its world anchor.
 *
 * The side anchor has to sit on whichever shoulder currently points at the
 * camera and swap across when the character turns around. The character's
 * side axis is the local +X of its rendered node: `RenderSystem` gives the
 * node a Y rotation of `2π − yaw` (`toRenderAngles`), and Babylon's
 * left-handed `RotationY(θ)` sends local +X to `(cos θ, 0, −sin θ)`, so with
 * θ = 2π − yaw that axis is `(cos yaw, 0, sin yaw)`.
 *
 * Which of the two shoulders is "facing the camera" is then just the sign
 * that puts the anchor on the camera's side of the spine — so the anatomical
 * polarity of the axis never has to be worked out, and the same code is
 * correct for players, NPCs and monsters alike.
 *
 * This runs before `CalculateScreenPositionSystem`, which projects `anchor`
 * with the same view-projection it uses for the name balloons.
 */

/** Bubbles never outlive this, whatever a definition asks for. */
const MAX_LIFE = 10;

let serial = 0;

export function startEmojiBubble(
  world: World,
  entity: Entity,
  id: EmojiBubbleId
): void {
  const def = emojiBubbleById(id);
  const duration = Math.min(def.duration, MAX_LIFE);

  // Replace rather than mutate in place: the overlay keys its element off the
  // component's presence and serial, so a re-trigger has to look like a fresh
  // component for the glyph to change and the pop-in to replay.
  if (entity.emojiBubble) world.removeComponent(entity, 'emojiBubble');

  world.addComponent(entity, 'emojiBubble', {
    id,
    life: duration,
    duration,
    serial: ++serial,
    isSide: def.placement === 'side',
    anchor: { x: 0, y: 0, z: 0 },
    screenX: 0,
    screenY: 0,
    onScreen: false,
  });
}

export const EmojiBubbleSystem: ISystemFactory = world => {
  const query = world.with('emojiBubble', 'transform');

  const expired: Entity[] = [];

  return {
    update: dt => {
      const request = world.emojiRequest;

      if (request) {
        world.emojiRequest = null;

        const hero = world.playerEntity;
        if (hero) startEmojiBubble(world, hero, request);
      }

      const camera = world.scene.activeCamera;
      const camPos = camera?.globalPosition;

      expired.length = 0;

      for (const entity of query) {
        const bubble = entity.emojiBubble;

        bubble.life -= dt;

        if (bubble.life <= 0) {
          expired.push(entity);
          continue;
        }

        const { transform } = entity;
        const offset = transform.posOffset;

        const baseX = transform.pos.x + (offset?.x ?? 0);
        const baseY = transform.pos.y + (offset?.y ?? 0);
        const baseZ = transform.pos.z + (offset?.z ?? 0);

        const balloonHeight = entity.screenPosition?.worldOffsetZ ?? 0;

        if (!bubble.isSide) {
          bubble.anchor.x = baseX;
          bubble.anchor.y = baseY + balloonHeight * HEAD_ANCHOR_HEIGHT_RATIO;
          bubble.anchor.z = baseZ;
          continue;
        }

        // Horizontal axis perpendicular to the character's facing.
        const yaw = transform.visualRotY ?? transform.rot.y;
        let sideX = Math.cos(yaw);
        let sideZ = Math.sin(yaw);

        // Flip to the shoulder on the camera's side of the spine.
        if (camPos) {
          const toCameraX = camPos.x - baseX;
          const toCameraZ = camPos.z - baseZ;

          if (sideX * toCameraX + sideZ * toCameraZ < 0) {
            sideX = -sideX;
            sideZ = -sideZ;
          }
        }

        const reach = SIDE_ANCHOR_DISTANCE * (transform.scale || 1);

        bubble.anchor.x = baseX + sideX * reach;
        bubble.anchor.y = baseY + balloonHeight * SIDE_ANCHOR_HEIGHT_RATIO;
        bubble.anchor.z = baseZ + sideZ * reach;
      }

      for (const entity of expired) {
        world.removeComponent(entity, 'emojiBubble');
      }
    },
  };
};
