import { APPEARANCE_EXTENDED_LENGTH, deserializeAppearance, deserializeAppearanceExtended, itemLevelFromGlow } from '@/controllers/actors/deserializeAppearance';
import { AddCharacterToScopeExtendedPacket, AddCharactersToScopePacket, AddNpcsToScopePacket, AddSummonedMonstersToScopePacket, AddTransformedCharactersToScopePacket, AppearanceChangedExtendedPacket, AppearanceChangedPacket, MapObjectOutOfScopePacket, ObjectMovedPacket, ObjectWalkedPacket, SummonHealthUpdatePacket } from '@versions/shared/packets/ServerToClientPackets';
import { CharacterClassNumber } from '@/core/types';
import { Economy } from '../economy/economy';
import { Entity, World, type Item } from '@/ecs/world';
import { EventBus } from '@/core/eventBus';
import { InventoryConstants } from '../inventory/inventoryConstants';
import { ItemSerializer } from '../items/itemSerializer';
import { MonsterActionType, PlayerAction } from '@versions/shared/objects/enum';
import { PlayerObject, npcClassOf } from '@/controllers/actors/playerObject';
import { Store } from '@/app/store';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { addNpcToScope, convertDirectionToAngle, isDeadMonster, removeNetObject, resumeWalkIntoScope } from '../_shared/net_helpers';
import { characterSkinBody } from '@/controllers/actors/transformedBody';
import { classWorldScale } from '@/controllers/actors/characterScale';
import { createAttributeSystem } from '@/core/attributeSystem';
import { deferLeave, noteScopeEntry } from '@/ecs/systems/teleportSystem';
import { isFemaleClass } from '@/controllers/actors/mapPlayerNetClassToModelClass';
import { isKnownObjectType, resolveModelFactory } from '@/controllers/actors/modelFactoryPerId';
import { playSummonArrival } from '@versions/shared/skills/skillVisuals';
import { traceHeroInstantMove } from '@/controllers/actors/heroMoveTrace';

export function spawnPlayer(
  world: World,
  { cls }: { cls?: CharacterClassNumber } = {}
) {
  const playerEntity = world.add({
    transform: {
      pos: new Vector3(),
      rot: Vector3.Zero(),
      // Object.Scale per class (ZzzCharacter.cpp:11925-11933).
      scale: classWorldScale(cls ?? CharacterClassNumber.DarkKnight),
      posOffset: new Vector3(0.5, 0, 0.5),
    },
    modelFactory: PlayerObject,
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
    playerAnimation: {
      action: PlayerAction.PLAYER_SET,
      run: 0,
    },
    attributeSystem: createAttributeSystem(),
    visibility: {
      state: 'hidden',
      lastChecked: 0,
    },
    screenPosition: {
      worldOffsetZ: 2.5,
      x: 0,
      y: 0,
    },
    objectNameInWorld: 'Player',
    charAppearance: {
      helm: null,
      armor: null,
      gloves: null,
      pants: null,
      boots: null,
      leftHand: null,
      rightHand: null,
      wings: null,
      pet: null,
      charClass: cls ?? CharacterClassNumber.DarkKnight,
      changed: true,
    } satisfies NonNullable<Entity['charAppearance']> as NonNullable<
      Entity['charAppearance']
    >,
  });
  playerEntity.transform.pos.z = 1.7;

  playerEntity.attributeSystem.setValue(
    'isFemale',
    isFemaleClass(cls ?? CharacterClassNumber.DarkKnight) ? 1 : 0
  );
  playerEntity.attributeSystem.setValue('isFlying', 0);
  playerEntity.attributeSystem.setValue('currentHealth', 0);
  playerEntity.attributeSystem.setValue('currentMana', 0);
  playerEntity.attributeSystem.setValue('maxHealth', 1);
  playerEntity.attributeSystem.setValue('maxMana', 1);
  playerEntity.attributeSystem.setValue('totalMovementSpeed', 3);
  playerEntity.attributeSystem.setValue(
    'playerNetClass',
    cls ?? CharacterClassNumber.DarkKnight
  );

  return playerEntity;
}

type ScopeCharacter = {
  Id: number;
  CurrentPositionX: number;
  CurrentPositionY: number;
  TargetPositionX: number;
  TargetPositionY: number;
  Rotation: number;
  Name: string;
  appearance: ReturnType<typeof deserializeAppearance>;
  /** Server-computed speeds (extended protocol only). */
  attackSpeed?: number;
  magicSpeed?: number;
  /** Visible magic effect ids on this character. */
  effects?: number[];
  /** PK / hero status byte (`c->PK`; OpenMU CharacterHeroState, same values). */
  HeroState?: number;
};

