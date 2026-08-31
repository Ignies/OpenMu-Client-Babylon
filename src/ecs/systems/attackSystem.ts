import type { Entity, ISystemFactory } from '../world';
import { Store } from '../../store';
import { applyPlayerActionSpeed, serverMinAttackInterval } from '../../common/playSpeed';
import { HitRequestPacket } from '../../common/packets/ClientToServerPackets';
import {
  MonsterActionType,
  ServerPlayerActionType,
} from '../../common/objects/enum';
import { TWFlags } from '../../common/terrain/consts';
import { isFlagInBinaryMask } from '../../common/utils';
import { chooseAttackAction } from '../../common/playerActionMapper';
import { combat } from '../../combat';
import { MOUSE_UPDATE_SECONDS_MAX } from '../../combat/inputGate';

/**
 * Left-click basic attack (`Action()` MOVEMENT_ATTACK, ZzzInterface.cpp:3283-3356):
 * walk into the weapon's reach, face the target, restart the swing clip and
 * latch the hit. Timing comes from the `combat` layer — the 0.24 s input
 * gate, the `AttackTime` latch that sends `HitRequest` at the clip's hit
 * key, the reach per weapon and the archer's ammunition check. This is
 * also the one place `combat.update` is stepped: it runs before
 * SkillCastSystem, so both read a fresh frame.
 */

/**
 * Cut an approach path at the first cell that is already within attack
 * range of the target. The walk request sent to the server must end where
 * the client actually stops: sending the full path to the monster's own
 * cell leaves the server walking the player onto the corpse, and the next
 * ObjectMoved correction then snaps the hero to the monster's position.
 */
export function truncatePathForAttack(
  path: { x: number; y: number }[],
  target: Entity
): void {
  const tx = ~~target.transform!.pos.x;
  const ty = ~~target.transform!.pos.z;
  const range = combat.attackRange(Store.world?.playerEntity?.charAppearance);
  const rangeSq = range * range;
  for (let i = 0; i < path.length; i++) {
    const dx = tx - path[i].x;
    const dy = ty - path[i].y;
    if (dx * dx + dy * dy <= rangeSq) {
      path.length = i + 1;
      return;
    }
  }
}

const APPROACH_INTERVAL = 0.4;

const NPC_TYPE_OVERRIDES = new Set([
  367, 368, 369, 370, 371, 375, 376, 377, 378, 379, 380, 381, 382, 383, 384,
  385, 406, 407, 408, 414, 415, 416, 417, 450, 452, 453, 464, 465, 467, 468,
  469, 470, 471, 472, 473, 474, 475, 478, 479, 492, 522, 540, 541, 542, 543,
  544, 545, 546, 547, 566, 568, 577, 578, 579,
]); // 566 Mercenary Guild Felicia, 568 Wandering Merchant Zyro (OpenMU NpcInitialization, PassiveNpc)

export function isNpcOrTrapType(type: number): boolean {
  if (type === 200) return false;
  if (type > 200 && type < 260) return true;
  if (type >= 480 && type <= 491) return false;
  if (NPC_TYPE_OVERRIDES.has(type)) return true;
  if (type >= 100 && type <= 110) return true;
  return false;
}

export function isAttackableEntity(
  world: Parameters<ISystemFactory>[0],
  e: Entity
): boolean {
  if (e.netId === undefined || e.localPlayer) return false;
  // `npcType` is what makes an entity a monster or an NPC: only the
  // AddNpcsToScope path sets it, so players never reach the type test below.
  // The animation component is deliberately not part of this: the player-rig
  // monsters (the Skeletons, Death King, Death Bone, the Cursed Wizard) drop
  // `monsterAnimation` in favour of `playerAnimation` when they load
  // (skeletonWarrior.ts), and requiring it here left them un-hoverable and
  // un-attackable - no attack cursor, no `attackTarget` on click.
  if (e.npcType === undefined) return false;
  if (e.objOutOfScope) return false;
  // A player-rig monster dies through `dying` / PLAYER_DIE1 instead.
  if (e.monsterAnimation?.action === MonsterActionType.Die || e.dying) return false;
  if (isNpcOrTrapType(e.npcType)) return false;

  const player = world.playerEntity;
  if (player?.attributeSystem.isAboveZero('inSafeZone')) return false;

  const flag = world.getTerrainFlag(~~e.transform!.pos.x, ~~e.transform!.pos.z);
  if (isFlagInBinaryMask(flag, TWFlags.SafeZone)) return false;

  return true;
}

function directionCode(dx: number, dy: number): number {
  const octant = Math.round(Math.atan2(dy, dx) / (Math.PI / 4));
  return (((3 + octant) % 8) + 8) % 8;
}

