import { CHAOS_CARD_WIRE_STORAGE, StorageKind, localIndexOf } from './itemStorage';
import { CharacterInventoryPacket, InventoryItemUpgradedPacket, InventoryMoneyUpdatePacket, ItemAddedToInventoryPacket, ItemDurabilityChangedPacket, ItemMovedPacket, ItemRemovedPacket } from '@versions/shared/packets/ServerToClientPackets';
import { Economy } from '../economy/economy';
import { EventBus } from '@/core/eventBus';
import { InventoryConstants } from './inventoryConstants';
import { ItemSerializer } from '../items/itemSerializer';
import { NetStats } from '@/controllers/net/roundTrip';
import { Store } from '@/app/store';
import { pickupSound } from '@/controllers/sound/combatSounds';
import { playUiSound } from '@/controllers/sound/sfx';
import { prefetchItemIcons } from '@/controllers/assets/itemIconPack';
import { runInAction } from 'mobx';
import { t } from '@/i18n';

EventBus.on('CharacterInventory', packet => {
  const p = new CharacterInventoryPacket(packet);
  const entries = p.getItems(p.ItemCount).map(item => ({
    slot: item.ItemSlot,
    item: ItemSerializer.DeserializeItem(new Uint8Array(item.ItemData.buffer)),
  }));

  runInAction(() => {
    const items = Store.playerData.items;
    for (const { slot, item } of entries) {
      // The personal store lives behind `FirstStoreItemSlotIndex` in the
      // same storage (OpenMU) - those squares belong to the stall grid.
      if (slot >= InventoryConstants.FirstStoreItemSlotIndex) {
        Economy.myShopItems[localIndexOf(StorageKind.PersonalShop, slot)] = item;
        continue;
      }
      items[slot] = item;
    }
  });

  Store.syncPlayerAppearance();
  // Inventory icons start loading now, before the window is ever opened.
  prefetchItemIcons(entries.map(entry => entry.item));
});

// Chat, party, guild and messenger state belong to the character: clear on
// select. MessengerInitialization arrives right after and refills the lists.
// (Folded into `applyCharacterInformation`, so each packet has exactly one
// handler and the order between them is not import luck.)

const KNOWN_STORAGES: number[] = [
  StorageKind.Inventory,
  StorageKind.Trade,
  StorageKind.Vault,
  StorageKind.ChaosMachine,
  StorageKind.PersonalShop,
];

/**
 * `ReceiveInventoryItemMove`: the server says where the item ended up, and
 * only then is it painted. `TargetStorageType` picks the grid - the same
 * packet lands an item in the inventory, the vault, the trade tray, the
 * chaos machine or the personal shop.
 */
EventBus.on('ItemMoved', packet => {
  NetStats.markAnswered('itemMove');
  const p = new ItemMovedPacket(packet);

  // The Chaos Card Master's tray is the same local grid as the chaos
  // machine; only the wire byte differs (itemStorage.ts).
  const storage = (
    p.TargetStorageType === CHAOS_CARD_WIRE_STORAGE
      ? StorageKind.ChaosMachine
      : p.TargetStorageType
  ) as StorageKind;

  if (!KNOWN_STORAGES.includes(storage)) {
    console.warn(`ItemMoved into unknown storage ${storage}`);
    Store.confirmItemMove(-1, null);
    return;
  }

  const item = ItemSerializer.DeserializeItem(new Uint8Array(p.ItemData.buffer));

  console.log(`ItemMoved -> storage ${storage} slot ${p.TargetSlot}`, item);

  // OpenMU keeps the personal store inside the inventory storage and its
  // ItemMovedPlugIn (RemoteView/Inventory/ItemMovedPlugIn.cs:43) rewrites
  // `PlayerShop` to `Inventory` before sending, so a move into the stall
  // comes back as storage 0, slot `FirstStoreItemSlotIndex + square`
  // (verified live: request ToStorage 4 / ToSlot 204 → `24 00 cc`).
  const shopStorage = storeStorageOf(storage, p.TargetSlot);
  const slot = localIndexOf(shopStorage, p.TargetSlot);

  Store.confirmItemMove(slot, item, shopStorage);

  // A newly stocked shop square starts unpriced (`AddPersonalItemPrice`).
  if (shopStorage === StorageKind.PersonalShop) Economy.stockedShopSquare(slot);
});

/**
 * An inventory-storage slot at or past `FirstStoreItemSlotIndex` is a
 * personal-shop square on OpenMU's wire, whatever storage byte came with it.
 */
function storeStorageOf(storage: StorageKind, wireSlot: number): StorageKind {
  return storage === StorageKind.Inventory &&
    wireSlot >= InventoryConstants.FirstStoreItemSlotIndex
    ? StorageKind.PersonalShop
    : storage;
}

EventBus.on('ItemMoveRequestFailed', () => {
  // A refusal is still an answer, so it times the same round trip.
  NetStats.markAnswered('itemMove');
  console.warn('ItemMoveRequestFailed - rolling the item back');
  Store.rollbackItemMove();
  Store.addNotification(t('notify.cannotMoveItem'), 'error');
});

EventBus.on('ItemAddedToInventory', packet => {
  const p = new ItemAddedToInventoryPacket(packet);

  const item = ItemSerializer.DeserializeItem(new Uint8Array(p.ItemData.buffer));

  // ReceiveItemPickUp (WSclient.cpp:5727-5734) / buy / trade: the pickup clink.
  playUiSound(pickupSound(item));

  runInAction(() => {
    Store.playerData.items[p.InventorySlot] = item;
  });

  Store.syncPlayerAppearance();
});

EventBus.on('ItemRemoved', packet => {
  const p = new ItemRemovedPacket(packet);

  runInAction(() => {
    Store.playerData.items[p.InventorySlot] = null;
  });

  Store.syncPlayerAppearance();
});

/**
 * A jewel was applied (OpenMU `ItemUpgradedPlugIn`): the item at the slot is
 * replaced by the serialised result. The jewel stack itself arrives as
 * `ItemDurabilityChanged` (one less) or `ItemRemoved` (last one), handled
 * above.
 */
EventBus.on('InventoryItemUpgraded', packet => {
  const p = new InventoryItemUpgradedPacket(packet);

  const item = ItemSerializer.DeserializeItem(new Uint8Array(p.ItemData.buffer));

  console.log(`InventoryItemUpgraded slot ${p.InventorySlot}`, item);

  Store.upgradeInventoryItem(p.InventorySlot, item);
});

/**
 * 0x26 0xFD: the use was refused; nothing in the inventory changed. One red
 * system-log line per refusal (`Social` drops an identical line within a
 * second, so a burst of clicks reads as one).
 */
EventBus.on('ItemConsumptionFailed', () => {
  Store.consumptionFailed();
  Store.addNotification(t('notify.cannotUseItem'), 'error');
});

EventBus.on('ItemDurabilityChanged', packet => {
  const p = new ItemDurabilityChangedPacket(packet);

  runInAction(() => {
    const item = Store.playerData.items[p.InventorySlot];
    if (!item) return;

    item.durability = p.Durability;

    if (item.raw && item.raw.length > 2) item.raw[2] = p.Durability;
  });
});

EventBus.on('InventoryMoneyUpdate', packet => {
  const p = new InventoryMoneyUpdatePacket(packet);

  runInAction(() => {
    Store.playerData.money = p.Money;
  });
});
