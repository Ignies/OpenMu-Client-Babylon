/**
 * The storage numbers on the wire, and the trade grid's size.
 *
 * A leaf on purpose: `itemStorage.ts` re-exports these, but it also reaches
 * the item database, which loads the item name files at import time. The
 * marketplace's headless bot runs under bun with no data folder to load, and
 * importing the full module there is fatal before a single packet is sent.
 *
 * The values are OpenMU's `ItemStorageKind`, *not* the generated
 * `StorageTypeEnum` - those two disagree, and the wire wants these.
 */
export const StorageKind = {
  Inventory: 0,
  Trade: 1,
  Vault: 2,
  ChaosMachine: 3,
  PersonalShop: 4,
} as const;

export type StorageKind = (typeof StorageKind)[keyof typeof StorageKind];

export const TRADE_COLUMNS = 8;
export const TRADE_ROWS = 4;
export const TRADE_SLOTS = TRADE_COLUMNS * TRADE_ROWS;
