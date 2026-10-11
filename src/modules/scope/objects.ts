// Objects in the hero's view: building an NPC or monster, keeping one that entered mid-walk walking,
// removing one, and the names drawn for players and summons. Other modules' handlers reuse them.
import { appearSound } from '@/controllers/sound/packetSounds';
import { Entity, World } from '@/ecs/world';
import { MonsterActionType } from '@versions/shared/objects/enum';
import { Ecs } from '@/ecs/current';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { createAttributeSystem } from '@/core/attributeSystem';
import { convertDirectionToAngle } from '@/core/turnAngle';
import { isFemaleClass } from '@/controllers/actors/mapPlayerNetClassToModelClass';
import { isKnownObjectType, npcSpawnScale, resolveModelFactory } from '@/controllers/actors/modelFactoryPerId';
import { npcClassOf, npcHeroStateOf } from '@/controllers/actors/playerObject';
import { monsterDisplayName, monsterMaxHealth } from '@versions/shared/monsters/monstersDatabase';
import { playSfx } from '@/controllers/sound/sfx';
import { clearBuffVisuals } from '@versions/shared/skills/skillVisuals';

/** MoveSpeed 10 x REFERENCE_FPS 25 / 100 units per tile (ZzzCharacter.cpp:11530). */
const MONSTER_WALK_TILES_PER_SECOND = 2.5;

type ScopeNpc = {
  Id: number;
  TypeNumber: number;
  CurrentPositionX: number;
  CurrentPositionY: number;
  TargetPositionX: number;
  TargetPositionY: number;
  Rotation: number;
  /** AddSummonedMonstersToScope only: name of the summoning player. */
  OwnerCharacterName?: string;
};

/**
 * Keep an object that entered scope mid-walk walking.
 *
 * Every scope packet carries the walk target next to the current position:
 * OpenMU writes `WalkTarget` while the object `IsWalking` and repeats the
 * current position otherwise (NewPlayersInScopePlugIn / NewNpcsInScopePlugIn).
 * The walk itself started before we could see it, so no ObjectWalked follows
 * and the object would stand on the tile it entered on until it walks again,
 * while everyone already in the room watches it walk on. The original client
 * does the same here (`PathFinding2(c->PositionX, c->PositionY,
 * Data->TargetX, Data->TargetY)`, WSclient.cpp:2278).
 */
export function resumeWalkIntoScope(
  entity: Entity,
  currentX: number,
  currentY: number,
  targetX: number,
  targetY: number
): void {
  if (targetX === currentX && targetY === currentY) return;

  const moveTo = entity.playerMoveTo;
  if (!moveTo) return;

  moveTo.point.x = targetX;
  moveTo.point.y = targetY;
  moveTo.handled = false;
}

