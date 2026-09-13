import {
  CharacterInventoryPacket,
  ItemMovedPacket,
} from '../../src/common/packets/ServerToClientPackets';
import { InventoryConstants } from '../../src/common/inventoryConstants';
import { StorageKind } from '../../src/common/storageKind';
import type { BotConnection, Frame } from './connection';
import { footprintOf } from './footprint';
import { decodeItem } from './itemMatch';
import { view } from './session';

/**
 * What the bot is carrying, slot by slot, as the server last said.
 *
 * The server never says where a traded item landed: a completed trade sends
 * no item-appear notice at all. What it does send, after every trade and on
 * entering the world, is the whole inventory (`CharacterInventory`, F3 10).
 * So the slot of a collected item is found the reliable way - the bag before
 * the trade against the bag after it - and a listing is only put on sale once
 * that slot is known. Guessing it, or writing null down, is what left items
 * on sale that could never be delivered.
 *
 * Between lists, the bot's own moves are followed from the server's
 * `ItemMoved` answers, so the bag stays right through a trade or a stocking.
 * The stall grid (slots 204 and up) is kept apart from the bag: an item
 * stranded there by an earlier run is findable, and never mistaken for one
 * that can be offered straight from a bag slot.
 */

const CODE = {
  inventory: { code: 0xf3, sub: 0x10 },
  /** The server's answer to a move; sub 0xFF is the refusal. */
  moved: { code: 0x24 },
} as const;

const MOVE_FAILED_SUB = 0xff;

/** The first bag square; below it are the equipment slots. */
const FIRST_BAG_SLOT = InventoryConstants.EquippableSlotsCount;
/** The stall grid sits behind this in the same storage and is not the bag. */
const FIRST_STORE_SLOT = InventoryConstants.FirstStoreItemSlotIndex;
const LAST_STORE_SLOT = FIRST_STORE_SLOT + InventoryConstants.StoreSize - 1;

/** The bag grid a bot has: no extensions, so the base rows only. */
const COLUMNS = InventoryConstants.RowSize;
const ROWS = InventoryConstants.InventoryRows;

export type BagItem = { slot: number; data: Uint8Array };

export type ItemShape = { group: number; num: number; lvl?: number };

export class Bag {
  /** Bag slot -> the item's wire bytes. Equipment and the stall are left out. */
  readonly slots = new Map<number, Uint8Array>();
  /** Stall slot (204 and up) -> the item's wire bytes. */
  readonly stall = new Map<number, Uint8Array>();
  /** Bumped on every list the server sends, so a caller can wait for the next. */
  version = 0;

  private readonly unsubscribe: () => void;

  constructor(
    connection: BotConnection,
    private readonly log: (message: string) => void = () => {}
  ) {
    this.unsubscribe = connection.on(frame => this.handle(frame));
  }

  dispose(): void {
    this.unsubscribe();
  }

  /** True once the server has listed the inventory at least once. */
  get known(): boolean {
    return this.version > 0;
  }

  /** The occupied bag slots right now, for a before-and-after comparison. */
  snapshot(): Set<number> {
    return new Set(this.slots.keys());
  }