/**
 * A player drawn as a monster. The body is the monster's model and rig, as
 * `addNpcToScope` would build it; the identity is the player's - its net id,
 * its name, its PK tint, and the `skin` mark that tells every command, trade
 * and shop click that this is a person. No `npcType`, so it is never an
 * attack or talk target the way a monster or an NPC is.
 */
function addTransformedCharacterToScope(world: World, char: ScopeCharacter, skin: number) {
  const worldIndex = world.mapIndex;
  const maskedId = char.Id & 0x7fff;
  console.log(
    `[scope] character "${char.Name}" id=${maskedId} at (${char.CurrentPositionX},${char.CurrentPositionY}) map=${worldIndex} skin=${skin}`
  );

  removeNetObject(world, maskedId);

  if (!isKnownObjectType(skin)) {
    console.warn(`No model mapping for skin ${skin} on "${char.Name}"; drawing the default body.`);
  }
  const modelFactory = resolveModelFactory(skin);
  // The transform packet has scales of its own for a few of the skins - a
  // worn Giant is half the size of the one in Tarkan (`characterSkinBody`).
  const scale =
    characterSkinBody(skin)?.scale ??
    (modelFactory.OverrideScale >= 0 ? modelFactory.OverrideScale : 1);

  const entity = world.add({
    netId: maskedId,
    worldIndex,
    skin,
    transform: {
      pos: new Vector3(
        char.CurrentPositionX,
        world.getTerrainHeight(char.CurrentPositionX, char.CurrentPositionY),
        char.CurrentPositionY
      ),
      rot: new Vector3(0, convertDirectionToAngle(char.Rotation), 0),
      scale,
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
    objectNameInWorld: char.Name,
    interactable: true,
  });

  if (char.HeroState != null) entity.heroState = char.HeroState;
  if (char.effects?.length) world.addComponent(entity, 'buffs', new Set(char.effects));

  const npcClass = npcClassOf(modelFactory);
  entity.attributeSystem.setValue(
    'isFemale',
    npcClass !== null && isFemaleClass(npcClass) ? 1 : 0
  );
  entity.attributeSystem.setValue('isFlying', 0);
  // A player's walking pace, not a monster's: the server moves this body at
  // the player's speed, and a slower animation would trail behind it.
  entity.attributeSystem.setValue('totalMovementSpeed', 3);
  entity.attributeSystem.setValue('maxHealth', 1);
  entity.attributeSystem.setValue('currentHealth', 1);

  resumeWalkIntoScope(
    entity,
    char.CurrentPositionX,
    char.CurrentPositionY,
    char.TargetPositionX,
    char.TargetPositionY
  );
}

function addCharacterToScope(
  world: World,
  char: ScopeCharacter,
  skin = 0
) {
  const worldIndex = world.mapIndex;
  {
    const maskedId = char.Id & 0x7fff;
    console.log(
      `[scope] character "${char.Name}" id=${maskedId} at (${char.CurrentPositionX},${char.CurrentPositionY}) map=${worldIndex} class=${char.appearance.cls} local=${Store.playerId === maskedId}`
    );

    removeNetObject(world, maskedId);

    const appearance = char.appearance;
    const playerEntity = spawnPlayer(world, { cls: appearance.cls });

    // A transformation ring, or a game master's `/skin`: the body is the
    // skin's, either as a part file worn on the character's own rig or as
    // the whole monster (`controllers/actors/transformedBody.ts`).
    const body = skin ? characterSkinBody(skin) : null;
    if (skin) world.addComponent(playerEntity, 'skin', skin);
    if (body) {
      playerEntity.modelFactory = body.factory as typeof PlayerObject;
      playerEntity.transform.scale = body.scale;
    } else if (skin) {
      console.warn(
        `Skin ${skin} has no character body; drawing the character's own.`
      );
    }

    world.addComponent(playerEntity, 'netId', maskedId);
    world.addComponent(playerEntity, 'worldIndex', worldIndex);
    noteScopeEntry(playerEntity);
    playerEntity.transform.pos.x = char.CurrentPositionX;
    playerEntity.transform.pos.z = char.CurrentPositionY;
    playerEntity.transform.pos.y = world.getTerrainHeight(
      char.CurrentPositionX,
      char.CurrentPositionY
    );

    playerEntity.transform.rot.y = convertDirectionToAngle(char.Rotation);

    playerEntity.objectNameInWorld = char.Name;
    // `c->PK = Data->PK` (WSclient.cpp:804): tints the name balloon.
    if (char.HeroState != null) playerEntity.heroState = char.HeroState;

    if (Store.playerId === maskedId) {
      world.addComponent(playerEntity, 'localPlayer', true);
      console.log(`Local player spawned: ${maskedId} - ${char.Name}`);
      // The hero's own GM tag comes from CharacterInformation, not from the
      // `#` shout `markAsGm` watches for - the hero never sees its own shout
      // as an inbound chat line. Re-applied here because the body is respawned
      // on every scope add.
      if (Store.playerData.isGameMaster) world.addComponent(playerEntity, 'isGm', true);
      if (char.attackSpeed != null) Store.playerData.attackSpeed = char.attackSpeed;
      if (char.magicSpeed != null) Store.playerData.magicSpeed = char.magicSpeed;
      if (char.HeroState != null) Store.playerData.heroState = char.HeroState;
    } else {
      // `SelectCharacter(CKind_1)` (ZzzInterface.cpp:8110) tests the other
      // players before the monsters, so another player is a pick target: the
      // hover balloon, the command window and the quick menu all read the
      // object under the cursor. The hero is left out - its own body would
      // sit on every click and stop the walk (playerControllerSystem).
      world.addComponent(playerEntity, 'interactable', true);
    }

    if (char.effects?.length) {
      world.addComponent(playerEntity, 'buffs', new Set(char.effects));
      if (Store.playerId === maskedId) {
        char.effects.forEach(id => Store.setBuff(id, true));
      }
    }

    const cApp = playerEntity.charAppearance;

    cApp.leftHand = appearance.leftHand;
    cApp.rightHand = appearance.rightHand;
    cApp.helm = appearance.helm;
    cApp.armor = appearance.armor;
    cApp.pants = appearance.pants;
    cApp.gloves = appearance.gloves;
    cApp.boots = appearance.boots;
    // Both layouts carry them - the legacy one in the wing / pet bits of the
    // preview (`deserializeAppearance`), the extended one in its own slots.
    cApp.wings = appearance.wings ?? null;
    cApp.pet = appearance.pet ?? null;

    cApp.changed = true;

    resumeWalkIntoScope(
      playerEntity,
      char.CurrentPositionX,
      char.CurrentPositionY,
      char.TargetPositionX,
      char.TargetPositionY
    );
  }
}

/**
 * 0x25 - `ReceiveChangePlayer`: one equipment slot of a player in scope
 * changed. Slot numbers are the inventory's (`InventoryConstants`); a group
 * of 0xFF means the slot was emptied. The hero's own appearance is driven by
 * the inventory (`Store.syncPlayerAppearance`), so it is left alone here.
 */
function applyAppearanceChange(
  playerId: number,
  slot: number,
  item: Item | null
): void {
  const world = Store.world;
  if (!world) return;
  const netId = playerId & 0x7fff;
  if (netId === Store.playerId) return;

  const entity = world.getByNetId(netId);
  const cApp = entity?.charAppearance;
  if (!cApp) return;

  switch (slot) {
    case InventoryConstants.LeftHandSlot:
      cApp.leftHand = item;
      break;
    case InventoryConstants.RightHandSlot:
      cApp.rightHand = item;
      break;
    case InventoryConstants.HelmSlot:
      cApp.helm = item;
      break;
    case InventoryConstants.ArmorSlot:
      cApp.armor = item;
      break;
    case InventoryConstants.PantsSlot:
      cApp.pants = item;
      break;
    case InventoryConstants.GlovesSlot:
      cApp.gloves = item;
      break;
    case InventoryConstants.BootsSlot:
      cApp.boots = item;
      break;
    case InventoryConstants.WingsSlot:
      cApp.wings = item;
      break;
    case InventoryConstants.PetSlot:
      cApp.pet = item;
      break;
    default:
      // Rings, pendants: nothing visible (the original ignores them too).
      return;
  }
  cApp.changed = true;
}

/** Registers this module's packet listeners (see ../module.ts). */
export function installNet(): void {
  EventBus.on('AddNpcsToScope', packet => {
    const p = new AddNpcsToScopePacket(packet);

    const world = Store.world;
    if (!world) return;

    p.getNPCs().forEach(npc => addNpcToScope(world, npc));
  });

  // 0x1F (ReceiveCreateSummonViewport): a player's summons enter scope. Same
  // spawn path as monsters, with the owner's name carried on the entity.
  EventBus.on('AddSummonedMonstersToScope', packet => {
    const p = new AddSummonedMonstersToScopePacket(packet);

    const world = Store.world;
    if (!world) return;

    p.getSummonedMonsters().forEach(m => {
      const e = addNpcToScope(world, m);
      // Key >> 15 is the create flag: a fresh summon plays its arrival (WSclient.cpp:3113-3117).
      if (m.Id & 0x8000) playSummonArrival(world.scene, e);
    });
  });

  // F3 20 (ReceiveSummonLife): percent health of the hero's own summon. The
  // original shows it as a gauge in the endurance panel; here it drives the
  // summon's health bar directly.
  EventBus.on('SummonHealthUpdate', packet => {
    const p = new SummonHealthUpdatePacket(packet);

    const world = Store.world;
    if (!world) return;

    const owner = Store.playerData.name;
    for (const e of world.with('summonedBy', 'attributeSystem')) {
      if (e.summonedBy !== owner || e.objOutOfScope) continue;
      const max = e.attributeSystem.getValue('maxHealth');
      if (max > 0) {
        e.attributeSystem.setValue('currentHealth', (max * p.HealthPercent) / 100);
      }
    }
  });

  EventBus.on('AddCharactersToScope', packet => {
    const p = new AddCharactersToScopePacket(packet);
    const chars = p.getCharacters();

    const world = Store.world;
    if (!world) return;

    chars.forEach(char => {
      addCharacterToScope(world, {
        ...char,
        appearance: deserializeAppearance(char.Appearance),
        // The classic packet carries the visible effects too, one record each;
        // only the extended one names the field the way the entity wants it.
        effects: char.Effects.map(e => e.Id),
      });
    });
  });

  // Extended protocol (client >= 106.3): one character per packet, extended
  // appearance layout, followed by a count + list of visible effect ids.
  EventBus.on('AddCharacterToScopeExtended', packet => {
    const p = new AddCharacterToScopeExtendedPacket(packet);

    const world = Store.world;
    if (!world) return;

    const data = p.AppearanceAndEffects;
    const effects: number[] = [];
    if (data.byteLength > APPEARANCE_EXTENDED_LENGTH) {
      const count = data.getUint8(APPEARANCE_EXTENDED_LENGTH);
      for (
        let i = 0;
        i < count && APPEARANCE_EXTENDED_LENGTH + 1 + i < data.byteLength;
        i++
      ) {
        effects.push(data.getUint8(APPEARANCE_EXTENDED_LENGTH + 1 + i));
      }
    }

    addCharacterToScope(world, {
      Id: p.Id,
      CurrentPositionX: p.CurrentPositionX,
      CurrentPositionY: p.CurrentPositionY,
      TargetPositionX: p.TargetPositionX,
      TargetPositionY: p.TargetPositionY,
      Rotation: p.Rotation,
      Name: p.Name.replace(/\u0000+$/, ''),
      appearance: deserializeAppearanceExtended(data),
      attackSpeed: p.AttackSpeed,
      magicSpeed: p.MagicSpeed,
      effects,
      HeroState: p.HeroState,
    });
  });

  // 0x45: a player wearing a monster's appearance - a transformation ring, or
  // a game master's `/skin`. Same block as the classic scope packet plus the
  // monster number. Until this was handled a skinned player simply never
  // appeared: the frame was dropped and there was nothing on screen to click.
  EventBus.on('AddTransformedCharactersToScope', packet => {
    const p = new AddTransformedCharactersToScopePacket(packet);

    const world = Store.world;
    if (!world) return;

    for (const char of p.getCharacters()) {
      const scoped: ScopeCharacter = {
        ...char,
        Name: char.Name.replace(/ +$/, ''),
        appearance: deserializeAppearance(char.Appearance),
        effects: char.Effects.map(e => e.Id),
      };
      // The hero is rebuilt as a player wearing the skin's body rather than as
      // the monster itself: the controller, the camera and every clip it plays
      // are the player rig's, and the original transforms it the same way -
      // a MODEL_PLAYER with the skin as its subtype. Skins that are a whole
      // monster instead have no body to lend, so the hero keeps its own.
      if (char.Skin === 0) {
        addCharacterToScope(world, scoped);
      } else if (Store.playerId === (char.Id & 0x7fff)) {
        addCharacterToScope(world, scoped, char.Skin);
      } else {
        addTransformedCharacterToScope(world, scoped, char.Skin);
      }
    }
  });

  EventBus.on('MapObjectOutOfScope', packet => {
    const p = new MapObjectOutOfScopePacket(packet);
    p.getObjects(p.ObjectCount).forEach(obj => {
      const maskedId = obj.Id & 0x7fff;

      // `RemoveShopTitle`: the stall title goes with the player who left.
      Economy.setShopTitle(maskedId, null);
      Economy.dropBrowsedShop(maskedId);

      const world = Store.world;
      if (!world) return;

      let objEntity = world.getByNetId(maskedId);
      if (objEntity?.objOutOfScope) objEntity = undefined;
      // A player teleporting away is dropped mid-fade; he goes once faded out.
      if (objEntity && !deferLeave(objEntity)) {
        world.addComponent(objEntity, 'objOutOfScope', true);
      }
    });
  });

  EventBus.on('ObjectMoved', packet => {
    const p = new ObjectMovedPacket(packet);

    const world = Store.world;
    if (!world) return;

    const maskedId = p.ObjectId & 0x7fff;
    const obj = world.getByNetId(maskedId);
    if (!obj) return;
    if (isDeadMonster(obj)) return;

    if (obj.localPlayer) {
      traceHeroInstantMove(
        obj,
        { x: p.PositionX, y: p.PositionY },
        { attack: world.attackTarget, cast: world.castApproach }
      );
    }

    obj.transform.pos.x = p.PositionX;
    obj.transform.pos.z = p.PositionY;
    obj.transform.pos.y = world.getTerrainHeight(p.PositionX, p.PositionY);

    if (obj.playerMoveTo) {
      obj.playerMoveTo.point.x = p.PositionX;
      obj.playerMoveTo.point.y = p.PositionY;
      obj.playerMoveTo.handled = true;
    }

    if (obj.pathfinding) {
      obj.pathfinding.path = null;
      obj.pathfinding.from = { x: p.PositionX, y: p.PositionY };
      obj.pathfinding.to = { x: p.PositionX, y: p.PositionY };
    }

    if (obj.movement) {
      obj.movement.velocity.x = 0;
      obj.movement.velocity.y = 0;
    }
  });

  EventBus.on('ObjectWalked', packet => {
    const p = new ObjectWalkedPacket(packet);

    const world = Store.world;
    if (!world) return;

    const maskedId = p.ObjectId & 0x7fff;

    const obj = world.getByNetId(maskedId);
    if (!obj) return;

    if (obj.localPlayer) return;
    if (isDeadMonster(obj)) return;

    if (obj.playerMoveTo) {
      obj.playerMoveTo.handled = false;
      obj.playerMoveTo.point.x = p.TargetX;
      obj.playerMoveTo.point.y = p.TargetY;
    } else {
      obj.transform.pos.x = p.TargetX;
      obj.transform.pos.z = p.TargetY;
    }

    obj.transform.rot.y = convertDirectionToAngle(p.TargetRotation);
  });

  // Legacy layout: a full serialized item whose byte 1 holds
  // `slot << 4 | glowLevel` (AppearanceChangedPlugIn); all 0xFF = unequipped.
  EventBus.on('AppearanceChanged', packet => {
    const p = new AppearanceChangedPacket(packet);
    const data = p.ItemData;
    if (data.byteLength < ItemSerializer.NeededSpace) return;

    const bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    const slot = bytes[1] >> 4;
    const unequipped = bytes[0] === 0xff && bytes[5] === 0xff;
    if (unequipped) {
      applyAppearanceChange(p.ChangedPlayerId, slot, null);
      return;
    }

    const item = ItemSerializer.DeserializeItem(bytes);
    // Byte 1 does not carry the item level here: the server overwrites it with
    // `slot << 4 | GetGlowLevel()` (AppearanceChangedPlugIn), so the low nibble
    // is the same three-bit glow the scope preview sends, not a +0..+15.
    item.lvl = itemLevelFromGlow(bytes[1] & 0x0f);
    applyAppearanceChange(p.ChangedPlayerId, slot, item);
  });

  // Extended layout (client >= 106.3): group / number / level / excellent
  // flags / ancient discriminator, like `deserializeAppearanceExtended`.
  EventBus.on('AppearanceChangedExtended', packet => {
    if (packet.byteLength < AppearanceChangedExtendedPacket.Length!) return;
    const p = new AppearanceChangedExtendedPacket(packet);

    const item: Item | null =
      p.ItemGroup === 0xff
        ? null
        : {
            num: p.ItemNumber,
            group: p.ItemGroup & 0xf,
            lvl: p.ItemLevel,
            isExcellent: (p.ExcellentFlags & 0x3f) !== 0,
            excellentFlags: p.ExcellentFlags & 0x3f,
            isAncient: p.AncientDiscriminator !== 0,
          };
    applyAppearanceChange(p.ChangedPlayerId, p.ItemSlot, item);
  });
}