export function addNpcToScope(world: World, npc: ScopeNpc) {
  const id = npc.Id & 0x7fff;

  removeNetObject(world, id);

  if (!isKnownObjectType(npc.TypeNumber)) {
    console.warn(
      `No model mapping for NPC type ${npc.TypeNumber} (${
        monsterDisplayName(npc.TypeNumber, 'unnamed')
      }). Falling back to the Bull Fighter, as the original's default: arm does.`
    );
  }

  const modelFactory = resolveModelFactory(npc.TypeNumber);
  const owner = npc.OwnerCharacterName;

  const npcEntity = world.add({
    netId: id,
    worldIndex: world.mapIndex,
    npcType: npc.TypeNumber,
    transform: {
      pos: new Vector3(
        npc.CurrentPositionX,
        world.getTerrainHeight(npc.CurrentPositionX, npc.CurrentPositionY),
        npc.CurrentPositionY
      ),
      rot: new Vector3(0, convertDirectionToAngle(npc.Rotation), 0),
      scale: npcSpawnScale(modelFactory, npc.TypeNumber, world.mapIndex),
    },
    modelFactory,
    pathfinding: {
      from: { x: 0, y: 0 },
      to: { x: 0, y: 0 },
      path: [],
      calculated: true,
    },
    playerMoveTo: {
      point: { x: 0, y: 0 },
      handled: true as boolean,
    },
    movement: {
      velocity: { x: 0, y: 0 },
    },
    monsterAnimation: {
      action: MonsterActionType.Stop1,
    },
    attributeSystem: createAttributeSystem(),
    visibility: {
      lastChecked: 0,
      state: 'hidden',
    },
    screenPosition: {
      worldOffsetZ: 2.5,
      x: 0,
      y: 0,
    },
    objectNameInWorld: owner
      ? summonDisplayName(npc.TypeNumber, owner)
      : monsterDisplayName(npc.TypeNumber, 'NPC'),
    interactable: true,
  });

  if (owner) world.addComponent(npcEntity, 'summonedBy', owner);
  // `c->PK` of an outlaw NPC: the render system draws its body red (ZzzCharacter.cpp:9988-9991).
  const heroState = npcHeroStateOf(modelFactory);
  if (heroState !== null) world.addComponent(npcEntity, 'heroState', heroState);

  // 0x8000 is the original's CreateFlag (WSclient.cpp:3023-3026, :3111-3123). OpenMU also sets it
  // for a monster walking into a watched bucket (ObserverToWorldViewAdapter.cs:65), which replays it.
  const appear = npc.Id & 0x8000 ? appearSound(npc.TypeNumber, owner !== undefined) : undefined;
  if (appear) playSfx(appear.key, npcEntity.transform.pos, appear.opts);

  // Player-rig NPCs (the Elf Soldier, the guards) carry a class; monsters
  // do not. Hard-zeroing isFemale here made every one of them animate male.
  const npcClass = npcClassOf(modelFactory);
  npcEntity.attributeSystem.setValue(
    'isFemale',
    npcClass !== null && isFemaleClass(npcClass) ? 1 : 0
  );
  npcEntity.attributeSystem.setValue('isFlying', 0);
  // Original: every character starts with MoveSpeed = 10 units per 25-fps
  // frame (ZzzCharacter.cpp:11530, MoveCharacterPosition:6259) and monsters
  // never change it -> 10 * 25 / 100 = 2.5 tiles/s. The server sends no
  // monster speed; without this the attribute reads 0 and the walk stalls.
  npcEntity.attributeSystem.setValue(
    'totalMovementSpeed',
    MONSTER_WALK_TILES_PER_SECOND
  );

  // Nothing on the wire carries a monster's health, so the bar measures the
  // damage it sees against this. 0 for a type no table knows: the bar stays
  // off rather than showing a full one that never moves.
  const monsterHP = monsterMaxHealth(npc.TypeNumber);
  npcEntity.attributeSystem.setValue('maxHealth', monsterHP);
  npcEntity.attributeSystem.setValue('currentHealth', monsterHP);

  resumeWalkIntoScope(
    npcEntity,
    npc.CurrentPositionX,
    npc.CurrentPositionY,
    npc.TargetPositionX,
    npc.TargetPositionY
  );
  return npcEntity;
}

export function removeNetObject(world: World, netId: number) {
  // The index holds the newest entity for an id; a stale one that shared it
  // surfaces again once the newer entry is gone, so loop until none is left.
  for (let entity = world.getByNetId(netId); entity; entity = world.getByNetId(netId)) {
    // Its buff looks go with it (UnRegisterBuff per buff, WSclient.cpp:3175-3180).
    clearBuffVisuals(entity);
    world.remove(entity);
    entity.onDispose?.();
    entity.modelObject?.dispose();
  }
}

/** Name of a player in scope by net id, for the invite prompts. */
export function playerNameById(netId: number): string {
  const obj = Ecs.world?.getByNetId(netId);
  return obj?.objectNameInWorld ?? `#${netId}`;
}

/** A killed monster keeps its corpse pose until it is despawned; late packets must not revive it. */
/** c->Dead > 0: killed (possibly still waiting for the Die clip) or dead. */
export function isDeadMonster(obj: Entity): boolean {
  return !!obj.dying || obj.monsterAnimation?.action === MonsterActionType.Die;
}

/**
 * ReceiveCreateSummonViewport (WSclient.cpp:2718-2727): the tag is the
 * monster name plus "Of" + owner (GlobalText 485); the Castle Siege
 * gates/statues (types 152-158) keep their plain name.
 */
export function summonDisplayName(type: number, owner: string): string {
  const base = monsterDisplayName(type, 'NPC');
  if (type >= 152 && type <= 158) return base;
  return `${base} of ${owner}`;
}
