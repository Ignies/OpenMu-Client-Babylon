import { CHAOS_CARD_WIRE_STORAGE, PET_TRAINER_WIRE_STORAGE, SEED_WIRE_STORAGES, StorageKind, localIndexOf } from './itemStorage';
import { CharacterInventoryPacket, InventoryItemUpgradedPacket, InventoryMoneyUpdatePacket, ItemAddedToInventoryPacket, ItemDurabilityChangedPacket, ItemMovedPacket, ItemRemovedPacket } from '@versions/shared/packets/ServerToClientPackets';
import { Economy } from '../economy/economy';
import { EventBus } from '@/core/eventBus';
import { InventoryConstants } from '@/core/inventoryConstants';
import { ItemSerializer } from '@/controllers/item_rules';
import { NetStats } from '@/controllers/net/roundTrip';
import { Bag } from './state';
import { Hero } from '@/modules/hero';
import { addNotification } from '@/modules/chat';
import { pickupSound } from '@/controllers/sound/combatSounds';
import { playUiSound } from '@/controllers/sound/sfx';
import { prefetchItemIcons } from '@/controllers/assets/itemIconPack';
import { runInAction } from 'mobx';
import { t } from '@/i18n';

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
 * An inventory-storage slot at or past `FirstStoreItemSlotIndex` is a
 * personal-shop square on OpenMU's wire, whatever storage byte came with it.
 */
function storeStorageOf(storage: StorageKind, wireSlot: number): StorageKind {
  return storage === StorageKind.Inventory &&
    wireSlot >= InventoryConstants.FirstStoreItemSlotIndex
    ? StorageKind.PersonalShop
    : storage;
}

/** Registers this module's packet listeners (see ../module.ts). */
export function installNet(): void {
  EventBus.on('CharacterInventory', packet => {
    const p = new CharacterInventoryPacket(packet);
    const entries = p.getItems(p.ItemCount).map(item => ({
      slot: item.ItemSlot,
      item: ItemSerializer.DeserializeItem(new Uint8Array(item.ItemData.buffer)),
    }));

    runInAction(() => {
      const items = Hero.items;
      // The whole bag comes in this packet: empty it first, or a character switch
      // keeps the last one's items (DeleteAllItems, WSclient.cpp:1672-1683).
      items.fill(null);
      Economy.myShopItems.fill(null);
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

    Hero.syncPlayerAppearance();
    // Inventory icons start loading now, before the window is ever opened.
    prefetchItemIcons(entries.map(entry => entry.item));
  });

  /**
   * `ReceiveInventoryItemMove`: the server says where the item ended up, and
   * only then is it painted. `TargetStorageType` picks the grid - the same
   * packet lands an item in the inventory, the vault, the trade tray, the
   * chaos machine or the personal shop.
   */
  EventBus.on('ItemMoved', packet => {
    NetStats.markAnswered('itemMove');
    const p = new ItemMovedPacket(packet);

    // The Chaos Card Master's and the seed NPCs' trays are the same local grid as the
    // chaos machine; only the wire byte differs (itemStorage.ts).
    const storage = (
      p.TargetStorageType === CHAOS_CARD_WIRE_STORAGE ||
      p.TargetStorageType === PET_TRAINER_WIRE_STORAGE || // the Pet Trainer's tray
      SEED_WIRE_STORAGES.includes(p.TargetStorageType)
        ? StorageKind.ChaosMachine
        : p.TargetStorageType
    ) as StorageKind;

    if (!KNOWN_STORAGES.includes(storage)) {
      console.warn(`ItemMoved into unknown storage ${storage}`);
      Bag.confirmItemMove(-1, null);
      return;
    }

    const item = ItemSerializer.DeserializeItem(new Uint8Array(p.ItemData.buffer));

    // OpenMU keeps the personal store inside the inventory storage and its
    // ItemMovedPlugIn (RemoteView/Inventory/ItemMovedPlugIn.cs:43) rewrites
    // `PlayerShop` to `Inventory` before sending, so a move into the stall
    // comes back as storage 0, slot `FirstStoreItemSlotIndex + square`
    // (verified live: request ToStorage 4 / ToSlot 204 → `24 00 cc`).
    const shopStorage = storeStorageOf(storage, p.TargetSlot);
    const slot = localIndexOf(shopStorage, p.TargetSlot);

    Bag.confirmItemMove(slot, item, shopStorage);

    // A newly stocked shop square starts unpriced (`AddPersonalItemPrice`).
    if (shopStorage === StorageKind.PersonalShop) Economy.stockedShopSquare(slot);
  });

  EventBus.on('ItemMoveRequestFailed', () => {
    // A refusal is still an answer, so it times the same round trip.
    NetStats.markAnswered('itemMove');
    console.warn('ItemMoveRequestFailed - rolling the item back');
    Bag.rollbackItemMove();
    addNotification(t('notify.cannotMoveItem'), 'error');
  });

  EventBus.on('ItemAddedToInventory', packet => {
    const p = new ItemAddedToInventoryPacket(packet);

    const item = ItemSerializer.DeserializeItem(new Uint8Array(p.ItemData.buffer));

    // ReceiveItemPickUp (WSclient.cpp:5727-5734) / buy / trade: the pickup clink.
    playUiSound(pickupSound(item));

    runInAction(() => {
      Hero.items[p.InventorySlot] = item;
    });

    Hero.syncPlayerAppearance();
  });

  EventBus.on('ItemRemoved', packet => {
    const p = new ItemRemovedPacket(packet);

    runInAction(() => {
      Hero.items[p.InventorySlot] = null;
    });

    Hero.syncPlayerAppearance();
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

    Bag.upgradeInventoryItem(p.InventorySlot, item);
  });

  /**
   * 0x26 0xFD: the use was refused; nothing in the inventory changed. One red
   * system-log line per refusal (`Social` drops an identical line within a
   * second, so a burst of clicks reads as one).
   */
  EventBus.on('ItemConsumptionFailed', () => {
    Bag.consumptionFailed();
    addNotification(t('notify.cannotUseItem'), 'error');
  });

  EventBus.on('ItemDurabilityChanged', packet => {
    const p = new ItemDurabilityChangedPacket(packet);

    runInAction(() => {
      const item = Hero.items[p.InventorySlot];
      if (!item) return;

      item.durability = p.Durability;

      if (item.raw && item.raw.length > 2) item.raw[2] = p.Durability;
    });
    // ReceiveDurability (WSclient.cpp:7164-7167): a use answered.
    if (p.ByConsumption) Bag.useAnswered();
  });

  // ReceiveHelperItem (WSclient.cpp:7172-7193): the Ale or Potion of Soul timer only changes the ping's attack
  // speed and the hero's unused light there; what shows is the use answered.
  EventBus.on('ConsumeItemWithEffect', () => Bag.useAnswered());

  EventBus.on('InventoryMoneyUpdate', packet => {
    const p = new InventoryMoneyUpdatePacket(packet);

    runInAction(() => {
      Hero.money = p.Money;
    });
  });
}
