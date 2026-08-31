import type { Item } from '../ecs/world';
import { ItemGroup } from './itemStats';
import { InventoryConstants } from './inventoryConstants';

/**
 * `STORAGE_TYPE` (_define.h:168): the `FromStorage` / `ToStorage` byte of
 * `ItemMoveRequest` and the `TargetStorageType` of `ItemMoved`. Only the
 * five the client can actually open are listed; the mix variants beyond
 * `ChaosMachine` (trainer, Elpis, Osbourne…) all reuse the same window in
 * the original and are not ported.
 */
export const StorageKind = {
  Inventory: 0,
  Trade: 1,
  Vault: 2,
  ChaosMachine: 3,
  PersonalShop: 4,
} as const;

export type StorageKind = (typeof StorageKind)[keyof typeof StorageKind];

/** `COLUMN_*_INVENTORY` / `ROW_*_INVENTORY` (_define.h:150-155). */
export const VAULT_COLUMNS = InventoryConstants.RowSize;
export const VAULT_ROWS = InventoryConstants.WarehouseRows;
export const VAULT_SLOTS = VAULT_COLUMNS * VAULT_ROWS;

export const TRADE_COLUMNS = 8;
export const TRADE_ROWS = 4;
export const TRADE_SLOTS = TRADE_COLUMNS * TRADE_ROWS;

export const MIX_COLUMNS = 8;
export const MIX_ROWS = 4;
export const MIX_SLOTS = MIX_COLUMNS * MIX_ROWS;

export const PERSONAL_SHOP_COLUMNS = InventoryConstants.RowSize;
export const PERSONAL_SHOP_ROWS = InventoryConstants.StoreRows;
export const PERSONAL_SHOP_SLOTS = InventoryConstants.StoreSize;

/**
 * Two index spaces meet here and they are not the same:
 *
 * - the **local index** is where an item sits in the array the client keeps
 *   for that storage. The inventory array carries the 12 worn slots first,
 *   so its grid starts at 12; every other storage array is just its grid.
 * - the **wire slot** is what `ItemMoveRequest` / `ItemMoved` carry. It
 *   matches the local index everywhere except the personal shop, which
 *   OpenMU keeps inside the inventory storage behind
 *   `FirstStoreItemSlotIndex` (the original's `MAX_MY_INVENTORY_EX_INDEX`).
 */

/** Local array index of grid square 0 (`CNewUIInventoryCtrl::nIndexOffset`). */
export function gridFirstIndex(storage: StorageKind): number {
  return storage === StorageKind.Inventory
    ? InventoryConstants.LastEquippableItemSlotIndex + 1
    : 0;
}

export function wireSlotOf(storage: StorageKind, localIndex: number): number {
  return storage === StorageKind.PersonalShop
    ? InventoryConstants.FirstStoreItemSlotIndex + localIndex
    : localIndex;
}

export function localIndexOf(storage: StorageKind, wireSlot: number): number {
  return storage === StorageKind.PersonalShop
    ? wireSlot - InventoryConstants.FirstStoreItemSlotIndex
    : wireSlot;
}

export function storageColumns(storage: StorageKind): number {
  switch (storage) {
    case StorageKind.Inventory:
      return InventoryConstants.RowSize;
    case StorageKind.Vault:
      return VAULT_COLUMNS;
    case StorageKind.Trade:
      return TRADE_COLUMNS;
    case StorageKind.ChaosMachine:
      return MIX_COLUMNS;
    case StorageKind.PersonalShop:
      return PERSONAL_SHOP_COLUMNS;
  }
}

export function storageRows(storage: StorageKind): number {
  switch (storage) {
    case StorageKind.Inventory:
      return InventoryConstants.InventoryRows;
    case StorageKind.Vault:
      return VAULT_ROWS;
    case StorageKind.Trade:
      return TRADE_ROWS;
    case StorageKind.ChaosMachine:
      return MIX_ROWS;
    case StorageKind.PersonalShop:
      return PERSONAL_SHOP_ROWS;
  }
}

const is = (item: Item, group: number, num: number) =>
  item.group === group && item.num === num;

/**
 * The part of `IsStoreBan` / `IsTradeBan` / `IsPersonalShopBan`
 * (ZzzInventory.cpp:7529-7690) this Data copy can express: the Season 6
 * lists name dozens of item numbers that `items.json` here does not carry,
 * so only the entries whose group/number exist are checked - the server
 * refuses the rest anyway and the move rolls back.
 */
const WEAPON_OF_ARCHANGEL = (item: Item) => is(item, ItemGroup.Helper, 19);
const DARK_HORSE_OR_RAVEN = (item: Item) =>
  item.group === ItemGroup.Helper && (item.num === 4 || item.num === 5);
const WIZARDS_RING_PLUS = (item: Item) =>
  is(item, ItemGroup.Helper, 20) && (item.lvl ?? 0) !== 0;
const MOONSTONE_PENDANT = (item: Item) => is(item, ItemGroup.Helper, 38);
const BOX_OF_LUCK_13 = (item: Item) =>
  is(item, ItemGroup.Potion, 11) && (item.lvl ?? 0) === 13;
/** `ITEM_POTION + 21` is the Devil's Eye/Key box; only level 3 may move. */
const QUEST_BOX = (item: Item) =>
  is(item, ItemGroup.Potion, 21) && (item.lvl ?? 0) !== 3;

/** `IsStoreBan`: what the vault refuses. */
export function isVaultBanned(item: Item): boolean {
  return (
    WEAPON_OF_ARCHANGEL(item) ||
    WIZARDS_RING_PLUS(item) ||
    BOX_OF_LUCK_13(item) ||
    QUEST_BOX(item)
  );
}

/** `IsTradeBan`: what cannot cross to another player. */
export function isTradeBanned(item: Item): boolean {
  return (
    MOONSTONE_PENDANT(item) ||
    WEAPON_OF_ARCHANGEL(item) ||
    WIZARDS_RING_PLUS(item) ||
    BOX_OF_LUCK_13(item) ||
    QUEST_BOX(item)
  );
}

/** `IsPersonalShopBan`: what may not be put up for sale. */
export function isPersonalShopBanned(item: Item): boolean {
  return (
    MOONSTONE_PENDANT(item) ||
    WEAPON_OF_ARCHANGEL(item) ||
    WIZARDS_RING_PLUS(item) ||
    BOX_OF_LUCK_13(item) ||
    QUEST_BOX(item) ||
    DARK_HORSE_OR_RAVEN(item)
  );
}

/** The refusal reason a storage has for the carried item, or null. */
export function storageBan(storage: StorageKind, item: Item): string | null {
  switch (storage) {
    case StorageKind.Vault:
      return isVaultBanned(item) ? 'This item cannot be stored' : null;
    case StorageKind.Trade:
      return isTradeBanned(item) ? 'This item cannot be traded' : null;
    case StorageKind.PersonalShop:
      return isPersonalShopBanned(item) ? 'This item cannot be sold in a shop' : null;
    default:
      return null;
  }
}
