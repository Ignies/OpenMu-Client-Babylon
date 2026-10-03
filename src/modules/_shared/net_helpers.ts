// Helpers more than one feature net uses.
import { clipCastSound, hasClipSound, playCombat } from '@/controllers/sound/combat';
import { type AttackPose } from '@/controllers/actors/weaponClass';
import { CharacterClassNumber } from '@/core/types';
import { Entity, World } from '@/ecs/world';
import { KEEP_CLIP, isMonsterSwingClip, monsterAreaCast, monsterAttackState, monsterCast, monsterCastAttacks, monsterCastRewinds, playableMonsterClip, type MonsterAttackInput } from '@/controllers/anim/monsterAttackClip';
import { METEORITE_STORM, appearSound, meteoriteStormRunning, monsterCastQuiet, trapAttackSound } from '@/controllers/sound/packetSounds';
import { MonsterActionType, PlayerAction } from '@versions/shared/objects/enum';

import { Store } from '@/app/store';
import { TRAP_MODEL_TABLE } from '@/controllers/actors';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { advancesSwordCount, chooseSkillAction } from '../skills/skillCasting';
import { createAttributeSystem } from '@/core/attributeSystem';
import { getBaseClass } from '../hero/characterStats';
import { isFemaleClass } from '@/controllers/actors/mapPlayerNetClassToModelClass';
import { isKnownObjectType, npcSpawnScale, resolveModelFactory } from '@/controllers/actors/modelFactoryPerId';
import { isPlayerBody, npcClassOf, npcHeroStateOf } from '@/controllers/actors/playerObject';
import { isWingItem } from '@/controllers/actors/wings';
import { monsterDisplayName, monsterMaxHealth } from '@versions/shared/monsters/monstersDatabase';
import { monsterModelTypeOf } from '@/controllers/anim/playSpeed';
import { mountKind } from '../pets/pets';
import { playSfx } from '@/controllers/sound/sfx';
import { playSkill } from '@/controllers/sound';
import { setBuffVisual } from '@versions/shared/skills/skillVisuals';
import { castQuietOn, othersSeeClip, skillClip } from '@/controllers/combat/skillClips';
import { skillDefinition } from '@versions/shared/skills/skillsDatabase';
import { EventBus } from '@/core/eventBus';
import type { Events } from '@/core/eventBus/events';

/** MoveSpeed 10 x REFERENCE_FPS 25 / 100 units per tile (ZzzCharacter.cpp:11530). */
const MONSTER_WALK_TILES_PER_SECOND = 2.5;

export function convertDirectionToAngle(direction: number): number {
  return (direction * Math.PI) / 4 - Math.PI / 4;
}

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
    world.remove(entity);
    entity.onDispose?.();
    entity.modelObject?.dispose();
  }
}

/** Name of a player in scope by net id, for the invite prompts. */
export function playerNameById(netId: number): string {
  const obj = Store.world?.getByNetId(netId);
  return obj?.objectNameInWorld ?? `#${netId}`;
}

/** A killed monster keeps its corpse pose until it is despawned; late packets must not revive it. */
/** c->Dead > 0: killed (possibly still waiting for the Die clip) or dead. */
export function isDeadMonster(obj: Entity): boolean {
  return !!obj.dying || obj.monsterAnimation?.action === MonsterActionType.Die;
}

/**
 * What `SetPlayerAttack` reads off a character in scope. The hero builds the
 * same thing in AttackSystem; everyone else gets it here, so the swing a
 * player sees on his own screen is the swing his neighbours see.
 */
export function attackPoseOf(obj: Entity): AttackPose {
  const hands = obj.charAppearance;
  const inSafeZone = !!obj.attributeSystem?.isAboveZero('inSafeZone');
  return {
    hands,
    baseClass: getBaseClass(hands?.charClass ?? Store.playerData.charClass),
    swordCount: obj.playerAnimation?.swordCount ?? 0,
    wings: isWingItem(hands?.wings),
    mount: mountKind(hands?.pet, inSafeZone),
  };
}

/** `c->MonsterIndex`: a transformed player answers to the monster it wears. */
export function monsterNumberOf(obj: Entity): number {
  return obj.npcType ?? obj.skin ?? -1;
}

const monsterAttackInput: MonsterAttackInput = {
  world: 0,
  monster: -1,
  model: -1,
  trapObject: undefined,
  random: Math.random,
  now: 0,
};

/** What the monster attack hooks read off a character, in one reused record. */
export function attackInputOf(obj: Entity): MonsterAttackInput {
  const monster = monsterNumberOf(obj);
  monsterAttackInput.world = Store.world?.mapIndex ?? -1;
  monsterAttackInput.monster = monster;
  monsterAttackInput.model = monsterModelTypeOf(monster);
  monsterAttackInput.trapObject =
    obj.npcType === undefined ? undefined : TRAP_MODEL_TABLE[obj.npcType]?.[0];
  monsterAttackInput.now = performance.now();
  return monsterAttackInput;
}

/** `SetAction`; `rewind` is the `AnimationFrame = 0` that restarts a playing clip. */
export function setMonsterClip(obj: Entity, action: number, rewind: boolean) {
  const model = obj.modelObject;
  const clip = playableMonsterClip(action, model?.gltf?.animationGroups.length);
  if (clip === KEEP_CLIP || !obj.monsterAnimation) return;
  if (rewind && model?.CurrentAction === clip) model.restartAction();
  obj.monsterAnimation.action = clip as MonsterActionType;
}