export const AttackSystem: ISystemFactory = world => {
  let attackCooldown = 0;
  let approachDelay = 0;
  let alternateSwing = false;

  return {
    update: dt => {
      // The one lifecycle call: every combat timer steps here, before any
      // fighting system reads it this frame.
      combat.update(world.mapIndex, dt);

      attackCooldown -= dt;
      approachDelay -= dt;

      const playerEntity = world.playerEntity;
      if (!playerEntity || playerEntity.dying) {
        combat.cancelAttack(); // Hero->Dead > 0: a swing in flight never lands
        return;
      }

      const target = world.attackTarget;
      if (!target) return;

      if (
        !isAttackableEntity(world, target) ||
        target.worldIndex !== world.mapIndex
      ) {
        world.attackTarget = null;
        return;
      }

      const hands = playerEntity.charAppearance;
      const playerPos = playerEntity.transform.pos;
      const targetPos = target.transform!.pos;

      // Tile distance, both sides truncated, like truncatePathForAttack.
      // Mixing the target's tile corner with the hero's float position
      // read "out of range" whenever the hero stood off-grid beside the
      // monster (the path is cleared mid-step on entering range), so the
      // approach branch ran instead of the facing/swing branch and the
      // hero stood shuffling with a stale walk yaw.
      const dx = ~~targetPos.x - ~~playerPos.x;
      const dz = ~~targetPos.z - ~~playerPos.z;
      const distSquared = dx * dx + dz * dz;
      const range = combat.attackRange(hands);

      // Face the target's live position, not its tile corner, and keep
      // facing it whenever the hero stands still — including the throttle
      // gaps of the approach walk while a swing clip is still finishing:
      // the original's CreateAngle (ZzzCharacter.cpp, AT_ATTACK*) works on
      // the objects' float positions, re-evaluated every frame while the
      // attack action plays. The old truncated tile delta degenerated to
      // atan2(0, 0) when the monster stepped onto the hero's tile and
      // skewed the yaw up to ~90° at melee distances; walking frames keep
      // the path facing (MoveAlongPathSystem), like the original's chase.
      const fdx = targetPos.x - playerPos.x;
      const fdz = targetPos.z - playerPos.z;
      const vel = playerEntity.movement?.velocity;
      const standing = !vel || (vel.x === 0 && vel.y === 0);
      if (standing && fdx * fdx + fdz * fdz > 1e-6) {
        playerEntity.transform.rot.y = Math.atan2(fdz, fdx) + Math.PI / 2;
      }

      if (distSquared > range * range) {
        if (approachDelay <= 0) {
          approachDelay = APPROACH_INTERVAL;
          const moveTo = playerEntity.playerMoveTo;
          moveTo.point.x = targetPos.x;
          moveTo.point.y = targetPos.z;
          moveTo.handled = false;
          moveTo.sendToServer = true;
        }
        return;
      }

      const { pathfinding } = playerEntity;
      if (pathfinding.path && pathfinding.path.length > 0) {
        pathfinding.path = null;
        pathfinding.from = { x: ~~playerPos.x, y: ~~playerPos.z };
        pathfinding.to = { x: ~~playerPos.x, y: ~~playerPos.z };
      }

      if (attackCooldown > 0 || !combat.inputGateOpen) return;

      // CheckArrow(): a bow without arrows / a crossbow without bolts does
      // not swing. The original tries ReloadArrow() from the inventory; we
      // drop the target and let the player equip ammunition.
      if (!combat.hasAmmo(hands)) {
        world.attackTarget = null;
        return;
      }

      const action = chooseAttackAction(hands, alternateSwing);
      const attackAnimation = alternateSwing
        ? ServerPlayerActionType.Attack2
        : ServerPlayerActionType.Attack1;
      const lookingDirection = directionCode(fdx, fdz);
      alternateSwing = !alternateSwing;

      const model = playerEntity.modelObject;
      if (model) applyPlayerActionSpeed(model, action, playerEntity.attributeSystem);
      if (model && playerEntity.playerAnimation.action === action) {
        // Same clip twice in a row: AnimationSystem would see no change, so
        // restart it explicitly.
        model.restartAction();
      }
      playerEntity.playerAnimation.action = action;

      // The blow lands at the clip's hit key: latch the HitRequest there. The
      // clip length is the fallback — the request never outlives the clip.
      const playSpeed = model?.AnimationSpeed ?? 0;
      const clipSeconds = model?.getActionDuration(action) || undefined;
      const hitDelay = combat.startAttack(action, playSpeed, () => {
        if (target.dying || target.objOutOfScope || target.netId === undefined) return;
        const packet = HitRequestPacket.createPacket();
        packet.TargetId = target.netId;
        packet.AttackAnimation = attackAnimation;
        packet.LookingDirection = lookingDirection;
        Store.sendToGS(packet.buffer);
      }, clipSeconds);
      combat.consumeInputGate();

      // MouseUpdateTimeMax (0.24 s), the hit key of this swing, and the
      // server's anti-speedhack interval — whichever is the latest.
      attackCooldown = Math.max(
        MOUSE_UPDATE_SECONDS_MAX,
        hitDelay,
        serverMinAttackInterval(playerEntity.attributeSystem?.getValue('attackSpeed') ?? 0)
      );
    },
  };
};
