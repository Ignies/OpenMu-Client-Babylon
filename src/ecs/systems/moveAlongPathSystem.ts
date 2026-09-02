import { TILE_CM, TWFlags } from '../../common/terrain/consts';
import { isFlagInBinaryMask } from '../../common/utils';
import { InventoryConstants } from '../../common/inventoryConstants';
import { Store } from '../../store';
import { BaseClass, getBaseClass } from '../../common/characterStats';
import { isSwimWorld } from '../../common/locomotion';
import { isFastWing } from '../../common/wings';
import { isRidingMount } from '../../common/pets';
import type { Entity, ISystemFactory } from '../world';

/**
 * OpenMU walks every object by wall-clock time: each step takes
 * `100 * tileDistance / movementSpeed * 40 ms` (PlayerMovement.GetStepDelay),
 * i.e. `movementSpeed / 4` tiles per second. The speed is 12 while walking
 * (safe zone, or no running gear) and the MovementSpeed attribute otherwise —
 * 15 with boots of level >= 5 or wings (MovementSpeedConstants). The client
 * has to cover the same distance in the same time, otherwise the next
 * WalkRequest's source tile drifts away from the server's position and the
 * server rubber-bands us (`Resynchronizing client`, tolerance 5 tiles).
 */
const WALK_MOVEMENT_SPEED = 12;
const RUNNING_GEAR_MOVEMENT_SPEED = 15;
const RUNNING_GEAR_MINIMUM_LEVEL = 5;
const REFERENCE_FRAME_SECONDS = 0.04;

/** Tiles per second the server expects for `movementSpeed`. */
function tilesPerSecond(movementSpeed: number): number {
  return movementSpeed / (TILE_CM * REFERENCE_FRAME_SECONDS);
}

/** OpenMU `MovementSpeedConstants`: wings / mounts, and the classes that run natively. */
const DEFAULT_WING_MOVEMENT_SPEED = 15;
const FAST_WING_MOVEMENT_SPEED = 16;
const BASIC_MOUNT_MOVEMENT_SPEED = 15;
const HORSE_OR_FENRIR_MOVEMENT_SPEED = 17;
const DARK_HORSE = 4;
const HORN_OF_FENRIR = 37;

/**
 * `Stats.MovementSpeed` (or `MovementSpeedUnderwater` in a swim world) as
 * OpenMU aggregates it (AggregateType.Maximum) from the class and the gear:
 *  - Dark Lord, Magic Gladiator and Rage Fighter carry 15 as a base value
 *    (ClassDarkLord.cs:128, ClassMagicGladiator.cs:130, ClassRageFighter.cs:100),
 *  - boots of level >= 5 give 15 (gloves >= 5 underwater instead),
 *  - wings 15, Wings of Dragon / Wing of Storm 16,
 *  - Uniria / Dinorant 15, Dark Horse / Fenrir 17 (the upgraded-Fenrir
 *    combination bonuses are not modelled).
 * Without any of these the server walks at 12 even while the client plays the
 * run clip — OpenMU has no free run for the Dark Knight.
 */
function runningMovementSpeed(entity: Entity, world: number): number {
  const items = Store.playerData.items;
  const app = entity.charAppearance;
  const local = !!entity.localPlayer;
  const boots = local ? items[InventoryConstants.BootsSlot] : app?.boots;
  const gloves = local ? items[InventoryConstants.GlovesSlot] : app?.gloves;
  const wings = local ? items[InventoryConstants.WingsSlot] : app?.wings;
  const pet = local ? items[InventoryConstants.PetSlot] : app?.pet;
  const cls = local ? Store.playerData.charClass : app?.charClass;

  let speed = 0;
  if (cls !== undefined) {
    const base = getBaseClass(cls);
    if (base === BaseClass.DarkLord || base === BaseClass.MagicGladiator || base === BaseClass.RageFighter) {
      speed = RUNNING_GEAR_MOVEMENT_SPEED;
    }
  }
  const gear = isSwimWorld(world) ? gloves : boots;
  if (gear && (gear.lvl ?? 0) >= RUNNING_GEAR_MINIMUM_LEVEL) {
    speed = Math.max(speed, RUNNING_GEAR_MOVEMENT_SPEED);
  }
  if (wings) {
    speed = Math.max(speed, isFastWing(wings) ? FAST_WING_MOVEMENT_SPEED : DEFAULT_WING_MOVEMENT_SPEED);
  }
  if (pet) {
    // Horse and Fenrir first: both count as riding mounts, at 17 not 15.
    if (pet.num === DARK_HORSE || pet.num === HORN_OF_FENRIR) speed = Math.max(speed, HORSE_OR_FENRIR_MOVEMENT_SPEED);
    else if (isRidingMount(pet)) speed = Math.max(speed, BASIC_MOUNT_MOVEMENT_SPEED);
  }
  return speed;
}

