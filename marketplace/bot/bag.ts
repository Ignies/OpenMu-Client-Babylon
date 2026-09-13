import {
  CharacterInventoryPacket,
  ItemMovedPacket,
} from '../../src/common/packets/ServerToClientPackets';
import { InventoryConstants } from '../../src/common/inventoryConstants';
import { StorageKind } from '../../src/common/storageKind';
import type { BotConnection, Frame } from './connection';
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
  const out: number[] = [];
  for (const [slot, bytes] of map) {
    const item = decode(bytes);
    if (!item) continue;
    if (item.group !== shape.group || item.num !== shape.num) continue;
    if (shape.lvl !== undefined && (item.lvl ?? 0) !== shape.lvl) continue;
    out.push(slot);
  }
  return out.sort((a, b) => a - b);
}

/**
 * The three fields a listing is matched on, read straight off the 12-byte
 * item (the layout `src/common/itemSerializer.ts` reads in full). Only these
 * three: the client's serializer pulls the whole data folder in behind it,
 * which a headless bot cannot load.
 */
function decode(bytes: Uint8Array): (ItemShape & { isExcellent?: boolean }) | null {
  if (bytes.length < 6) return null;
  return {
    num: bytes[0] + ((bytes[3] & 0x80) << 1),
    group: (bytes[5] & 0xf0) >> 4,
    lvl: (bytes[1] & 0x78) >> 3,
    isExcellent: (bytes[3] & 0x3f) !== 0,
  };
}

function copy(data: DataView): Uint8Array {
  return new Uint8Array(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
}

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}