/**
 * A trap's sounds after a pick: SetPlayerAttack's trap branch when it `attacked`, and the
 * meteorite storm once as it starts (`storming`: one already ran before the packet).
 */
export function playTrapSounds(
  obj: Entity,
  input: MonsterAttackInput,
  attacked: boolean,
  storming: boolean
) {
  const at = obj.transform?.pos;
  if (input.trapObject === undefined || !at) return;
  const trap = attacked ? trapAttackSound(input.trapObject) : undefined;
  if (trap) playSfx(trap.key, at, trap.opts);
  if (!storming && meteoriteStormRunning(input.monster, monsterAttackState(obj), input.now)) {
    playSfx(METEORITE_STORM.key, at, METEORITE_STORM.opts);
  }
}

/**
 * Cast clip for an object in scope: SetPlayerMagic for a player, and for a
 * monster the clip `ReceiveMagic` (0x19) or, for `area`, `ReceiveMagicContinue`
 * (0x1E) gives it.
 */
export function playCastAnimation(caster: Entity, skill: number, area: boolean) {
  const def = skillDefinition(skill);
  // A cast its skill drops on this mount (a Dark Horse rider's guard): no clip, no sound.
  if (
    !caster.localPlayer &&
    castQuietOn(skill, mountKind(caster.charAppearance?.pet, !!caster.attributeSystem?.isAboveZero('inSafeZone')))
  ) {
    return;
  }
  // ExecuteSkill's cast sound for everyone else (the hero's plays in SkillCastSystem).
  // Teleport never comes here: playTeleportAnimation plays it, the Nightmare's own sound included.
  if (!caster.localPlayer && caster.transform) {
    if (
      // A player's cast whose sound goes with its clip sounds below, once the clip is picked.
      !(caster.playerAnimation && hasClipSound(skill)) &&
      (caster.npcType === undefined ||
        !monsterCastQuiet(caster.npcType, monsterModelTypeOf(caster.npcType), skill))
    ) {
      playSkill(skill, caster.transform.pos);
    }
  }
  if (caster.playerAnimation) {
    if (caster.localPlayer) return; // SkillCastSystem already started the clip
    const cls =
      caster.charAppearance?.charClass ??
      (caster.attributeSystem?.getValue('playerNetClass') as CharacterClassNumber);
    // The same context the hero's cast builds: mount (none in a safe zone),
    // IsFemale(Class), the active world, and the coin toss for the male
    // hand cast - everyone in scope plays the same clip for the same skill.
    const ctx = {
      mount: mountKind(
        caster.charAppearance?.pet,
        !!caster.attributeSystem?.isAboveZero('inSafeZone')
      ),
      isFemale: isFemaleClass(cls),
      world: Store.world?.mapIndex,
      alternate: Math.random() < 0.5,
    };
    // A skill the server has no definition for still plays its own clip (Lightning Orb, 216).
    let action = def
      ? chooseSkillAction(def, attackPoseOf(caster), ctx)
      : (skillClip(skill, ctx) ?? PlayerAction.PLAYER_SKILL_HAND1);
    // What others see of the clip, when the skill says it differs (Electric Spike from a horse).
    action = othersSeeClip(skill, action);
    const paired = clipCastSound(skill, action);
    if (paired && caster.transform) playCombat(paired, caster.transform.pos);
    if (def && advancesSwordCount(def, ctx)) {
      caster.playerAnimation.swordCount = (caster.playerAnimation.swordCount ?? 0) + 1;
    }
    // SetPlayerMagic then `so->AnimationFrame = 0`; a monster body plays casts on its attack clips.
    const model = caster.modelObject;
    if (
      model &&
      (isPlayerBody(model)
        ? caster.playerAnimation.action === action
        : isMonsterSwingClip(model.CurrentAction))
    ) {
      model.restartAction();
    }
    caster.playerAnimation.action = action;
    if (caster.pathfinding) caster.pathfinding.path = null;
  } else if (caster.monsterAnimation && !isDeadMonster(caster)) {
    const state = monsterAttackState(caster);
    const input = attackInputOf(caster);
    const storming = meteoriteStormRunning(input.monster, state, input.now);
    if (area) setMonsterClip(caster, monsterAreaCast(state, skill, input), true);
    else setMonsterClip(caster, monsterCast(state, skill, input), monsterCastRewinds(skill));
    playTrapSounds(caster, input, area || monsterCastAttacks(skill), storming);
  }
}

/** Record an effect on an object and keep its look up (or drop it). */
export function applyObjectEffect(obj: Parameters<typeof setBuffVisual>[1], effectId: number, active: boolean) {
  const world = Store.world;
  if (!world) return;
  if (!obj.buffs) world.addComponent(obj, 'buffs', new Set<number>());
  if (active) obj.buffs!.add(effectId);
  else obj.buffs!.delete(effectId);
  // The persistent look of the buff (the Greater Defense knot, the Swell Life motes) - effects layer consumer.
  setBuffVisual(world.scene, obj, effectId, active);
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

export function emitObjectEffect(
  netId: number,
  effect: Events['objectEffect']['effect']
) {
  const world = Store.world;
  if (!world) return;
  const entity = world.getByNetId(netId);
  if (!entity) return;
  EventBus.emit('objectEffect', { entity, effect });
}
