import { beforeEach, describe, expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { bytesToGuid, readInt64LE } from '../../src/common/escrowWire';
import './testDb';
import type { BoxState } from './boxes';
import { db } from './db';
import * as store from './listings';

process.env.MARKETPLACE_TICKET_SECRET ??= 'ticket-secret-for-the-tests';
const { mintTicket } = await import('./identity');
const { createApp, commissionOn } = await import('./app');
const { CLAIM_TTL_MS, PENDING_TTL_MS, RETURN_TTL_MS } = await import('./reconcile');

/**
 * Postgres, as a map. A test puts a box in the state the plugin would have
 * left it in and the routes read it back.
 */
const boxes = new Map<string, BoxState>();
const gone: BoxState = { exists: false, money: 0, item: null };
const holding = (id: string, group = 14, number = 13, level = 0): BoxState => ({
  exists: true,
  money: 0,
  item: { id, group, number, level, durability: 1 },
});
const paid = (money: number): BoxState => ({ exists: true, money, item: null });

/** Who presence says is live; a name missing here is a socket that is gone. */
const live = new Set<string>(['alice', 'bob', 'carol']);

/** The service clock; starts at the real time so the tickets minted from it are live. */
let clock = Date.now();

const app = createApp({
  boxes: { state: async id => boxes.get(id) ?? gone },
  secret: new TextEncoder().encode('escrow-secret'),
  listingFee: 100,
  commissionPercent: 5,
  confirmLive: async (_nonce, account) =>
    live.has(account) ? { ok: true } : { ok: false, reason: 'unknown', message: 'gone' },
  now: () => clock,
});

// Every request comes from a fresh address so the burst limits never trip.
let requests = 0;
const server = { requestIP: () => ({ address: `10.${(requests >> 16) & 0xff}.${(requests >> 8) & 0xff}.${requests++ & 0xff}` }) };

type Answer = {
  error?: string;
  listing: store.Listing;
  token: string | null;
  payouts: { listingId: string; amount: number; token: string }[];
  total: number;
  history: store.HistoryEntry[];
  listings: store.Listing[];
  balance: number;
};

async function call<T = Answer>(method: string, path: string, body?: Record<string, unknown>) {
  const url = new URL(`http://market.test/api/market${path}`);
  if (method === 'GET' && body?.ticket) url.searchParams.set('ticket', String(body.ticket));
  const req = new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: method === 'GET' ? undefined : JSON.stringify(body ?? {}),
  });
  const response = await app.fetch(req, server);
  return { status: response.status, body: (await response.json()) as T };
}

const as = (account: string) => ({ ticket: mintTicket(account, clock).ticket, session: 'x'.repeat(32), character: account });

/** The token fields the plugin reads, from the hex the route answered with. */
function decodeToken(hexToken: string | null) {
  if (hexToken === null) throw new Error('no token was answered');
  const token = new Uint8Array(Buffer.from(hexToken, 'hex'));
  return {
    op: token[1],
    expiresAt: readInt64LE(token, 2),
    listingId: bytesToGuid(token.subarray(10, 26)),
    boxId: bytesToGuid(token.subarray(26, 42)),
    itemId: bytesToGuid(token.subarray(42, 58)),
    amount: readInt64LE(token, 58),
    fee: readInt64LE(token, 66),
    slot: token[74],
    account: new TextDecoder().decode(token.subarray(76, 76 + token[75])),
  };
}

const anItem = { group: 14, num: 13, lvl: 0 };

async function list(seller = 'alice', price = 1000) {
  const { status, body } = await call('POST', '/listings', { ...as(seller), slot: 20, price, category: 'jewels', item: anItem });
  expect(status).toBe(201);
  return body as { listing: store.Listing; token: string };
}

/** Lists, has the plugin put the item in the box, and settles: on sale. */
async function onSale(seller = 'alice', price = 1000) {
  const { listing } = await list(seller, price);
  boxes.set(listing.boxId, holding(randomUUID()));
  const settled = await call('POST', `/listings/${listing.id}/settle`, { ticket: as(seller).ticket });
  expect(settled.body.listing.state).toBe('active');
  return settled.body.listing as store.Listing;
}

function backdate(id: string, by: number) {
  db.query('UPDATE listings SET updated_at = ? WHERE id = ?').run(clock - by - 1, id);
}

