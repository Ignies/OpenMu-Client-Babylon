import {
  CHAT_EMOJI_BUBBLE_SECONDS,
  type ChatEmojiBubble,
} from '../../features/chat/chatEmojis';
import {
  HEAD_ANCHOR_HEIGHT_RATIO,
  SIDE_ANCHOR_DISTANCE,
  SIDE_ANCHOR_HEIGHT_RATIO,
  emojiBubbleById,
  type EmojiBubbleId,
} from '../../features/chat/emojiBubbles';
import type { Entity, ISystemFactory, World } from '../world';

/**
 * Owns the lifetime of every emoji bubble and its world anchor; runs before
 * `CalculateScreenPositionSystem`, which projects it. See ecs/readme.md.
 */

/** Bubbles never outlive this, whatever a definition asks for. */
const MAX_LIFE = 10;

let serial = 0;

export function startEmojiBubble(
  world: World,
  entity: Entity,
  what: EmojiBubbleId | ChatEmojiBubble
): void {
  const def = typeof what === 'string' ? emojiBubbleById(what) : null;
  const chat = typeof what === 'string' ? null : what;
  const glyph = chat && typeof chat.emoji === 'string' ? chat.emoji : null;
  const duration = Math.min(def?.duration ?? CHAT_EMOJI_BUBBLE_SECONDS, MAX_LIFE);

  // Replace rather than mutate in place: the overlay keys its element off the
  // component's presence and serial, so a re-trigger has to look like a fresh
  // component for the glyph to change and the pop-in to replay.
  if (entity.emojiBubble) world.removeComponent(entity, 'emojiBubble');

  world.addComponent(entity, 'emojiBubble', {
    id: def?.id ?? null,
    picture: chat && typeof chat.emoji !== 'string' ? chat.emoji.url : null,
    glyph,
    life: duration,
    duration,
    serial: ++serial,
    isSide: def?.placement === 'side',
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
