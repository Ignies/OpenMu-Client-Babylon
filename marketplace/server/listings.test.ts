import { afterAll, beforeEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// The store opens its database at import time, so the path has to be set
// before anything from it is loaded.
const dir = mkdtempSync(join(tmpdir(), 'mp-test-'));
process.env.MARKETPLACE_DB = join(dir, 'market.sqlite');

const { db } = await import('./db');
const store = await import('./listings');

afterAll(() => {
  // Windows will not unlink a file SQLite still has open, and a temp directory
  // left behind is not worth failing a test run over.
  db.close();
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch {
    // Left for the operating system to clear.
  }
});

beforeEach(() => {
  db.run('DELETE FROM listings');
  db.run('DELETE FROM balances');
  db.run('DELETE FROM audit');
});

const anItem = { group: 14, num: 13, lvl: 0 };

function listed(seller = 'alice', price = 1000) {
  const listing = store.createPending({ seller, sellerCharacter: seller, price, item: anItem, category: 'jewels' });
  store.activate(listing.id, 'MKT001', 12);
  return listing.id;
}

describe('a listing is not on sale until the bot holds the item', () => {
  test('a new listing is pending and invisible to buyers', () => {
    const listing = store.createPending({
      seller: 'alice',
      sellerCharacter: 'Alice',
      price: 1000,
      item: anItem,
      category: 'jewels',
    });

    expect(listing.state).toBe('pending');
    expect(store.browse().total).toBe(0);
  });

  test('it appears once the handover is recorded', () => {
    const id = listed();
    expect(store.byId(id)!.state).toBe('active');
    expect(store.browse().total).toBe(1);
  });

  test('activating something already active does nothing', () => {
    const id = listed();
    expect(store.activate(id, 'MKT002', 13)).toBe(false);
  });
});

describe('claiming', () => {
  test('exactly one of two buyers racing wins', () => {
    const id = listed();

    const first = store.claim(id, 'bob', 'Bob');
    const second = store.claim(id, 'carol', 'Carol');

    expect([first, second]).toEqual([true, false]);
    expect(store.byId(id)!.buyer).toBe('bob');
  });

  test('a claimed listing leaves the catalogue at once', () => {
    const id = listed();
    store.claim(id, 'bob', 'Bob');
    expect(store.browse().total).toBe(0);
  });

  test('releasing puts it back for everyone', () => {
    const id = listed();
    store.claim(id, 'bob', 'Bob');

    expect(store.release(id, 'buyer walked away')).toBe(true);
    expect(store.browse().total).toBe(1);
    expect(store.byId(id)!.buyer).toBeNull();
  });

  test('a listing nobody has claimed cannot be released', () => {
    expect(store.release(listed(), 'nothing to release')).toBe(false);
  });
});

describe('selling', () => {
  test('the price becomes the seller balance, not a delivery', () => {
    const id = listed('alice', 5000);
    store.claim(id, 'bob', 'Bob');

    expect(store.settleSale(id)).toBe(true);
    expect(store.byId(id)!.state).toBe('sold');
    expect(store.balance('alice')).toBe(5000);
  });

  test('an unclaimed listing cannot be settled', () => {
    expect(store.settleSale(listed())).toBe(false);
  });

  test('two sales add up for the same seller', () => {
    for (const price of [1000, 2500]) {
      const id = listed('alice', price);
      store.claim(id, 'bob', 'Bob');
      store.settleSale(id);
    }
    expect(store.balance('alice')).toBe(3500);
  });
});

describe('cancelling', () => {
  test('a seller can take back what nobody has claimed', () => {
    const id = listed('alice');
    expect(store.cancel(id, 'alice')).toBe(true);
    expect(store.byId(id)!.state).toBe('returning');
    expect(store.browse().total).toBe(0);
  });

  test('somebody else cannot cancel it', () => {
    const id = listed('alice');
    expect(store.cancel(id, 'mallory')).toBe(false);
    expect(store.byId(id)!.state).toBe('active');
  });

  test('a claimed listing cannot be pulled out from under the buyer', () => {
    const id = listed('alice');
    store.claim(id, 'bob', 'Bob');
    expect(store.cancel(id, 'alice')).toBe(false);
  });
});

describe('balances', () => {
  test('taking a balance empties it and reports what was taken', () => {
    store.credit('alice', 750);
    expect(store.takeBalance('alice')).toBe(750);
    expect(store.balance('alice')).toBe(0);
  });

  test('taking nothing is not an error', () => {
    expect(store.takeBalance('nobody')).toBe(0);
  });
});

describe('prices are bounded', () => {
  const bad = (price: number) => () =>
    store.createPending({ seller: 'alice', sellerCharacter: 'Alice', price, item: anItem, category: 'jewels' });

  test('zero and negative are refused', () => {
    expect(bad(0)).toThrow();
    expect(bad(-1)).toThrow();
  });

  test('above what a character can hold is refused', () => {
    expect(bad(2_000_000_001)).toThrow();
  });
});

describe('what the bots have to do', () => {
  test('pending, claimed and returning listings are all work', () => {
    const pending = store.createPending({
      seller: 'alice',
      sellerCharacter: 'Alice',
      price: 10,
      item: anItem,
      category: 'jewels',
    });
    const claimed = listed('bob');
    store.claim(claimed, 'carol', 'Carol');
    const returning = listed('dave');
    store.cancel(returning, 'dave');

    const work = store.pendingWork().map(l => l.id).sort();
    expect(work).toEqual([pending.id, claimed, returning].sort());
  });

  test('an active listing is not work - it is just for sale', () => {
    listed();
    expect(store.pendingWork()).toHaveLength(0);
  });
});
