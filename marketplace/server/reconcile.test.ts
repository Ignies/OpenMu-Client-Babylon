import { describe, expect, test } from 'bun:test';
import type { BoxState } from './boxes';
import { CLAIM_TTL_MS, PENDING_TTL_MS, RETURN_TTL_MS, verdict } from './reconcile';

const now = 1_700_000_000_000;
const item = { id: 'item-1', group: 14, number: 13, level: 0, durability: 1 };
const held: BoxState = { exists: true, money: 0, item };
const paid: BoxState = { exists: true, money: 4500, item: null };
const emptyBox: BoxState = { exists: true, money: 0, item: null };
const gone: BoxState = { exists: false, money: 0, item: null };

const fresh = (state: Parameters<typeof verdict>[0]['state']) => ({ state, itemId: 'item-1', updatedAt: now });
const old = (state: Parameters<typeof verdict>[0]['state'], ttl: number) => ({
  state,
  itemId: 'item-1',
  updatedAt: now - ttl - 1,
});

describe('pending', () => {
  test('goes on sale once the box holds the item, and records which item', () => {
    expect(verdict({ ...fresh('pending'), itemId: null }, held, now)).toMatchObject({ state: 'active', itemId: 'item-1' });
  });

  test('waits while there is no box and the seller may still send the token', () => {
    expect(verdict({ ...fresh('pending'), itemId: null }, gone, now)).toBeNull();
  });

  test('is dropped when no box appeared in time', () => {
    expect(verdict({ ...old('pending', PENDING_TTL_MS), itemId: null }, gone, now)).toMatchObject({ state: 'cancelled' });
  });
});

describe('claimed', () => {
  test('is sold when the box holds money instead of the item', () => {
    expect(verdict(fresh('claimed'), paid, now)).toMatchObject({ state: 'sold', proceeds: 4500 });
  });

  test('stays claimed while the buyer may still send the token', () => {
    expect(verdict(fresh('claimed'), held, now)).toBeNull();
  });

  test('goes back on sale when the buyer never came', () => {
    expect(verdict(old('claimed', CLAIM_TTL_MS), held, now)).toMatchObject({ state: 'active' });
  });

  test('a box that vanished is an anomaly, not a sale', () => {
    expect(verdict(fresh('claimed'), gone, now)).toMatchObject({ state: 'cancelled', anomaly: true });
  });
});

describe('returning', () => {
  test('is cancelled once the box is gone', () => {
    expect(verdict(fresh('returning'), gone, now)).toMatchObject({ state: 'cancelled' });
  });

  test('goes back on sale when the seller never took it', () => {
    expect(verdict(fresh('returning'), held, now)).toBeNull();
    expect(verdict(old('returning', RETURN_TTL_MS), held, now)).toMatchObject({ state: 'active' });
  });

  test('money in the box means it sold after all', () => {
    expect(verdict(fresh('returning'), paid, now)).toMatchObject({ state: 'sold', proceeds: 4500, anomaly: true });
  });
});

describe('sold', () => {
  test('is paid once the seller collected and the box is gone', () => {
    expect(verdict(fresh('sold'), gone, now)).toMatchObject({ state: 'paid' });
    expect(verdict(fresh('sold'), paid, now)).toBeNull();
  });
});

describe('active', () => {
  test('is left alone while the box holds the item', () => {
    expect(verdict(fresh('active'), held, now)).toBeNull();
  });

  test('a box gone or emptied behind our back is logged and cancelled', () => {
    expect(verdict(fresh('active'), gone, now)).toMatchObject({ state: 'cancelled', anomaly: true });
    expect(verdict(fresh('active'), emptyBox, now)).toMatchObject({ state: 'cancelled', anomaly: true });
  });

  test('money in the box is still a sale', () => {
    expect(verdict(fresh('active'), paid, now)).toMatchObject({ state: 'sold', proceeds: 4500 });
  });
});

describe('finished', () => {
  test('paid and cancelled never move', () => {
    for (const box of [held, paid, gone, emptyBox]) {
      expect(verdict(fresh('paid'), box, now)).toBeNull();
      expect(verdict(fresh('cancelled'), box, now)).toBeNull();
    }
  });
});
