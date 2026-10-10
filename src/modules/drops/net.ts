import { DropObject } from './dropObject';
import { EventBus } from '@/core/eventBus';
import { type Item } from '@/ecs/world';
import { ItemDropRemovedPacket, ItemDropResponsePacket, ItemPickUpRequestFailedItemPickUpFailReasonEnum, ItemPickUpRequestFailedPacket, ItemsDroppedPacket, MoneyDroppedExtendedPacket } from '@versions/shared/packets/ServerToClientPackets';
import { ItemGroup, angleRotation, itemRestHeight, itemRestPose, itemRestRotation } from '@/controllers/actors/itemAngle';
import { ItemSerializer } from '@/controllers/item_rules';
import { ItemsDatabase, itemBaseName } from '@versions/shared/items/itemsDatabase';
import { Bag } from '@/modules/inventory';
import { Hero } from '@/modules/hero';
import { addNotification } from '@/modules/chat';
import { Ecs } from '@/ecs/current';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { ancientSetOf, archangelWeapon, dropModelProxy } from '@/controllers/item_rules';
import { itemSetTables } from '@/controllers/assets';
import { createAttributeSystem } from '@/core/attributeSystem';
import { itemLevelName } from '@/controllers/item_rules';
import { playDrop } from '@/controllers/sound';
import { removeNetObject } from '../scope/objects';
import { runInAction } from 'mobx';
import { t } from '@/i18n';

/** MoneyDropped (0x20) / MoneyDroppedExtended (0x2F): a zen pile on the ground. */
function spawnMoneyDrop(
  id: number,
  x: number,
  y: number,
  amount: number,
  fresh: boolean
) {
  const world = Ecs.world;
  if (!world) return;
  const maskedId = id & 0x7fff;
  removeNetObject(world, maskedId);
  const itemConfig = ItemsDatabase.getItem(ZEN_GROUP, ZEN_NUM);
  if (!itemConfig) return;
  const rot = itemRestRotation(ZEN_GROUP, ZEN_NUM);
  world.add({
    netId: maskedId,
    worldIndex: world.mapIndex,
    transform: {
      pos: new Vector3(
        x,
        world.getTerrainHeight(x, y) + itemRestHeight(ZEN_GROUP),
        y
      ),
      rot: new Vector3(rot.x, rot.y, rot.z),
      scale: itemRestPose(ZEN_GROUP, ZEN_NUM).scale,
    },
    modelFactory: DropObject,
    modelFilePath: itemConfig.szModelFolder + itemConfig.szModelName,
    visibility: { state: 'hidden', lastChecked: 0 },
    attributeSystem: createAttributeSystem(),
    interactable: true,
    screenPosition: { worldOffsetZ: DROP_LABEL_HEIGHT, x: 0, y: 0 },
    droppedItem: {
      isMoney: true,
      amount,
      fresh: !!fresh,
      group: ZEN_GROUP,
      num: ZEN_NUM,
    },
    objectNameInWorld: dropName(true, amount, undefined, undefined),
  });
}

/**
 * ItemsDropped (0x20): items and zen piles coming into view or just landing.
 * A zen pile (and a single-item drop) is 21 bytes, the same wire shape as
 * MoneyDropped, which the dispatcher picks by length - so both handlers end
 * up here.
 */
function applyItemsDropped(p: ItemsDroppedPacket) {
  const world = Ecs.world;

  if (!world) return;

  p.getItems(p.ItemCount).forEach(item => {
    const maskedId = item.Id & 0x7fff;
    const data = item.ItemData;

    const id = data.getUint8(0);
    const group = data.getUint8(5) >> 4;

    const isMoney = data.byteLength >= 6 && id === 15 && group === 14;

    const itemConfig = ItemsDatabase.getItem(group, id);
    // An item this client has no file for: skip it, not the rest of the packet.
    if (!itemConfig) return;

    let amount = 0;

    if (isMoney) {
      amount =
        (data.getUint8(1) << 16) | (data.getUint8(2) << 8) | data.getUint8(4);
    }

    const parsed = isMoney
      ? undefined
      : ItemSerializer.DeserializeItem(
          new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
        );

    // CreateItem / CreateMoneyDrop (ZzzObject.cpp:5997-6002 / :6198): a fresh
    // drop lands with a thud, zen jingles, jewels ring - for the drops the
    // player asked to hear (`controllers/sound/drops.ts`).
    if (item.IsFreshDrop) {
      playDrop(
        { isMoney, item: parsed, group, num: id },
        { x: item.PositionX, z: item.PositionY }
      );
    }

    removeNetObject(world, maskedId);
    // CreateItem's per-level model swap (item_rules/dropModelProxy.ts): the
    // shown model and its pose may come from another item's row.
    const proxy = parsed ? dropModelProxy(group, id, parsed.lvl ?? 0) : null;
    const poseGroup = proxy?.group ?? group;
    const poseNum = proxy?.num ?? id;
    // ItemAngle (controllers/actors/itemAngle.ts): the resting pose and height for this
    // item's class - armour face-down, a sword leaning back, everything 30 cm
    // (a weapon 70) off the terrain.
    const pose = proxy?.pose ?? itemRestPose(poseGroup, poseNum);
    const rot = angleRotation(pose.angle);
    world.add({
      netId: maskedId,
      worldIndex: world.mapIndex,
      transform: {
        pos: new Vector3(
          item.PositionX,
          world.getTerrainHeight(item.PositionX, item.PositionY) +
            itemRestHeight(poseGroup),
          item.PositionY
        ),
        rot: new Vector3(rot.x, rot.y, rot.z),
        scale: pose.scale,
      },
      modelFactory: DropObject,
      modelFilePath:
        proxy?.modelFilePath ?? itemConfig.szModelFolder + itemConfig.szModelName,
      visibility: {
        state: 'hidden',
        lastChecked: 0,
      },
      attributeSystem: createAttributeSystem(),
      interactable: true,
      screenPosition: { worldOffsetZ: DROP_LABEL_HEIGHT, x: 0, y: 0 },
      droppedItem: {
        isMoney,
        amount: isMoney ? amount : undefined,
        item: parsed,
        fresh: !!item.IsFreshDrop,
        group: poseGroup,
        num: poseNum,
      },
      objectNameInWorld: dropName(isMoney, amount, itemBaseName(group, id), parsed),
    });
  });
}

