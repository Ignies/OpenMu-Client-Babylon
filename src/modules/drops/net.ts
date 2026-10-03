import { DropObject } from './dropObject';
import { EventBus } from '@/core/eventBus';
import { type Item } from '@/ecs/world';
import { ItemDropRemovedPacket, ItemDropResponsePacket, ItemPickUpRequestFailedItemPickUpFailReasonEnum, ItemPickUpRequestFailedPacket, ItemsDroppedPacket, MoneyDroppedExtendedPacket } from '@versions/shared/packets/ServerToClientPackets';
import { ItemGroup, angleRotation, itemRestHeight, itemRestPose, itemRestRotation } from '@/controllers/actors/itemAngle';
import { ItemSerializer } from '../items/itemSerializer';
import { ItemsDatabase, itemBaseName } from '@versions/shared/items/itemsDatabase';
import { Store } from '@/app/store';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { archangelWeapon, dropModelProxy } from './dropModelProxy';
import { createAttributeSystem } from '@/core/attributeSystem';
import { itemLevelName } from '../items/itemLevelLook';
import { playDrop } from '@/controllers/sound';
import { removeNetObject } from '../_shared/net_helpers';
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
  const world = Store.world;
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

/**
 * ItemsDropped (0x20): items and zen piles coming into view or just landing.
 * A zen pile (and a single-item drop) is 21 bytes, the same wire shape as
 * MoneyDropped, which the dispatcher picks by length - so both handlers end
 * up here.
 */
function applyItemsDropped(p: ItemsDroppedPacket) {
  const world = Store.world;

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
    // CreateItem's per-level model swap (modules/drops/dropModelProxy.ts): the
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

/** RenderItemName (ZzzInventory.cpp:6714): "Zen 1234", "Short Sword +4". */
function dropName(
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
  return item ? itemLevelName(item.group, item.num, item.lvl, name) : name;
}

EventBus.on('ItemsDropped', packet => {
  applyItemsDropped(new ItemsDroppedPacket(packet));
});

EventBus.on('ItemDropRemoved', packet => {
  const world = Store.world;
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
    Store.rollbackItemMove();
    Store.addNotification(t('notify.cannotDropItem'), 'error');
    return;
  }

  // ReceiveDropItem (WSclient.cpp:6197-6219) is silent: the thud is the item
  // landing, when it appears on the ground.
  runInAction(() => {
    Store.playerData.items[p.InventorySlot] = null;
  });

  Store.confirmItemMove(-1, null);
});

EventBus.on('ItemPickUpRequestFailed', packet => {
  const p = new ItemPickUpRequestFailedPacket(packet);

  const reason = p.FailReason;

  if (reason === ItemPickUpRequestFailedItemPickUpFailReasonEnum.ItemStacked) {
    return;
  }

  Store.addNotification(
    reason ===
      ItemPickUpRequestFailedItemPickUpFailReasonEnum.__MaximumInventoryMoneyReached
      ? t('notify.carryingTooMuchZen')
      : t('notify.cannotPickUp'),
    'error'
  );
});
