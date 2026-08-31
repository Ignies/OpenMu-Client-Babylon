import { EventBus } from '../../libs/eventBus';
import type { Entity, ISystemFactory, World } from '../world';
import { isNpcOrTrapType } from './attackSystem';
import { Economy } from '../../economy';
import {
  bubbleLifetime,
  CHAT_LIFETIME,
  CUT_TEXT_LENGTH,
  cutText,
  ID_LIFE_CREATE,
  ID_LIFE_REFRESH,
  TICKS_PER_SECOND,
} from '../../common/nameTags';

/**
 * The original's name balloons - `CreateChat` / `AddChat` / `MoveChat`
 * (ZzzInterface.cpp:1091-1236) driven by `CNewUINameWindow::RenderName`
 * (NewUINameWindow.cpp:108-192):
 *
 * - While the cursor is on an NPC (`SelectedNpc`) or another player
 *   (`SelectedCharacter`, not a monster - those get the top HP bar instead,
 *   and never the hero: `SelectCharacter` skips it in the main scene), the
 *   name entry is created for 100 ticks, then refreshed to 10 each frame.
 * - ObjectMessage (`CreateChat(..., flag 0)`) puts a speech line under the
 *   name for `len * 2 + 160` ticks; ChatMessage (`AssignChat`, flag 1) for
 *   1000. A second line while one is up pushes the first up (Text[1]).
 * - Lifetimes count down by `FPS_ANIMATION_FACTOR` (1 per 25-fps frame); the
 *   entry goes when the name and both lines have run out, or the owner left.
 */
export const NameTagSystem: ISystemFactory = world => {
  const tags = world.with('nameTag');
  const named = world.with('objectNameInWorld', 'transform');

  const create = (entity: Entity, color: number) => {
    if (entity.nameTag) return entity.nameTag;
    world.addComponent(entity, 'nameTag', {
      idLife: 0,
      color,
      text: ['', ''],
      life: [0, 0],
    });
    return entity.nameTag!;
  };

  /** `CreateChat(c->ID, L"", c)`: show the name. */
  const showName = (entity: Entity) => {
    const existed = !!entity.nameTag;
    const tag = create(entity, nameColour(entity));
    tag.color = nameColour(entity);
    tag.idLife = existed ? ID_LIFE_REFRESH : ID_LIFE_CREATE;
  };

  /** `CreateChat` + `AddChat`: a chat line under the name. */
  const addChat = (entity: Entity, text: string, lifetime: number) => {
    const tag = create(entity, nameColour(entity));
    tag.color = nameColour(entity);
    // A line still showing is kept as the older, upper one.
    if (tag.life[0] > 0) {
      tag.text[1] = tag.text[0];
      tag.life[1] = tag.life[0];
    }
    if (text.length >= CUT_TEXT_LENGTH) {
      const [top, bottom] = cutText(text);
      tag.text[1] = top;
      tag.text[0] = bottom;
      tag.life[0] = lifetime;
      tag.life[1] = lifetime;
    } else {
      tag.text[0] = text;
      tag.life[0] = lifetime;
    }
  };

  const byNetId = (netId: number) => world.getByNetId(netId) ?? null;

  EventBus.on('objectMessage', ({ netId, message }) => {
    const entity = byNetId(netId);
    if (!entity || !entity.objectNameInWorld) return;
    addChat(entity, message, bubbleLifetime(message));
  });

  EventBus.on('chatMessage', ({ sender, message }) => {
    // `AssignChat`: players first, then monsters/NPCs, matched by name.
    const entity =
      named.entities.find(
        e => e.playerAnimation && e.objectNameInWorld === sender
      ) ?? named.entities.find(e => e.objectNameInWorld === sender);
    if (!entity) return;
    addChat(entity, message, CHAT_LIFETIME);
  });

  return {
    update: dt => {
      // `FPS_ANIMATION_FACTOR = clamp(fpsRatio, 0, 1)` (ZzzAI.cpp:730): a slow
      // frame never takes more than one tick off, or the per-frame hover
      // refresh of 10 could not keep a name alive.
      const ticks = Math.min(1, dt * TICKS_PER_SECOND);

      const hovered = world.currentPointerTarget;
      if (hovered && isBalloonTarget(world, hovered)) showName(hovered);

      // `CPersonalShopTitleImp::Draw`: a stall title is its own draw list in
      // the original, not the hover balloon - it stands over the seller for
      // as long as the stall is up, the hero's own included. Here it rides
      // on the balloon (buildLines swaps the guild lines for it the way
      // `IsShopInViewport` does), so the balloon is kept alive per frame.
      for (const netId of Economy.shopTitles.keys()) {
        const seller = byNetId(netId);
        if (seller && !seller.objOutOfScope && !seller.dying) showName(seller);
      }

      for (const entity of tags) {
        const tag = entity.nameTag!;
        if (tag.idLife > 0) tag.idLife -= ticks;
        if (tag.life[0] > 0) tag.life[0] -= ticks;
        if (tag.life[1] > 0) tag.life[1] -= ticks;

        // `MoveChat`: the owner is gone (out of scope or another map).
        const gone =
          entity.objOutOfScope ||
          (entity.worldIndex !== undefined &&
            entity.worldIndex !== world.mapIndex);

        if (gone || (tag.idLife <= 0 && tag.life[0] <= 0)) {
          world.removeComponent(entity, 'nameTag');
        }
      }
    },
  };
};

/** `Color = Owner->PK; if NPC Color = 0` (ZzzInterface.cpp:1097). */
function nameColour(entity: Entity): number {
  if (entity.npcType !== undefined) return 0;
  return entity.heroState ?? 3; // PVP_NEUTRAL until the server says otherwise
}

/**
 * SelectedNpc → any NPC; SelectedCharacter → players only (monsters get the
 * HP bar, NewUINameWindow.cpp:138), never the hero, never the dead.
 */
function isBalloonTarget(world: World, e: Entity): boolean {
  if (!e.objectNameInWorld || e.dying || e.droppedItem) return false;
  if (e.localPlayer) return false;
  if (e.playerAnimation) return true;
  const type = e.npcType;
  if (type === undefined) return false;
  if (type >= 100 && type <= 110) return false; // traps are KIND_TRAP
  return isNpcOrTrapType(type);
}