beforeEach(() => {
  db.run('DELETE FROM listings');
  db.run('DELETE FROM audit');
  boxes.clear();
});

describe('listing', () => {
  test('creates a pending row with a box and answers with a list token', async () => {
    const { listing, token } = await list('alice', 1000);
    expect(listing).toMatchObject({ state: 'pending', seller: 'alice', price: 1000, itemId: null, proceeds: null });
    expect(listing.boxId).toMatch(/^[0-9a-f-]{36}$/);
    expect(token).toMatch(/^[0-9a-f]+$/);
    expect(decodeToken(token)).toMatchObject({
      op: 1,
      listingId: listing.id,
      boxId: listing.boxId,
      itemId: '00000000-0000-0000-0000-000000000000',
      amount: 1000,
      fee: 100,
      slot: 20,
      account: 'alice',
    });
  });

  test('refuses a slot outside the bag and a price outside the range', async () => {
    for (const slot of [0, 11, 204, 'x']) {
      const { status } = await call('POST', '/listings', { ...as('alice'), slot, price: 10, item: anItem });
      expect(status).toBe(400);
    }
    for (const price of [0, -5, 2_000_000_001, 1.5]) {
      const { status } = await call('POST', '/listings', { ...as('alice'), slot: 20, price, item: anItem });
      expect(status).toBe(400);
    }
  });

  test('refuses a ticket whose socket is no longer live', async () => {
    const { status } = await call('POST', '/listings', { ...as('mallory'), slot: 20, price: 10, item: anItem });
    expect(status).toBe(403);
  });

  test('settle puts it on sale once the box holds the item, records the item and keeps the bytes', async () => {
    const { listing } = await list();
    const itemId = randomUUID();
    boxes.set(listing.boxId, holding(itemId));
    const bytes = [13, 0, 255, 0, 0, 0xe0, 0, 0, 0, 0, 0, 0];
    const { status, body } = await call('POST', `/listings/${listing.id}/settle`, { ticket: as('bob').ticket, item: bytes });
    expect(status).toBe(200);
    expect(body.listing).toMatchObject({ state: 'active', itemId });
    expect(body.listing.item.raw).toEqual(bytes);
    expect((await call('GET', '/listings', as('bob'))).body.total).toBe(1);
  });

  test('settle before the box exists leaves it pending', async () => {
    const { listing } = await list();
    const { body } = await call('POST', `/listings/${listing.id}/settle`, { ticket: as('alice').ticket });
    expect(body.listing.state).toBe('pending');
  });

  test('a catalogue entry that disagrees with the box is corrected from the box', async () => {
    const { listing } = await list();
    boxes.set(listing.boxId, holding(randomUUID(), 12, 7, 3));
    const { body } = await call('POST', `/listings/${listing.id}/settle`, { ticket: as('alice').ticket });
    expect(body.listing.item).toMatchObject({ group: 12, num: 7, lvl: 3 });
  });
});

describe('buying', () => {
  test('claim reserves it for one buyer and answers with a buy token carrying the commission', async () => {
    const listing = await onSale('alice', 1000);
    const { status, body } = await call('POST', `/listings/${listing.id}/claim`, as('bob'));
    expect(status).toBe(200);
    expect(body.listing).toMatchObject({ state: 'claimed', buyer: 'bob' });
    expect(decodeToken(body.token)).toMatchObject({
      op: 3,
      listingId: listing.id,
      boxId: listing.boxId,
      itemId: listing.itemId,
      amount: 1000,
      fee: commissionOn(1000, 5),
      account: 'bob',
    });
    expect(commissionOn(1000, 5)).toBe(50);
  });

  test('the second buyer is told somebody got there first', async () => {
    const listing = await onSale();
    await call('POST', `/listings/${listing.id}/claim`, as('bob'));
    const { status } = await call('POST', `/listings/${listing.id}/claim`, as('carol'));
    expect(status).toBe(409);
  });

  test('a seller cannot buy their own listing', async () => {
    const listing = await onSale('alice');
    const { status } = await call('POST', `/listings/${listing.id}/claim`, as('alice'));
    expect(status).toBe(400);
  });

  test('settle after the purchase marks it sold with the box money as proceeds', async () => {
    const listing = await onSale('alice', 1000);
    await call('POST', `/listings/${listing.id}/claim`, as('bob'));
    boxes.set(listing.boxId, paid(950));
    const { body } = await call('POST', `/listings/${listing.id}/settle`, { ticket: as('bob').ticket });
    expect(body.listing).toMatchObject({ state: 'sold', proceeds: 950, buyer: 'bob' });
    expect((await call('GET', '/mine', as('alice'))).body.balance).toBe(950);
  });

  test('release puts it back on sale at once, only for the claimant, only while the box holds it', async () => {
    const listing = await onSale();
    await call('POST', `/listings/${listing.id}/claim`, as('bob'));

    expect((await call('POST', `/listings/${listing.id}/release`, as('carol'))).status).toBe(409);

    const released = await call('POST', `/listings/${listing.id}/release`, as('bob'));
    expect(released.status).toBe(200);
    expect(released.body.listing).toMatchObject({ state: 'active', buyer: null });
  });

  test('release after the money arrived reports the sale instead', async () => {
    const listing = await onSale();
    await call('POST', `/listings/${listing.id}/claim`, as('bob'));
    boxes.set(listing.boxId, paid(950));
    const { status, body } = await call('POST', `/listings/${listing.id}/release`, as('bob'));
    expect(status).toBe(409);
    expect(body.listing.state).toBe('sold');
  });
});