/** `PlayerMovement.GetClientMovementSpeed` for player entities. */
function playerTilesPerSecond(entity: Entity, inSafeZone: boolean, world: number): number {
  if (inSafeZone) return tilesPerSecond(WALK_MOVEMENT_SPEED);
  return tilesPerSecond(
    Math.max(WALK_MOVEMENT_SPEED, runningMovementSpeed(entity, world))
  );
}

/**
 * Longest wall-clock gap a walker is allowed to catch up on at once. A
 * WalkRequest carries at most 15 steps (~5 s), so anything longer is a stall
 * the server has long finished walking for us; ObjectMoved fixes the rest.
 */
const MAX_WALK_CATCH_UP_SECONDS = 6;

export const MoveAlongPathSystem: ISystemFactory = world => {
  const query = world.with('transform', 'pathfinding', 'movement');

  let lastTick = performance.now();

  return {
    update: () => {
      // The render loop clamps its delta to 100 ms (MAX_FRAME_DELTA) so
      // effects never skip ahead; walkers must not inherit that clamp — the
      // server keeps stepping at wall-clock pace while we render at 3 fps in
      // a background tab, and every lost frame became a tile of desync.
      const now = performance.now();
      const deltaTime = Math.min(
        (now - lastTick) / 1000,
        MAX_WALK_CATCH_UP_SECONDS
      );
      lastTick = now;

      for (const entity of query) {
        const { pathfinding, transform, movement, localPlayer, attributeSystem } =
          entity;

        if (localPlayer) {
          // Both setters are MobX actions: writing an unchanged value still
          // runs the action (and its reaction pass) every frame, so only the
          // tile the hero stands on — not its float position — is mirrored,
          // and only when it moved.
          const tileX = ~~transform.pos.x;
          const tileY = ~~transform.pos.z;
          const playerData = Store.playerData;
          if (playerData.x !== tileX || playerData.y !== tileY) {
            playerData.setPosition(tileX, tileY);
          }

          const flag = world.getTerrainFlag(tileX, tileY);
          if (playerData.tileFlag !== flag) playerData.setTileFlag(flag);
        }

        let speed: number;
        if (entity.playerAnimation || localPlayer) {
          // OpenMU's SafezoneMap is the terrain's SafeZone flag at the
          // player's current (integer) position.
          const flag = world.getTerrainFlag(
            Math.round(transform.pos.x),
            Math.round(transform.pos.z)
          );
          speed = playerTilesPerSecond(
            entity,
            isFlagInBinaryMask(flag, TWFlags.SafeZone),
            world.mapIndex
          );
        } else {
          // getValue() materialises a 0-valued element for unknown
          // attributes, so guard with hasAttribute: a 0 speed silently
          // freezes the walker.
          speed = attributeSystem?.hasAttribute('totalMovementSpeed')
            ? attributeSystem.getValue('totalMovementSpeed')
            : 4;
        }
        let deltaSpeed = speed * deltaTime;

        if (
          !pathfinding.path ||
          pathfinding.path.length === 0 ||
          !pathfinding.calculated
        ) {
          movement.velocity.x = 0;
          movement.velocity.y = 0;

          continue;
        }

        while (deltaSpeed > 0 && pathfinding.path.length > 0) {
          let nextPoint = pathfinding.path[0];
          let dx = nextPoint.x - transform.pos.x;
          let dy = nextPoint.y - transform.pos.z;
          const distance = Math.sqrt(dx * dx + dy * dy);

          const deltaDistance = Math.min(deltaSpeed, distance);
          deltaSpeed -= deltaDistance;

          if (deltaDistance === distance) {
            pathfinding.path.shift();

            if (distance < 0.00001) continue;
          }

          movement.velocity.x = (dx / distance) * speed;
          movement.velocity.y = (dy / distance) * speed;

          const deltaX = (dx / distance) * deltaDistance;
          const deltaY = (dy / distance) * deltaDistance;

          transform.pos.x += deltaX;
          transform.pos.z += deltaY;

          if (world.terrain) {
            // RequestTerrainHeight is bilinear at the float position
            // (ZzzLodTerrain.cpp:825-839, ZzzCharacter.cpp:6265) — the
            // previous 4 integer samples averaged with fixed weights made
            // characters float/sink on slopes.
            transform.pos.y = world.getTerrainHeight(
              transform.pos.x,
              transform.pos.z
            );

            if (attributeSystem) {
              const flag = world.getTerrainFlag(
                ~~transform.pos.x,
                ~~transform.pos.z
              );
              attributeSystem.setValue(
                'inSafeZone',
                isFlagInBinaryMask(flag, TWFlags.SafeZone) ? 1 : 0
              );
            }
          }

          transform.rot.y =
            Math.atan2(movement.velocity.y, movement.velocity.x) + Math.PI / 2;
        }
      }
    },
  };
};