  /** Resolves once a list newer than `sinceVersion` has arrived, or rejects. */
  async waitForUpdate(sinceVersion: number, timeoutMs = 5000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (this.version <= sinceVersion) {
      if (Date.now() >= deadline) {
        throw new Error('the server did not list the inventory in time');
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /** Slots occupied now that were empty in `before`. */
  newSince(before: Set<number>): number[] {
    return [...this.slots.keys()].filter(slot => !before.has(slot)).sort((a, b) => a - b);
  }

  /** The bag slot holding exactly these bytes, or null. */
  slotOf(data: Uint8Array): number | null {
    for (const [slot, bytes] of this.slots) {
      if (sameBytes(bytes, data)) return slot;
    }
    return null;
  }

  /** Every bag slot whose item is this kind (group, number and level). */
  slotsMatching(shape: ItemShape): number[] {
    return matching(this.slots, shape);
  }

  /** Every stall slot whose item is this kind. */
  stallSlotsMatching(shape: ItemShape): number[] {
    return matching(this.stall, shape);
  }

  /** Every bag slot whose item satisfies `pred` - the listing's own test, say. */
  slotsWhere(pred: (data: Uint8Array) => boolean): number[] {
    return where(this.slots, pred);
  }

  /** Every stall slot whose item satisfies `pred`. */
  stallSlotsWhere(pred: (data: Uint8Array) => boolean): number[] {
    return where(this.stall, pred);
  }

  /**
   * Empty bag squares, lowest first. A square is not a guarantee - a wide
   * item needs its neighbours free too - so a caller tries them in turn and
   * lets the server refuse the ones that do not fit.
   */
  freeBagSlots(): number[] {
    const out: number[] = [];
    for (let slot = FIRST_BAG_SLOT; slot < FIRST_STORE_SLOT; slot++) {
      if (!this.slots.has(slot)) out.push(slot);
    }
    return out;
  }

  /**
   * The bag's squares that something is standing on, each item covering
   * its footprint from its slot. Squares are numbered from the first bag
   * slot, row by row.
   */
  occupiedCells(): Set<number> {
    const cells = new Set<number>();
    for (const [slot, bytes] of this.slots) {
      const item = decodeItem(bytes);
      const { w, h } = item ? footprintOf(item.group, item.num) : { w: 1, h: 1 };
      const origin = slot - FIRST_BAG_SLOT;
      const row = Math.floor(origin / COLUMNS);
      const col = origin % COLUMNS;
      for (let r = row; r < Math.min(ROWS, row + h); r++) {
        for (let c = col; c < Math.min(COLUMNS, col + w); c++) cells.add(r * COLUMNS + c);
      }
    }
    return cells;
  }

  /**
   * Whether an item of this kind would fit anywhere in the bag right now.
   *
   * The server decides where it lands; this only answers whether there is a
   * rectangle of the item's size left. A bot that says no is not sent to
   * collect - another one is - instead of opening a trade the server then
   * fails for a full inventory, which the bot used to read as the seller
   * backing out.
   */
  canHold(shape: ItemShape): boolean {
    const { w, h } = footprintOf(shape.group, shape.num);
    const taken = this.occupiedCells();
    for (let row = 0; row + h <= ROWS; row++) {
      for (let col = 0; col + w <= COLUMNS; col++) {
        let free = true;
        for (let r = row; r < row + h && free; r++) {
          for (let c = col; c < col + w; c++) {
            if (taken.has(r * COLUMNS + c)) {
              free = false;
              break;
            }
          }
        }
        if (free) return true;
      }
    }
    return false;
  }

  /** What is in a bag slot, or null when it is empty. */
  itemAt(slot: number): (ItemShape & { isExcellent?: boolean }) | null {
    const bytes = this.slots.get(slot) ?? this.stall.get(slot);
    return bytes ? decode(bytes) : null;
  }

  private handle(frame: Frame): void {
    if (frame.code === CODE.inventory.code && frame.sub === CODE.inventory.sub) {
      this.list(frame);
      return;
    }
    if (frame.code === CODE.moved.code && frame.sub !== MOVE_FAILED_SUB) {
      this.follow(frame);
    }
  }

  private list(frame: Frame): void {
    let entries;
    try {
      const packet = new CharacterInventoryPacket(view(frame));
      entries = packet.getItems(packet.ItemCount);
    } catch {
      this.log('could not read a CharacterInventory frame');
      return;
    }

    this.slots.clear();
    this.stall.clear();
    for (const entry of entries) {
      const bytes = copy(entry.ItemData);
      if (entry.ItemSlot >= FIRST_BAG_SLOT && entry.ItemSlot < FIRST_STORE_SLOT) {
        this.slots.set(entry.ItemSlot, bytes);
      } else if (entry.ItemSlot >= FIRST_STORE_SLOT && entry.ItemSlot <= LAST_STORE_SLOT) {
        this.stall.set(entry.ItemSlot, bytes);
      }
    }
    this.version++;
    this.log(
      `bag: ${this.slots.size} item(s) in ${[...this.slots.keys()].join(',') || 'no slots'}` +
        (this.stall.size ? `; stall: ${[...this.stall.keys()].join(',')}` : '')
    );
  }

  /**
   * One of our moves landed. The packet names where the item is now and
   * carries its bytes, not where it came from, so the old entry is found by
   * those bytes. A move onto the trade table or into the vault takes it out
   * of both maps; the list after the trade puts things right regardless.
   */
  private follow(frame: Frame): void {
    let moved;
    try {
      moved = new ItemMovedPacket(view(frame));
    } catch {
      return;
    }
    const bytes = copy(moved.ItemData);
    for (const map of [this.slots, this.stall]) {
      for (const [slot, held] of map) {
        if (sameBytes(held, bytes)) map.delete(slot);
      }
    }
    // The stall is reported as inventory storage at its absolute slot.
    if (moved.TargetStorageType !== StorageKind.Inventory) return;
    if (moved.TargetSlot >= FIRST_STORE_SLOT && moved.TargetSlot <= LAST_STORE_SLOT) {
      this.stall.set(moved.TargetSlot, bytes);
    } else if (moved.TargetSlot >= FIRST_BAG_SLOT && moved.TargetSlot < FIRST_STORE_SLOT) {
      this.slots.set(moved.TargetSlot, bytes);
    }
  }
}

function matching(map: Map<number, Uint8Array>, shape: ItemShape): number[] {
  return where(map, bytes => {
    const item = decodeItem(bytes);
    if (!item) return false;
    if (item.group !== shape.group || item.num !== shape.num) return false;
    return shape.lvl === undefined || item.lvl === shape.lvl;
  });
}

function where(map: Map<number, Uint8Array>, pred: (data: Uint8Array) => boolean): number[] {
  const out: number[] = [];
  for (const [slot, bytes] of map) if (pred(bytes)) out.push(slot);
  return out.sort((a, b) => a - b);
}

/** The listing-facing fields of an item, decoded without the client's serializer. */
function decode(bytes: Uint8Array): (ItemShape & { isExcellent?: boolean }) | null {
  const item = decodeItem(bytes);
  if (!item) return null;
  return { group: item.group, num: item.num, lvl: item.lvl, isExcellent: item.excellentFlags !== 0 };
}

function copy(data: DataView): Uint8Array {
  return new Uint8Array(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
}

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}
