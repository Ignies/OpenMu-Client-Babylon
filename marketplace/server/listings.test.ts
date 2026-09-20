import { beforeEach, describe, expect, test } from 'bun:test';
import './testDb';
import { db } from './db';
import * as store from './listings';

beforeEach(() => {
  db.run('DELETE FROM listings');
  db.run('DELETE FROM audit');
});

const anItem = { group: 14, num: 13, lvl: 0 };
let boxes = 0;
const aBox = () => `00000000-0000-4000-8000-${String(++boxes).padStart(12, '0')}`;

function pending(seller = 'alice', price = 1000) {
  return store.createPending({ seller, sellerCharacter: seller, price, item: anItem, category: 'jewels', boxId: aBox() });
}

/** A listing whose box was seen holding the item. */
function listed(seller = 'alice', price = 1000) {
  const listing = pending(seller, price);
  store.apply(listing.id, 'pending', { state: 'active', itemId: `item-${listing.id}`, why: 'test' });
  return listing.id;
}

describe('a listing is not on sale until the box holds the item', () => {
  test('a new listing is pending, names its box, and is invisible to buyers', () => {
    const listing = pending();
    expect(listing.state).toBe('pending');
    expect(listing.boxId).toMatch(/^00000000-0000-4000-8000-/);
    expect(listing.itemId).toBeNull();
    expect(store.browse().total).toBe(0);
  });

  test('it appears once the box is seen holding it, with the item row recorded', () => {
    const id = listed();
    expect(store.byId(id)).toMatchObject({ state: 'active', itemId: `item-${id}` });
    expect(store.browse().total).toBe(1);
  });

  test('a verdict from a stale state is not applied', () => {
    const id = listed();
    expect(store.apply(id, 'pending', { state: 'cancelled', why: 'stale' })).toBe(false);
    expect(store.byId(id)!.state).toBe('active');
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

  test('only the claimant can release it, and then everyone sees it again', () => {
    const id = listed();
    store.claim(id, 'bob', 'Bob');
    expect(store.release(id, 'carol', 'not hers')).toBe(false);
    expect(store.release(id, 'bob', 'no room')).toBe(true);
    expect(store.browse().total).toBe(1);
    expect(store.byId(id)!.buyer).toBeNull();
  });

  test('a claim that timed out goes back on sale with no buyer', () => {
    const id = listed();
    store.claim(id, 'bob', 'Bob');
    store.apply(id, 'claimed', { state: 'active', why: 'the buyer never came' });
    expect(store.byId(id)).toMatchObject({ state: 'active', buyer: null, buyerCharacter: null });
  });
});

describe('selling', () => {
  test('the box money becomes the proceeds the seller collects', () => {
    const id = listed('alice', 5000);
    store.claim(id, 'bob', 'Bob');
    store.apply(id, 'claimed', { state: 'sold', proceeds: 4750, why: 'money in the box' });
    expect(store.byId(id)).toMatchObject({ state: 'sold', proceeds: 4750, buyer: 'bob' });
    expect(store.owed('alice')).toBe(4750);
    expect(store.soldBy('alice').map(l => l.id)).toEqual([id]);
  });

  test('collected sales stop being owed and leave the seller list', () => {
    const id = listed('alice', 5000);
    store.claim(id, 'bob', 'Bob');
    store.apply(id, 'claimed', { state: 'sold', proceeds: 5000, why: 'test' });
    store.apply(id, 'sold', { state: 'paid', why: 'collected' });
    expect(store.owed('alice')).toBe(0);
    expect(store.bySeller('alice')).toHaveLength(0);
  });
});

describe('cancelling', () => {
  test('a seller can take back what nobody has claimed', () => {
    const id = listed('alice');
    expect(store.startReturn(id, 'alice')).toBe(true);
    expect(store.byId(id)!.state).toBe('returning');
    expect(store.browse().total).toBe(0);
  });

  test('somebody else cannot', () => {
    const id = listed('alice');
    expect(store.startReturn(id, 'mallory')).toBe(false);
    expect(store.byId(id)!.state).toBe('active');
  });

  test('a claimed listing cannot be pulled out from under the buyer', () => {
    const id = listed('alice');
    store.claim(id, 'bob', 'Bob');
    expect(store.startReturn(id, 'alice')).toBe(false);
  });

  test('a pending listing whose item never left is simply dropped', () => {
    const { id } = pending('alice');
    expect(store.cancelPending(id, 'mallory', 'no')).toBe(false);
    expect(store.cancelPending(id, 'alice', 'changed their mind')).toBe(true);
    expect(store.byId(id)!.state).toBe('cancelled');
  });
});

describe('the catalogue entry', () => {
  test('is corrected from the box and can carry the server bytes', () => {
    const id = listed();
    store.patchItem(id, { group: 12, num: 7, lvl: 3 });
    store.patchItem(id, { raw: [7, 24, 255, 0, 0, 0xc0, 0, 0, 0, 0, 0, 0] });
    const item = store.byId(id)!.item;
    expect(item).toMatchObject({ group: 12, num: 7, lvl: 3 });
    expect(item.raw).toHaveLength(12);
    expect(db.query('SELECT item_group, item_number, item_level FROM listings WHERE id = ?').get(id)).toEqual({
      item_group: 12,
      item_number: 7,
      item_level: 3,
    });
  });
});

describe('prices are bounded', () => {
  const bad = (price: number) => () =>
    store.createPending({ seller: 'alice', sellerCharacter: 'Alice', price, item: anItem, category: 'jewels', boxId: aBox() });

  test('zero and negative are refused', () => {
    expect(bad(0)).toThrow();
    expect(bad(-1)).toThrow();
  });

  test('above what a character can hold is refused', () => {
    expect(bad(2_000_000_001)).toThrow();
  });
});

describe('what the sweep looks at', () => {
  test('rows by state, only those that changed before the deadline', () => {
    const fresh = pending('alice').id;
    const stale = pending('bob').id;
    db.query('UPDATE listings SET updated_at = ? WHERE id = ?').run(Date.now() - 10 * 60_000, stale);

    expect(store.inState('pending', Date.now() - 5 * 60_000).map(l => l.id)).toEqual([stale]);
    expect(store.inState('pending').map(l => l.id).sort()).toEqual([fresh, stale].sort());
  });
});

describe('history', () => {
  test('tells a seller how each listing ended', () => {
    const sold = listed('alice', 1000);
    store.claim(sold, 'bob', 'BobDk');
    store.apply(sold, 'claimed', { state: 'sold', proceeds: 1000, why: 'test' });
    const dropped = pending('alice').id;
    store.cancelPending(dropped, 'alice', 'changed their mind');
    const waiting = pending('alice').id;

    const byId = new Map(store.historyFor('alice').map(r => [r.id, r]));
    expect(byId.get(sold)).toMatchObject({ kind: 'sale', status: 'success', note: 'sold to BobDk, waiting to be collected' });
    expect(byId.get(dropped)).toMatchObject({ kind: 'sale', status: 'failed', note: 'never listed' });
    expect(byId.get(waiting)).toMatchObject({ kind: 'sale', status: 'pending', note: 'waiting for the item' });
    expect(byId.get(sold)).not.toHaveProperty('bot');
  });

  test('shows a buyer their purchase', () => {
    const id = listed('alice', 1000);
    store.claim(id, 'bob', 'BobDk');
    store.apply(id, 'claimed', { state: 'sold', proceeds: 1000, why: 'test' });
    expect(store.historyFor('bob')[0]).toMatchObject({ kind: 'purchase', status: 'success', note: 'bought', zen: 1000 });
  });
});
