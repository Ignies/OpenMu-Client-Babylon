import { makeObservable, observable, runInAction } from 'mobx';
import { t } from '@/i18n';
import type { Item } from '@/ecs/world';
import { InventoryConstants } from '@/core/inventoryConstants';
import {
  ConsumeItemRequestPacket,
  DropItemRequestPacket,
  ItemMoveRequestPacket,
} from '@versions/shared/packets/ClientToServerPackets';
import { NetStats } from '@/controllers/net';
import { consumeSound, playUiSound, upgradedItemSound } from '@/controllers/sound';
import { ItemSerializer, itemStats, learnableSkill } from '@/controllers/item_rules';
import { ItemsDatabase } from '@versions/shared/items/itemsDatabase';
import { skillDefinition } from '@versions/shared/skills/skillsDatabase';
import { addNotification } from '../chat';
import { Session } from '../session';
import { Hero } from '../hero';
import { HeroSkills } from '../skills';
import { learnSkillError } from '../skills/skillItems';
import {
  StorageKind,
  gridFirstIndex,
  storageBan,
  storageColumns,
  storageRows,
  wireSlotOf,
} from './itemStorage';
import {
  HOTKEY_COUNT,
  ItemHotkey,
  UNBOUND_HOTKEY,
  canRegisterItemHotkey,
  findHotkeyItem,
} from './itemHotkeys';
import { jewelTargetError } from './jewelUpgrade';

/** How long an item move (or a merchant buy) waits for the server's answer. */
export const ITEM_MOVE_TIMEOUT = 5000;

/**
 * `CNewUIPickedItem`: the item hanging off the cursor, together with the
 * grid it was lifted out of. The storage matters because the move packet
 * carries both ends (`FromStorage` / `ToStorage`) and because a refusal has
 * to put the item back where it came from.
 */
export type PickedItem = {
  item: Item;
  fromSlot: number;
  fromStorage: StorageKind;
};

/**
 * What the bag needs from the economy (vault, trade, chaos machine, personal shop), set by
 * `economy/economy.ts` when it loads, so the bag does not import it back.
 */
export type EconomyGrids = {
  items(storage: StorageKind): (Item | null)[];
  /** The mix tray's wire storage: 3 for the goblin, 9 for the Chaos Card Master. */
  mixWireStorage(): number;
  /** A vault or a trade is open (`Economy.autoMoveTarget`): nothing is used then. */
  storageOpen(): boolean;
};

/** The squares an item takes (`ItemAttribute` Width / Height). */
export function itemSize(item: Item): { w: number; h: number } {
  const config = ItemsDatabase.getItem(item.group, item.num);
  return { w: config?.X ?? 1, h: config?.Y ?? 1 };
}

function serializeItemBytes(item: Item): number[] {
  if (item.raw && item.raw.length === ItemSerializer.NeededSpace) {
    return item.raw;
  }

  const bytes = new Uint8Array(ItemSerializer.NeededSpace);
  ItemSerializer.SerializeItem(bytes, item);
  return Array.from(bytes);
}

/**
 * The hero's hands on items: the item on the cursor, the move waiting for the server, the
 * Q/W/E/R potion keys, and the actions that move, use, drop and learn from items in any open grid.
 */
