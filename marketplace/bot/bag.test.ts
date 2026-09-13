import { describe, expect, it } from 'vitest';
import { Bag } from './bag';
import type { BotConnection, Frame, FrameHandler } from './connection';
import { codeOf } from './wire';

/**
 * The bag is how the bot learns where a collected item landed: the server
 * lists the whole inventory after every trade, and the slot that is full now
 * and was empty before is the one. Guessing it - or writing null down - is
 * what left listings on sale that could never be delivered.
 */
class FakeConnection {
  private readonly handlers: FrameHandler[] = [];

  on(handler: FrameHandler): () => void {
    this.handlers.push(handler);
    return () => {
      const i = this.handlers.indexOf(handler);
      if (i >= 0) this.handlers.splice(i, 1);
    };
  }

  deliver(bytes: Uint8Array): void {
    const { code, sub } = codeOf(bytes);
    const frame: Frame = { code, sub, bytes };
    for (const handler of [...this.handlers]) handler(frame);
  }

  asConnection(): BotConnection {
    return this as unknown as BotConnection;
  }
}

/** A 12-byte item as the server serialises it: number in byte 0, level in byte 1, group in byte 5. */
function item(group: number, num: number, level = 0): Uint8Array {
  const data = new Uint8Array(12);
  data[0] = num & 0xff;
  data[1] = (level & 0x0f) << 3;
  data[5] = (group & 0x0f) << 4;
  return data;
}

/** C4 F3 10: count at byte 5, then 13-byte entries of slot + item. */
function inventory(entries: { slot: number; data: Uint8Array }[]): Uint8Array {
  const size = 6 + entries.length * 13;
  const b = new Uint8Array(size);
  b[0] = 0xc4;
  b[1] = (size >> 8) & 0xff;
  b[2] = size & 0xff;
  b[3] = 0xf3;
  b[4] = 0x10;
  b[5] = entries.length;
  let at = 6;
  for (const e of entries) {
    b[at] = e.slot;
    b.set(e.data, at + 1);
    at += 13;
  }
  return b;
}

const jewel = item(14, 13);
const sword = item(0, 1, 5);

describe('the bag', () => {
  it('knows nothing until the server has listed the inventory', () => {
    const bag = new Bag(new FakeConnection().asConnection());
    expect(bag.known).toBe(false);
    expect(bag.snapshot().size).toBe(0);
  });

  it('keeps bag slots only, not equipment and not the stall', () => {
    const connection = new FakeConnection();
    const bag = new Bag(connection.asConnection());
    connection.deliver(
      inventory([
        { slot: 0, data: sword }, // worn
        { slot: 12, data: jewel }, // first bag square
        { slot: 40, data: sword },
        { slot: 204, data: jewel }, // first stall square
      ])
    );
    expect(bag.known).toBe(true);
    expect([...bag.snapshot()].sort((a, b) => a - b)).toEqual([12, 40]);
  });

  it('says which slot appeared since a snapshot', () => {
    const connection = new FakeConnection();
    const bag = new Bag(connection.asConnection());
    connection.deliver(inventory([{ slot: 12, data: jewel }]));
    const before = bag.snapshot();

    connection.deliver(inventory([{ slot: 12, data: jewel }, { slot: 21, data: sword }]));

    expect(bag.newSince(before)).toEqual([21]);
    expect(bag.version).toBe(2);
  });

  it('finds a slot by the exact bytes the trade showed', () => {
    const connection = new FakeConnection();
    const bag = new Bag(connection.asConnection());
    connection.deliver(inventory([{ slot: 12, data: jewel }, { slot: 21, data: sword }]));
    expect(bag.slotOf(sword)).toBe(21);
    expect(bag.slotOf(item(14, 14))).toBeNull();
  });

  it('finds slots by kind, level included', () => {
    const connection = new FakeConnection();
    const bag = new Bag(connection.asConnection());
    connection.deliver(
      inventory([
        { slot: 12, data: jewel },
        { slot: 13, data: jewel },
        { slot: 21, data: sword },
      ])
    );
    expect(bag.slotsMatching({ group: 14, num: 13 })).toEqual([12, 13]);
    expect(bag.slotsMatching({ group: 0, num: 1, lvl: 5 })).toEqual([21]);
    expect(bag.slotsMatching({ group: 0, num: 1, lvl: 0 })).toEqual([]);
  });

  it('resolves a wait once a newer list arrives', async () => {
    const connection = new FakeConnection();
    const bag = new Bag(connection.asConnection());
    const waited = bag.waitForUpdate(0, 1000);
    connection.deliver(inventory([]));
    await expect(waited).resolves.toBeUndefined();
  });

  it('gives up waiting when no list comes', async () => {
    const bag = new Bag(new FakeConnection().asConnection());
    await expect(bag.waitForUpdate(0, 250)).rejects.toThrow();
  });
});

describe('room in the bag', () => {
  // Items in the fixture table: a jewel is 1x1, a Kris (0/0) 1x2, a Small
  // Shield (6/0) 2x2.
  const kris = item(0, 0);
  const shield = item(6, 0);

  it('is judged by rectangles, not by empty squares', () => {
    const connection = new FakeConnection();
    const bag = new Bag(connection.asConnection());
    // Every other square of every row taken by a jewel: 32 free squares,
    // none of them adjacent.
    const entries = [];
    for (let slot = 12; slot < 76; slot += 2) entries.push({ slot, data: jewel });
    connection.deliver(inventory(entries));

    expect(bag.canHold({ group: 14, num: 13 })).toBe(true);
    expect(bag.canHold({ group: 6, num: 0 })).toBe(false);
  });

  it('sees a tall item cover the rows beneath its slot', () => {
    const connection = new FakeConnection();
    const bag = new Bag(connection.asConnection());
    // A Kris in the first square covers the square below it too.
    connection.deliver(inventory([{ slot: 12, data: kris }]));
    expect(bag.occupiedCells().has(0)).toBe(true);
    expect(bag.occupiedCells().has(8)).toBe(true);
    expect(bag.occupiedCells().has(1)).toBe(false);
  });

  it('says a full bag is full', () => {
    const connection = new FakeConnection();
    const bag = new Bag(connection.asConnection());
    const entries = [];
    for (let slot = 12; slot < 76; slot++) entries.push({ slot, data: jewel });
    connection.deliver(inventory(entries));
    expect(bag.canHold({ group: 14, num: 13 })).toBe(false);
    void shield;
  });
});