/** Label anchor above a drop lying on the ground (RenderItemName: ScreenY - 15). */
const DROP_LABEL_HEIGHT = 0.6;

/** `ITEM_ZEN` (`ITEM_GROUP_POTION`, index 15): the zen pile's own item id. */
const ZEN_GROUP = ItemGroup.Potion;
const ZEN_NUM = 15;
/** `ITEM_WEAPON_OF_ARCHANGEL`: the Blood Castle quest item. */
const WEAPON_OF_ARCHANGEL = 19;

/** `ITEM_HORN_OF_DINORANT`: its skill is named as the knight's. */
const HORN_OF_DINORANT = 3;

/** Skill, option and luck after the name, in that order and with no option number (ZzzInventory.cpp:6645-6663). */
function optionMarks(item: Item): string {
  let marks = '';
  if (item.hasSkill) {
    const horn = item.group === ItemGroup.Helper && item.num === HORN_OF_DINORANT;
    marks += horn ? ` +${t('drop.knightSkill')}` : t('drop.skill');
  }
  if ((item.optionLevel ?? 0) > 0) marks += t('drop.option');
  if (item.luck) marks += t('drop.luck');
  return marks;
}

/** RenderItemName (ZzzInventory.cpp:6714): "Zen 1234", "Short Sword +4+Skill+Luck". */
export function dropName(
  isMoney: boolean,
  amount: number,
  baseName: unknown,
  item: Item | undefined
): string {
  const zen = t('common.zen');
  if (isMoney) return amount > 0 ? `${zen} ${amount}` : zen;
  // The Weapon of Archangel lies there as the Divine weapon it stands for,
  // named for it and with no level (ZzzObject.cpp:5496-5512).
  if (item && item.group === ItemGroup.Helper && item.num === WEAPON_OF_ARCHANGEL) {
    const [group, num] = archangelWeapon(item.lvl ?? 0);
    return String(itemBaseName(group, num));
  }
  const name = String(baseName);
  if (!item) return name;
  // The set name goes in front (`GetSetItemName`, ZzzInventory.cpp:6632-6643).
  const set = ancientSetOf(item);
  return (set ? `${set.name} ` : '') + itemLevelName(item.group, item.num, item.lvl, name) + optionMarks(item);
}

/** Registers this module's packet listeners (see ../module.ts). */
export function installNet(): void {
  // The ground labels are written once, so the ancient set names load before the first drop.
  itemSetTables();
  EventBus.on('MoneyDropped', packet => {
    // Same bytes as a one-item ItemsDropped (the dispatcher chose this class by
    // length alone), and that item is not always zen: let the item path decide.
    applyItemsDropped(new ItemsDroppedPacket(packet));
  });

  EventBus.on('MoneyDroppedExtended', packet => {
    const p = new MoneyDroppedExtendedPacket(packet);
    if (p.IsFreshDrop) {
      playDrop(
        { isMoney: true, group: ZEN_GROUP, num: ZEN_NUM },
        { x: p.PositionX, z: p.PositionY }
      );
    }
    spawnMoneyDrop(p.Id, p.PositionX, p.PositionY, p.Amount, p.IsFreshDrop);
  });

  EventBus.on('ItemsDropped', packet => {
    applyItemsDropped(new ItemsDroppedPacket(packet));
  });

  EventBus.on('ItemDropRemoved', packet => {
    const world = Ecs.world;
    if (!world) return;

    const p = new ItemDropRemovedPacket(packet);
    p.getItemData(p.ItemCount).forEach(item => {
      const maskedId = item.Id & 0x7fff;
      const itemEntity = world.getByNetId(maskedId);
      if (itemEntity) {
        world.addComponent(itemEntity, 'objOutOfScope', true);
      } else {
        console.warn(`Item entity with netId ${maskedId} not found.`);
      }
    });
  });

  EventBus.on('ItemDropResponse', packet => {
    const p = new ItemDropResponsePacket(packet);

    if (!p.Success) {
      console.warn(`Drop of slot ${p.InventorySlot} refused`);
      Bag.rollbackItemMove();
      addNotification(t('notify.cannotDropItem'), 'error');
      return;
    }

    // ReceiveDropItem (WSclient.cpp:6197-6219) is silent: the thud is the item
    // landing, when it appears on the ground.
    runInAction(() => {
      Hero.items[p.InventorySlot] = null;
    });

    Bag.confirmItemMove(-1, null);
  });

  EventBus.on('ItemPickUpRequestFailed', packet => {
    const p = new ItemPickUpRequestFailedPacket(packet);

    const reason = p.FailReason;

    if (reason === ItemPickUpRequestFailedItemPickUpFailReasonEnum.ItemStacked) {
      return;
    }

    addNotification(
      reason ===
        ItemPickUpRequestFailedItemPickUpFailReasonEnum.__MaximumInventoryMoneyReached
        ? t('notify.carryingTooMuchZen')
        : t('notify.cannotPickUp'),
      'error'
    );
  });
}