export const Bag = new (class {
  pickedItem: PickedItem | null = null;

  /** Q/W/E/R consumable kinds (`CNewUIItemHotKey`); unbound = the key's default potion. */
  itemHotkeys: ItemHotkey[] = Array.from({ length: HOTKEY_COUNT }, () => UNBOUND_HOTKEY);

  pendingItemMove: {
    fromStorage: StorageKind;
    fromSlot: number;
    toStorage: StorageKind;
    toSlot: number;
  } | null = null;

  private pendingItemMoveTimer: ReturnType<typeof setTimeout> | null = null;

  private consumeBlockedUntil = 0;

  /** The economy's grids, handed in by `economy/economy.ts` when it loads (see `EconomyGrids`). */
  grids: EconomyGrids | null = null;

  /**
   * The grid behind a storage kind. The inventory is the hero's own array;
   * vault, trade, chaos machine and the personal shop belong to `Economy`.
   */
  itemsOfStorage(storage: StorageKind): (Item | null)[] {
    if (storage === StorageKind.Inventory) return Hero.items;
    return this.grids?.items(storage) ?? [];
  }

  pickInventoryItem(slot: number): void {
    this.pickItem(StorageKind.Inventory, slot);
  }

  /** `CNewUIInventoryCtrl::PickItem`: lift a square out of any open grid. */
  pickItem(storage: StorageKind, slot: number): void {
    if (this.pickedItem || this.pendingItemMove) return;

    const items = this.itemsOfStorage(storage);
    // An empty square (or one outside the grid) lifts nothing: never let a
    // `null` / `undefined` become the carried item.
    if (!Number.isInteger(slot) || slot < 0 || slot >= items.length) return;
    const item = items[slot];
    if (!item) return;

    runInAction(() => {
      items[slot] = null;
      this.pickedItem = { item, fromSlot: slot, fromStorage: storage };
      if (storage === StorageKind.Inventory) Hero.syncPlayerAppearance();
    });
  }

  cancelPickedItem(): void {
    const picked = this.pickedItem;
    if (!picked || this.pendingItemMove) return;

    runInAction(() => {
      this.itemsOfStorage(picked.fromStorage)[picked.fromSlot] = picked.item;
      this.pickedItem = null;
      if (picked.fromStorage === StorageKind.Inventory) Hero.syncPlayerAppearance();
    });
  }

  /**
   * `SendRequestEquipmentItem`: drop the carried item on a square of
   * `toStorage`. The client only paints the result once the server answers
   * with `ItemMoved`, so the square stays empty in the meantime.
   */
  placePickedItem(toSlot: number, toStorage: StorageKind = StorageKind.Inventory): void {
    const picked = this.pickedItem;
    // Nothing carried (or a carried record without an item) places nothing.
    if (!picked?.item || this.pendingItemMove) return;

    if (toSlot === picked.fromSlot && toStorage === picked.fromStorage) {
      this.cancelPickedItem();
      return;
    }

    // `IsStoreBan` / `IsTradeBan` / `IsPersonalShopBan`: refuse before the
    // packet goes out, the way the original logs it and puts the item back.
    const ban = storageBan(toStorage, picked.item);
    if (ban) {
      addNotification(t(ban), 'error');
      this.cancelPickedItem();
      return;
    }

    if (Session.isOffline) {
      runInAction(() => {
        this.itemsOfStorage(toStorage)[toSlot] = picked.item;
        this.pickedItem = null;
        Hero.syncPlayerAppearance();
      });
      return;
    }

    this.moveItemRequest(
      picked.fromStorage,
      picked.fromSlot,
      toStorage,
      toSlot,
      picked.item
    );
  }

  /**
   * Move an item to a named square of the same grid: the drag's lift and
   * drop in one call, for the auto-arrange run (`modules/inventory/inventorySort.ts`).
   * Returns false when the move cannot be started.
   */
  moveItemToSquare(storage: StorageKind, fromSlot: number, toSlot: number): boolean {
    if (this.pickedItem || this.pendingItemMove) return false;

    const items = this.itemsOfStorage(storage);
    const item = items[fromSlot];
    if (!item || items[toSlot]) return false;

    if (Session.isOffline) {
      runInAction(() => {
        items[fromSlot] = null;
        items[toSlot] = item;
        Hero.syncPlayerAppearance();
      });
      return true;
    }

    runInAction(() => {
      items[fromSlot] = null;
      this.pickedItem = { item, fromSlot, fromStorage: storage };
      if (storage === StorageKind.Inventory) Hero.syncPlayerAppearance();
    });

    this.moveItemRequest(storage, fromSlot, storage, toSlot, item);
    return true;
  }

  /**
   * The raw `ItemMoveRequest` (0x24), with the pending-move guard. Slots go
   * in as local array indices; the packet carries the wire slots.
   */
  moveItemRequest(
    fromStorage: StorageKind,
    fromSlot: number,
    toStorage: StorageKind,
    toSlot: number,
    item: Item
  ): void {
    // The mix tray's wire byte depends on the NPC that owns it: 3 for the
    // goblin, 9 for the Chaos Card Master (modules/economy/economy.ts `mixWireStorage`).
    const wireStorage = (storage: StorageKind): number =>
      storage === StorageKind.ChaosMachine ? this.grids?.mixWireStorage() ?? storage : storage;

    const packet = ItemMoveRequestPacket.createPacket();
    packet.FromStorage = wireStorage(fromStorage);
    packet.FromSlot = wireSlotOf(fromStorage, fromSlot);
    packet.ToStorage = wireStorage(toStorage);
    packet.ToSlot = wireSlotOf(toStorage, toSlot);
    packet.setItemData(serializeItemBytes(item), 12);

    this.beginItemMove(fromStorage, fromSlot, toStorage, toSlot);
    NetStats.markSent('itemMove');
    Session.sendToGS(packet.buffer);
  }

  /**
   * `FindEmptySlot` on the far grid: the local index a right-click sends the
   * item to (`ProcessStorageItemAutoMove`), or -1 when there is no room.
   */
  findFreeSquare(storage: StorageKind, item: Item): number {
    const items = this.itemsOfStorage(storage);
    const columns = storageColumns(storage);
    const rows = storageRows(storage);
    const offset = gridFirstIndex(storage);
    const { w, h } = itemSize(item);

    const used = new Uint8Array(columns * rows);
    for (let square = 0; square < columns * rows; square++) {
      const placed = items[offset + square];
      if (!placed) continue;
      const size = itemSize(placed);
      const column = square % columns;
      const row = (square - column) / columns;
      for (let y = 0; y < size.h; y++) {
        for (let x = 0; x < size.w; x++) {
          if (column + x < columns && row + y < rows) {
            used[(row + y) * columns + column + x] = 1;
          }
        }
      }
    }

    for (let row = 0; row + h <= rows; row++) {
      for (let column = 0; column + w <= columns; column++) {
        let fits = true;
        for (let y = 0; y < h && fits; y++) {
          for (let x = 0; x < w; x++) {
            if (used[(row + y) * columns + column + x]) {
              fits = false;
              break;
            }
          }
        }
        if (fits) return offset + row * columns + column;
      }
    }

    return -1;
  }

  /**
   * `ProcessStorageItemAutoMove` / `ProcessMyInvenItemAutoMove`: the right
   * click that shuttles an item between the inventory and the open storage
   * without picking it up first.
   */
  autoMoveItem(fromStorage: StorageKind, fromSlot: number, toStorage: StorageKind): void {
    if (this.pickedItem || this.pendingItemMove) return;

    const item = this.itemsOfStorage(fromStorage)[fromSlot];
    if (!item) return;

    const ban = storageBan(toStorage, item);
    if (ban) {
      addNotification(t(ban), 'error');
      return;
    }

    const toSlot = this.findFreeSquare(toStorage, item);
    if (toSlot < 0) {
      addNotification(t('notify.noRoomForItem'), 'error');
      return;
    }

    if (Session.isOffline) {
      runInAction(() => {
        this.itemsOfStorage(fromStorage)[fromSlot] = null;
        this.itemsOfStorage(toStorage)[toSlot] = item;
        Hero.syncPlayerAppearance();
      });
      playUiSound('getItem');
      return;
    }

    runInAction(() => {
      this.itemsOfStorage(fromStorage)[fromSlot] = null;
      this.pickedItem = { item, fromSlot, fromStorage };
      if (fromStorage === StorageKind.Inventory) Hero.syncPlayerAppearance();
    });

    this.moveItemRequest(fromStorage, fromSlot, toStorage, toSlot, item);
  }

  /** Ctrl+Q/W/E/R over an inventory item, or a carried potion dropped on the bar. */
  setItemHotkey(hotkey: number, item: Item | null): void {
    if (hotkey < 0 || hotkey >= HOTKEY_COUNT) return;
    const next = this.itemHotkeys.slice();
    next[hotkey] =
      item && canRegisterItemHotkey(item)
        ? { type: item.num, level: item.lvl ?? 0 }
        : UNBOUND_HOTKEY;
    this.itemHotkeys = next;
  }

  /** The inventory slot the Q/W/E/R key would consume right now, or -1. */
  hotkeyItemSlot(hotkey: number): number {
    return findHotkeyItem(Hero.items, hotkey, this.itemHotkeys[hotkey]);
  }

  /** Q/W/E/R pressed or the bar slot right-clicked (`CNewUIItemHotKey::UpdateKeyEvent`). */
  useItemHotkey(hotkey: number): void {
    const slot = this.hotkeyItemSlot(hotkey);
    if (slot >= 0) this.consumeItemRequest(slot);
  }

  /**
   * No server to answer in the offline scene: eat the potion here so the bar
   * and inventory behave (apple 10% .. large 100%, the original's tables).
   */
  private consumeItemOffline(slot: number): void {
    const item = Hero.items[slot];
    if (!item || item.group !== 14) return;

    const now = Date.now();
    if (now < this.consumeBlockedUntil) return;
    this.consumeBlockedUntil = now + 300;

    const n = item.num;
    const pd = Hero;
    const isHp = n <= 3;
    const isMp = n >= 4 && n <= 6;
    const isSd = n >= 35 && n <= 37;
    const isComplex = n >= 38 && n <= 40;
    const size = isHp ? n : isMp ? n - 3 : isSd ? n - 34 : isComplex ? n - 37 : 0;
    const ratio = [0.1, 0.3, 0.5, 1][size];
    const heal = (cur: number, max: number) => Math.min(max, cur + Math.ceil(max * ratio));

    runInAction(() => {
      if (isHp || isComplex) pd.currentHP = heal(pd.currentHP, pd.maxHP);
      if (isMp || isComplex) pd.currentMP = heal(pd.currentMP, pd.maxMP);
      if (isSd || isComplex) pd.currentSD = heal(pd.currentSD, pd.maxSD);

      const left = (item.durability ?? 1) - 1;
      if (left > 0) item.durability = left;
      else pd.items[slot] = null;
    });

    const used = consumeSound(item.group, n);
    if (used) playUiSound(used);
  }

  /**
   * Right click on an orb / scroll / crystal (`CNewUIMyInventory::UseItem`,
   * NewUIMyInventory.cpp:1865): learn the skill it teaches. Returns false
   * when the item at `slot` teaches nothing (the caller may drink or equip
   * it instead); true when the click was handled - the request went out,
   * the skill was learned offline, or the reason it cannot be was said.
   * The server answers with `SkillAdded` (F3 11) and removes the item, or
   * with `ItemConsumptionFailed`.
   */
  learnSkillItem(slot: number): boolean {
    const item = Hero.items[slot];
    if (!item) return false;

    const number = learnableSkill(item);
    if (number === undefined) return false;

    const stats = itemStats(item);
    if (!stats) return false;

    const error = learnSkillError(
      item,
      stats,
      Hero.heroStats(),
      HeroSkills.skills.map(s => s.number)
    );
    if (error) {
      addNotification(error, 'error');
      return true;
    }

    if (Session.isOffline) {
      // No server to answer: the scroll is read here so the skill list (K)
      // and the hot keys behave.
      const index = HeroSkills.skills.reduce((max, s) => Math.max(max, s.index), -1) + 1;
      runInAction(() => {
        Hero.items[slot] = null;
        HeroSkills.addSkill({ index, number, level: 0 });
      });
      const name = skillDefinition(number)?.name ?? 'the skill';
      addNotification(t('notify.learnedSkill', { name }), 'info');
      return true;
    }

    this.consumeItemRequest(slot);
    return true;
  }

  consumeItemRequest(slot: number, targetSlot = 0): void {
    if (Session.isOffline) {
      this.consumeItemOffline(slot);
      return;
    }

    // OpenMU refuses any consume unless PlayerState == EnteredWorld: a merchant
    // window still open makes a scroll / potion fail with a bare
    // ItemConsumptionFailed. The original closes the shop on the use click.
    this.beforeConsume?.();

    const now = Date.now();
    if (now < this.consumeBlockedUntil) return;
    this.consumeBlockedUntil = now + 300;

    const consumed = Hero.items[slot];
    const used = consumed ? consumeSound(consumed.group, consumed.num) : null;
    if (used) playUiSound(used);

    const packet = ConsumeItemRequestPacket.createPacket();
    packet.ItemSlot = slot;
    packet.TargetSlot = targetSlot;
    packet.FruitConsumption = 0;

    Session.sendToGS(packet.buffer);
  }

  /**
   * `CNewUIMyInventory::ApplyJewels` (NewUIMyInventory.cpp:1546): the carried
   * jewel is clicked onto the item at `targetSlot`. The jewel goes back to
   * its square and the 0x26 ConsumeItemRequest carries the target; the server
   * answers with `InventoryItemUpgraded` for the item and a durability /
   * removal packet for the jewel stack, or `ItemConsumptionFailed`.
   * Returns false when the drop was not a jewel use at all (caller may move).
   */
  applyPickedJewel(targetSlot: number): boolean {
    const picked = this.pickedItem;
    if (!picked?.item || this.pendingItemMove) return false;
    if (picked.fromStorage !== StorageKind.Inventory) return false;

    const target = Hero.items[targetSlot];
    if (!target || targetSlot === picked.fromSlot) return false;

    // `ApplyJewels` on worn gear: said, not swallowed - the equipment slot's
    // click handler returns right after this call, so the refusal text is
    // the only feedback there is.
    if (targetSlot < InventoryConstants.EquippableSlotsCount) {
      addNotification(
        jewelTargetError(picked.item, target, targetSlot) ?? t('item.takeItemOffFirst'),
        'error'
      );
      return true;
    }

    // `IsCanUseItem` (ZzzInventory.cpp:510, GlobalText[474]): nothing is
    // used while the vault or a trade is open.
    if (this.grids?.storageOpen()) {
      addNotification(t('notify.storageOpen'), 'error');
      return true;
    }

    const error = jewelTargetError(picked.item, target, targetSlot);
    if (error) {
      // The original keeps the jewel on the cursor; a wrong square is a no-op.
      addNotification(error, 'error');
      return true;
    }

    if (Session.isOffline) {
      addNotification(t('notify.upgradeNeedsServer'), 'error');
      return true;
    }

    // Jewel back on its square so the stack packet that follows finds it.
    this.cancelPickedItem();
    // ApplyJewels: SOUND_GET_ITEM01 on the click, the jewel sound on the answer.
    playUiSound('getItem');
    this.consumeItemRequest(picked.fromSlot, targetSlot);
    return true;
  }

  /** `InventoryItemUpgraded` (0xF3 0x14): the item at `slot` is what the server says now. */
  upgradeInventoryItem(slot: number, item: Item): void {
    runInAction(() => {
      Hero.items[slot] = item;
      this.consumeBlockedUntil = 0;
      Hero.syncPlayerAppearance();
    });
    playUiSound(upgradedItemSound(item.group, item.num));
  }

  /**
   * `ItemConsumptionFailed` (0x26 0xFD): nothing happened. The 300 ms
   * lock-out set by the request is left running: the refusal arrives within
   * a few ms, and clearing it let every further click send a new request
   * (and draw a new refusal) as fast as the mouse could go.
   */
  consumptionFailed(): void {}

  dropPickedItem(x: number, y: number): void {
    const picked = this.pickedItem;
    if (!picked || this.pendingItemMove) return;

    // `SendRequestDropItem` addresses the inventory only: an item lifted out
    // of the vault or a trade goes back where it came from.
    if (picked.fromStorage !== StorageKind.Inventory) {
      this.cancelPickedItem();
      return;
    }

    if (Session.isOffline) {
      this.cancelPickedItem();
      return;
    }

    const packet = DropItemRequestPacket.createPacket();
    packet.TargetX = x;
    packet.TargetY = y;
    packet.ItemSlot = picked.fromSlot;

    this.beginItemMove(
      picked.fromStorage,
      picked.fromSlot,
      StorageKind.Inventory,
      -1
    );
    Session.sendToGS(packet.buffer);
  }

  beginItemMove(
    fromStorage: StorageKind,
    fromSlot: number,
    toStorage: StorageKind,
    toSlot: number
  ): void {
    runInAction(() => {
      this.pendingItemMove = { fromStorage, fromSlot, toStorage, toSlot };
    });

    if (this.pendingItemMoveTimer) clearTimeout(this.pendingItemMoveTimer);

    this.pendingItemMoveTimer = setTimeout(() => {
      if (!this.pendingItemMove) return;

      console.warn('Item move timed out with no answer - rolling it back');
      this.rollbackItemMove();
      addNotification(t('notify.noAnswerRestored'), 'error');
    }, ITEM_MOVE_TIMEOUT);
  }

  confirmItemMove(
    toSlot: number,
    item?: Item | null,
    toStorage: StorageKind = StorageKind.Inventory
  ): void {
    this.clearItemMoveTimer();

    runInAction(() => {
      const moved = item ?? this.pickedItem?.item ?? null;

      if (moved && toSlot >= 0) this.itemsOfStorage(toStorage)[toSlot] = moved;
      // ReceiveInventoryItemMove (WSclient.cpp:6133): SOUND_GET_ITEM01.
      if (toSlot >= 0) playUiSound('getItem');

      this.pickedItem = null;
      this.pendingItemMove = null;
      Hero.syncPlayerAppearance();
    });
  }

  rollbackItemMove(): void {
    this.clearItemMoveTimer();

    runInAction(() => {
      const picked = this.pickedItem;
      const pending = this.pendingItemMove;

      const fromSlot = pending?.fromSlot ?? picked?.fromSlot;
      const fromStorage =
        pending?.fromStorage ?? picked?.fromStorage ?? StorageKind.Inventory;
      const source = this.itemsOfStorage(fromStorage);

      if (picked && fromSlot != null && !source[fromSlot]) {
        source[fromSlot] = picked.item;
      }

      this.pickedItem = null;
      this.pendingItemMove = null;
      Hero.syncPlayerAppearance();
    });
  }

  private clearItemMoveTimer(): void {
    if (!this.pendingItemMoveTimer) return;

    clearTimeout(this.pendingItemMoveTimer);
    this.pendingItemMoveTimer = null;
  }

  /** Runs before a use goes out: the merchant closes its window (set by the npc_shop module). */
  beforeConsume: (() => void) | null = null;

  constructor() {
    makeObservable(this, {
      pickedItem: observable,
      itemHotkeys: observable,
      pendingItemMove: observable,
    });
  }
})();
