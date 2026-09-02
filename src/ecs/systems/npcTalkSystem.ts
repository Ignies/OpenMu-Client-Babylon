import { PointerEventTypes } from '../../libs/babylon/exports';
import { Store } from '../../store';
import { events } from '../../events';
import type { Entity, ISystemFactory } from '../world';
import { isNpcOrTrapType } from './attackSystem';

/**
 * MOVEMENT_TALK (ZzzInterface.cpp:7681-7700, 3576-3620): clicking an NPC
 * walks the hero up to it and only then sends the talk request; the server
 * answers with the window to open (a merchant's stock, a vault, …). A ground
 * click or another target cancels the walk. Nothing is sent while a shop is
 * already open - the original ignores NPC clicks behind the shop window.
 */

/** Chebyshev tile distance at which the hero stops and talks. */
const TALK_RANGE = 2;
/** Seconds between path refreshes while approaching (NPCs barely move). */
const APPROACH_INTERVAL = 0.4;

/** Talkable NPC: a non-monster with a server id that is not a trap. */
export function isTalkableNpc(e: Entity): boolean {
  const type = e.npcType;
  if (type === undefined || e.netId === undefined || e.localPlayer) return false;
  if (type >= 100 && type <= 110) return false; // traps
  return isNpcOrTrapType(type);
}

const TERRAIN_MAX = 255;

/**
 * NPC cells are flagged non-walkable (their `TW_NOMOVE` footprint), so a path
 * to the NPC's own tile is empty and the hero would never arrive. Approach
 * the nearest walkable tile within TALK_RANGE of the NPC instead (the attack
 * approach cuts its path at weapon reach the same way, `truncatePathForAttack`).
 * `excluded` holds tiles a previous search could not reach.
 */
function findApproachTile(
  world: Parameters<ISystemFactory>[0],
  npcX: number,
  npcY: number,
  heroX: number,
  heroY: number,
  excluded: Set<number>
): { x: number; y: number } | null {
  let best: { x: number; y: number } | null = null;
  let bestDist = Infinity;
  for (let dx = -TALK_RANGE; dx <= TALK_RANGE; dx++) {
    for (let dy = -TALK_RANGE; dy <= TALK_RANGE; dy++) {
      const x = npcX + dx;
      const y = npcY + dy;
      if (x < 0 || y < 0 || x > TERRAIN_MAX || y > TERRAIN_MAX) continue;
      if (excluded.has(x * 256 + y)) continue;
      if (!world.isWalkable(x, y)) continue;
      const ex = x - heroX;
      const ey = y - heroY;
      const dist = ex * ex + ey * ey;
      if (dist < bestDist) {
        bestDist = dist;
        best = { x, y };
      }
    }
  }
  return best;
}

export const NpcTalkSystem: ISystemFactory = world => {
  world.scene.onPointerObservable.add(event => {
    if (event.type !== PointerEventTypes.POINTERDOWN) return;
    if (event.event.button !== 0) return;

    if (Store.pendingItemMove || Store.pickedItem) return;

    const target = world.currentPointerTarget;
    if (!target || !isTalkableNpc(target) || Store.npcShop) {
      // Clicking anything else (monster, drop, ground) gives up the talk.
      world.talkTarget = null;
      return;
    }

    world.talkTarget = target;
  });

  let approachDelay = 0;
  /** Tile requested by the last approach; cleared when the target changes. */
  let approachTile: { x: number; y: number } | null = null;
  let approachTarget: Entity | null = null;
  /** Approach tiles the pathfinder returned no path for (this target). */
  const unreachable = new Set<number>();

  function isStillThere(target: Entity): boolean {
    return (
      isTalkableNpc(target) &&
      !target.objOutOfScope &&
      target.worldIndex === world.mapIndex &&
      !!target.transform &&
      world.has(target)
    );
  }

  return {
    update: dt => {
      approachDelay -= dt;

      const target = world.talkTarget;
      if (!target) {
        approachTarget = null;
        return;
      }

      const playerEntity = world.playerEntity;
      if (!playerEntity || playerEntity.dying || !isStillThere(target)) {
        world.talkTarget = null;
        approachTarget = null;
        return;
      }

      if (approachTarget !== target) {
        approachTarget = target;
        approachTile = null;
        unreachable.clear();
        approachDelay = 0;
      }

      const playerPos = playerEntity.transform.pos;
      const targetPos = target.transform!.pos;
      const { pathfinding } = playerEntity;

      const heroX = ~~playerPos.x;
      const heroY = ~~playerPos.z;
      const npcX = ~~targetPos.x;
      const npcY = ~~targetPos.z;

      const dx = Math.abs(npcX - heroX);
      const dz = Math.abs(npcY - heroY);

      // Out of reach: walk to a tile next to the NPC. Already in reach (the
      // hero stands beside the NPC, or the path ended early inside the
      // range) falls through to the talk request without moving.
      if (Math.max(dx, dz) > TALK_RANGE) {
        // The A* (`libs/astar.ts`) never returns an empty path for an
        // unreachable goal: it hands back the path to the *closest* node. So
        // "unreachable" is a calculated path whose last node is not the tile
        // asked for (an empty path counts too) — a tile behind a merchant's
        // counter, say. Strike it and try the next-nearest at once; waiting
        // the approach interval here would leave the hero standing short of
        // the NPC for no reason.
        if (approachTile && pathfinding.calculated) {
          const path = pathfinding.path;
          const last = path && path.length > 0 ? path[path.length - 1] : null;
          const arrives =
            !!last && ~~last.x === approachTile.x && ~~last.y === approachTile.y;
          if (!arrives) {
            unreachable.add(approachTile.x * 256 + approachTile.y);
            approachTile = null;
            approachDelay = 0;
          }
        }

        if (approachDelay > 0) return;
        approachDelay = APPROACH_INTERVAL;

        const tile = findApproachTile(world, npcX, npcY, heroX, heroY, unreachable);
        if (!tile) {
          // No way to get next to the NPC (blocked in): give up like a
          // cancelled walk instead of re-requesting forever.
          world.talkTarget = null;
          approachTarget = null;
          return;
        }

        approachTile = tile;
        const moveTo = playerEntity.playerMoveTo;
        moveTo.point.x = tile.x + 0.5;
        moveTo.point.y = tile.y + 0.5;
        moveTo.handled = false;
        moveTo.sendToServer = true;
        return;
      }

      // In reach: stop (`SetPlayerStop`), face the NPC, and talk.
      if (pathfinding.path && pathfinding.path.length > 0) {
        pathfinding.path = null;
        pathfinding.from = { x: ~~playerPos.x, y: ~~playerPos.z };
        pathfinding.to = { x: ~~playerPos.x, y: ~~playerPos.z };
      }

      playerEntity.transform.rot.y =
        Math.atan2(targetPos.z - playerPos.z, targetPos.x - playerPos.x) +
        Math.PI / 2;

      world.talkTarget = null;
      const npc = {
        netId: target.netId!,
        name: target.objectNameInWorld ?? 'NPC',
        npcType: target.npcType!,
      };
      // An event NPC (the Crywolf statue) never opens a server window.
      if (events.useNpc(npc)) return;
      Store.talkToNpc(npc);
    },
  };
};