describe('cancelling', () => {
  test('a pending listing with no box is dropped without a token', async () => {
    const { listing } = await list();
    const { status, body } = await call('POST', `/listings/${listing.id}/cancel`, as('alice'));
    expect(status).toBe(200);
    expect(body).toMatchObject({ token: null });
    expect(body.listing.state).toBe('cancelled');
  });

  test('an active listing goes to returning with a cancel token for the item', async () => {
    const listing = await onSale();
    const { status, body } = await call('POST', `/listings/${listing.id}/cancel`, as('alice'));
    expect(status).toBe(200);
    expect(body.listing.state).toBe('returning');
    expect(decodeToken(body.token)).toMatchObject({ op: 2, itemId: listing.itemId, boxId: listing.boxId, amount: 0, fee: 0 });
  });

  test('a pending listing whose item did go in is cancelled like an active one', async () => {
    const { listing } = await list();
    const itemId = randomUUID();
    boxes.set(listing.boxId, holding(itemId));
    const { body } = await call('POST', `/listings/${listing.id}/cancel`, as('alice'));
    expect(body.listing.state).toBe('returning');
    expect(decodeToken(body.token).itemId).toBe(itemId);
  });

  test('a claimed listing cannot be cancelled, nor somebody else\'s', async () => {
    const listing = await onSale('alice');
    expect((await call('POST', `/listings/${listing.id}/cancel`, as('bob'))).status).toBe(403);
    await call('POST', `/listings/${listing.id}/claim`, as('bob'));
    expect((await call('POST', `/listings/${listing.id}/cancel`, as('alice'))).status).toBe(409);
  });

  test('settle after the return marks it cancelled once the box is gone', async () => {
    const listing = await onSale();
    await call('POST', `/listings/${listing.id}/cancel`, as('alice'));
    boxes.delete(listing.boxId);
    const { body } = await call('POST', `/listings/${listing.id}/settle`, { ticket: as('alice').ticket });
    expect(body.listing.state).toBe('cancelled');
  });
});

describe('collecting', () => {
  async function sold(seller: string, price: number) {
    const listing = await onSale(seller, price);
    await call('POST', `/listings/${listing.id}/claim`, as('bob'));
    boxes.set(listing.boxId, paid(price - commissionOn(price, 5)));
    await call('POST', `/listings/${listing.id}/settle`, { ticket: as('bob').ticket });
    return listing;
  }

  test('payout mints one collect token per sold listing and sums them', async () => {
    const first = await sold('alice', 1000);
    const second = await sold('alice', 2000);
    await onSale('alice', 3000);
    const { status, body } = await call('POST', '/payout', as('alice'));
    expect(status).toBe(200);
    expect(body.total).toBe(950 + 1900);
    expect(body.payouts.map((p: { listingId: string; amount: number }) => [p.listingId, p.amount])).toEqual([
      [first.id, 950],
      [second.id, 1900],
    ]);
    expect(decodeToken(body.payouts[0].token)).toMatchObject({ op: 4, boxId: first.boxId, amount: 950, account: 'alice' });
  });

  test('nothing to collect is an empty list, not an error', async () => {
    const { status, body } = await call<{ payouts: unknown[]; total: number }>('POST', '/payout', as('alice'));
    expect(status).toBe(200);
    expect(body).toEqual({ payouts: [], total: 0 });
  });

  test('payout settle marks the collected ones paid and counts what is left', async () => {
    const first = await sold('alice', 1000);
    await sold('alice', 2000);
    boxes.delete(first.boxId);
    const { body } = await call<Record<string, number>>('POST', '/payout/settle', { ticket: as('alice').ticket });
    expect(body).toEqual({ paid: 1, paidTotal: 950, remaining: 1, remainingTotal: 1900 });
    expect(store.byId(first.id)!.state).toBe('paid');
  });
});

describe('the sweep', () => {
  test('drops a pending listing nobody ever sent the token for', async () => {
    const { listing } = await list();
    backdate(listing.id, PENDING_TTL_MS);
    expect(await app.sweep()).toBe(1);
    expect(store.byId(listing.id)!.state).toBe('cancelled');
  });

  test('activates a pending listing whose seller never reported back', async () => {
    const { listing } = await list();
    const itemId = randomUUID();
    boxes.set(listing.boxId, holding(itemId));
    backdate(listing.id, PENDING_TTL_MS);
    await app.sweep();
    expect(store.byId(listing.id)).toMatchObject({ state: 'active', itemId });
  });

  test('releases a claim the buyer never used, and settles one they did', async () => {
    const forgotten = await onSale('alice');
    await call('POST', `/listings/${forgotten.id}/claim`, as('bob'));
    backdate(forgotten.id, CLAIM_TTL_MS);

    const bought = await onSale('alice');
    await call('POST', `/listings/${bought.id}/claim`, as('carol'));
    boxes.set(bought.boxId, paid(950));
    backdate(bought.id, CLAIM_TTL_MS);

    expect(await app.sweep()).toBe(2);
    expect(store.byId(forgotten.id)).toMatchObject({ state: 'active', buyer: null });
    expect(store.byId(bought.id)).toMatchObject({ state: 'sold', proceeds: 950 });
  });

  test('puts a return the seller never finished back on sale, and closes one they did', async () => {
    const kept = await onSale('alice');
    await call('POST', `/listings/${kept.id}/cancel`, as('alice'));
    backdate(kept.id, RETURN_TTL_MS);

    const taken = await onSale('alice');
    await call('POST', `/listings/${taken.id}/cancel`, as('alice'));
    boxes.delete(taken.boxId);
    backdate(taken.id, RETURN_TTL_MS);

    await app.sweep();
    expect(store.byId(kept.id)!.state).toBe('active');
    expect(store.byId(taken.id)!.state).toBe('cancelled');
  });

  test('marks a sold listing paid once its box is gone', async () => {
    const listing = await onSale('alice');
    await call('POST', `/listings/${listing.id}/claim`, as('bob'));
    boxes.set(listing.boxId, paid(950));
    backdate(listing.id, CLAIM_TTL_MS);
    await app.sweep();
    expect(store.byId(listing.id)!.state).toBe('sold');
    boxes.delete(listing.boxId);
    await app.sweep();
    expect(store.byId(listing.id)!.state).toBe('paid');
  });

  test('leaves fresh rows alone', async () => {
    const { listing } = await list();
    const claimed = await onSale('bob');
    await call('POST', `/listings/${claimed.id}/claim`, as('carol'));
    expect(await app.sweep()).toBe(0);
    expect(store.byId(listing.id)!.state).toBe('pending');
    expect(store.byId(claimed.id)!.state).toBe('claimed');
  });
});

describe('reading', () => {
  test('history has no bots in it and mine lists what is not finished', async () => {
    const listing = await onSale('alice', 1000);
    await call('POST', `/listings/${listing.id}/claim`, as('bob'));
    const { body } = await call('GET', '/history', as('bob'));
    expect(body.history[0]).toMatchObject({ kind: 'purchase', status: 'pending' });
    expect(body.history[0]).not.toHaveProperty('bot');

    const mine = await call('GET', '/mine', as('alice'));
    expect(mine.body.listings.map((l: store.Listing) => l.state)).toEqual(['claimed']);
  });

  test('the token expiry follows the service clock', async () => {
    clock += 60_000;
    const { token } = await list();
    expect(decodeToken(token).expiresAt).toBeGreaterThan(Math.floor(clock / 1000));
  });
});
