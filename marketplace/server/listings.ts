import { randomUUID } from 'node:crypto';
import { audit, db, type ListingRow, type ListingState } from './db';

/**
 * What the service knows about what is for sale.
 *
 * The rule this file exists to enforce: **a listing is claimed before any bot
 * is sent out.** Two buyers pressing Buy on the same item at the same moment
 * must not both get a bot dispatched, or one of them stands there waiting for
 * an item that has already gone. The claim is a conditional UPDATE - it either
 * moves the row out of `active` or it does not, and only the winner is told to
 * go and collect.
 */

export type Item = {
  group: number;
  num: number;
  lvl?: number;
  isExcellent?: boolean;
  isAncient?: boolean;
  [key: string]: unknown;
};

export type Listing = {
  id: string;
  seller: string;
  /** The character a bot has to meet to collect or return this. */
  sellerCharacter: string;
  price: number;
  item: Item;
  category: string;
  state: ListingState;
  buyer: string | null;
  buyerCharacter: string | null;
  listedAt: number;
  /** When the state last changed; what the dispatch deadlines count from. */
  updatedAt: number;
  /** The bot account holding the item, once collected; its work from then on. */
  holder: string | null;
};

const toListing = (row: ListingRow): Listing => ({
  id: row.id,
  seller: row.seller,
  sellerCharacter: row.seller_char,
  price: row.price,
  item: JSON.parse(row.item_json) as Item,
  category: row.category,
  state: row.state,
  buyer: row.buyer,
  buyerCharacter: row.buyer_char,
  listedAt: row.created_at,
  updatedAt: row.updated_at,
  holder: row.holder,
});

/**
 * Records a seller's intent to list. The row starts `pending`: nothing is on
 * sale until a bot has the item in hand.
 */
export function createPending(input: {
  seller: string;
  sellerCharacter: string;
  price: number;
  item: Item;
  category: string;
}): Listing {
  if (!Number.isInteger(input.price) || input.price <= 0) {
    throw new Error('price must be a positive whole number of Zen');
  }
  if (input.price > 2_000_000_000) {
    throw new Error('price is above what a character can hold');
  }

  const now = Date.now();
  const id = randomUUID();

  db.query(
    `INSERT INTO listings
       (id, seller, seller_char, price, item_group, item_number, item_level,
        item_json, category, state, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`
  ).run(
    id,
    input.seller,
    input.sellerCharacter,
    input.price,
    input.item.group,
    input.item.num,
    input.item.lvl ?? 0,
    JSON.stringify(input.item),
    input.category,
    now,
    now
  );

  audit('listing pending', { listing: id, account: input.seller, detail: { price: input.price } });
  return byId(id)!;
}

/** The bot has the item: the listing goes on sale. */
export function activate(
  id: string,
  holder: string,
  /** Null when the server never said where it put the item; see CollectResult. */
  holderSlot: number | null
): boolean {
  const changed = db
    .query(
      `UPDATE listings SET state = 'active', holder = ?, holder_slot = ?, updated_at = ?
       WHERE id = ? AND state = 'pending'`
    )
    .run(holder, holderSlot, Date.now(), id).changes;

  if (changed) audit('listing active', { listing: id, detail: { holder, holderSlot } });
  return changed > 0;
}

/**
 * Reserves a listing for one buyer.
 *
 * Conditional on the row still being `active`, so of two buyers racing, SQLite
 * decides and exactly one gets `true`. Everything after this - dispatching a
 * bot, meeting the buyer - happens only for the winner.
 */
export function claim(id: string, buyer: string, buyerCharacter: string): boolean {
  const changed = db
    .query(
      `UPDATE listings SET state = 'claimed', buyer = ?, buyer_char = ?, updated_at = ?
       WHERE id = ? AND state = 'active'`
    )
    .run(buyer, buyerCharacter, Date.now(), id).changes;

  audit(changed ? 'listing claimed' : 'claim refused', { listing: id, account: buyer });
  return changed > 0;
}

/** The buyer walked away or the handover failed: back on sale. */
export function release(id: string, why: string): boolean {
  const changed = db
    .query(
      `UPDATE listings SET state = 'active', buyer = NULL, buyer_char = NULL, updated_at = ?
       WHERE id = ? AND state = 'claimed'`
    )
    .run(Date.now(), id).changes;

  if (changed) audit('claim released', { listing: id, detail: { why } });
  return changed > 0;
}

/**
 * The buyer has the item and the money is in. The price becomes the seller's
 * to collect - it is not delivered, because they are usually not online.
 */
export function settleSale(id: string): boolean {
  const row = byRow(id);
  if (!row || row.state !== 'claimed') return false;

  db.transaction(() => {
    db.query(`UPDATE listings SET state = 'sold', updated_at = ? WHERE id = ?`).run(
      Date.now(),
      id
    );
    credit(row.seller, row.price);
  })();

  audit('listing sold', {
    listing: id,
    account: row.seller,
    detail: { buyer: row.buyer, price: row.price },
  });
  return true;
}

/**
 * A `pending` listing that will not be collected: the seller refused or
 * cancelled the trade, walked away from it, or never turned up. Nothing left
 * their bag, so there is nothing to give back; the row just stops being work,
 * and the bot does not come asking again.
 */
export function drop(id: string, why: string): boolean {
  const changed = db
    .query(
      `UPDATE listings SET state = 'cancelled', updated_at = ?
       WHERE id = ? AND state = 'pending'`
    )
    .run(Date.now(), id).changes;

  if (changed) audit('listing dropped', { listing: id, detail: { why } });
  return changed > 0;
}

/**
 * A seller who asked for their item back and then refused the trade that
 * returns it. The item stays the bot's and goes back on sale at the same
 * price; they can cancel again when they want it.
 */
export function backOnSale(id: string, why: string): boolean {
  const changed = db
    .query(
      `UPDATE listings SET state = 'active', updated_at = ?
       WHERE id = ? AND state = 'returning'`
    )
    .run(Date.now(), id).changes;

  if (changed) audit('return refused', { listing: id, detail: { why } });
  return changed > 0;
}

/**
 * The bot cannot find the item the service says it holds. Off sale, and
 * left for a person rather than offered to the next buyer to fail on.
 */
export function markStuck(id: string, why: string): boolean {
  const changed = db
    .query(
      `UPDATE listings SET state = 'stuck', buyer = NULL, buyer_char = NULL, updated_at = ?
       WHERE id = ? AND state IN ('active', 'claimed', 'returning')`
    )
    .run(Date.now(), id).changes;

  if (changed) audit('listing stuck', { listing: id, detail: { why } });
  return changed > 0;
}

/** The bot found the held item somewhere else in its bag: write that down. */
export function adoptSlot(id: string, slot: number): void {
  db.query('UPDATE listings SET holder_slot = ?, updated_at = ? WHERE id = ?').run(
    slot,
    Date.now(),
    id
  );
  audit('slot adopted', { listing: id, detail: { slot } });
}

/** Which bot holds this listing's item, and where. Null holder: never collected. */
export function holderOf(id: string): { holder: string | null; slot: number | null } {
  const row = db
    .query('SELECT holder, holder_slot AS slot FROM listings WHERE id = ?')
    .get(id) as { holder: string | null; slot: number | null } | undefined;
  return { holder: row?.holder ?? null, slot: row?.slot ?? null };
}

/**
 * Every bag slot this bot account is recorded as holding an item in, so a
 * bag search for one listing's item never lands on another listing's.
 */
export function heldSlots(holder: string): Set<number> {
  const rows = db
    .query(
      `SELECT holder_slot AS slot FROM listings
       WHERE holder = ? AND holder_slot IS NOT NULL
         AND state IN ('active', 'claimed', 'returning', 'stuck')`
    )
    .all(holder) as { slot: number }[];
  return new Set(rows.map(r => r.slot));
}

/** The seller wants it back. Only possible while nobody has claimed it. */
export function cancel(id: string, seller: string): boolean {
  const changed = db
    .query(
      `UPDATE listings SET state = 'returning', updated_at = ?
       WHERE id = ? AND seller = ? AND state IN ('pending', 'active')`
    )
    .run(Date.now(), id, seller).changes;

  if (changed) audit('listing cancelled', { listing: id, account: seller });
  return changed > 0;
}

export function byId(id: string): Listing | null {
  const row = byRow(id);
  return row ? toListing(row) : null;
}

function byRow(id: string): ListingRow | null {
  return (db.query('SELECT * FROM listings WHERE id = ?').get(id) as ListingRow) ?? null;
}

export type BrowseQuery = {
  category?: string;
  search?: string;
  limit?: number;
  offset?: number;
};

/** What a browsing player sees: only what the service actually holds. */
export function browse(query: BrowseQuery = {}): { total: number; listings: Listing[] } {
  const where: string[] = [`state = 'active'`];
  const params: (string | number)[] = [];

  if (query.category && query.category !== 'all') {
    where.push('category = ?');
    params.push(query.category);
  }

  const clause = where.join(' AND ');
  const total = (
    db.query(`SELECT count(*) AS n FROM listings WHERE ${clause}`).get(...params) as {
      n: number;
    }
  ).n;

  const rows = db
    .query(
      `SELECT * FROM listings WHERE ${clause} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    )
    .all(...params, Math.min(query.limit ?? 50, 200), query.offset ?? 0) as ListingRow[];

  return { total, listings: rows.map(toListing) };
}

/** Everything a seller has in the market, whatever state it is in. */
export function bySeller(seller: string): Listing[] {
  const rows = db
    .query(
      `SELECT * FROM listings WHERE seller = ? AND state NOT IN ('sold', 'cancelled')
       ORDER BY created_at DESC`
    )
    .all(seller) as ListingRow[];
  return rows.map(toListing);
}

/** Work for the bots: handovers that are waiting to happen. */
export function pendingWork(): Listing[] {
  const rows = db
    .query(
      `SELECT * FROM listings WHERE state IN ('pending', 'claimed', 'returning')
       ORDER BY updated_at ASC`
    )
    .all() as ListingRow[];
  return rows.map(toListing);
}

export function balance(account: string): number {
  const row = db.query('SELECT zen FROM balances WHERE account = ?').get(account) as
    | { zen: number }
    | undefined;
  return row?.zen ?? 0;
}

export function credit(account: string, zen: number): void {
  db.query(
    `INSERT INTO balances (account, zen) VALUES (?, ?)
     ON CONFLICT(account) DO UPDATE SET zen = zen + excluded.zen`
  ).run(account, zen);
  audit('balance credited', { account, detail: { zen } });
}

/**
 * Takes the whole balance for paying out. Returns what was taken, so the
 * caller pays exactly that - and if the handover then fails, it is credited
 * back rather than quietly lost.
 */
export function takeBalance(account: string): number {
  const owed = balance(account);
  if (owed <= 0) return 0;
  db.query('UPDATE balances SET zen = 0 WHERE account = ?').run(account);
  audit('balance taken for payout', { account, detail: { zen: owed } });
  return owed;
}

// ---- payouts ---------------------------------------------------------------

export type PayoutRequest = { account: string; character: string; requestedAt: number };

/**
 * A seller asked for what they are owed. One open request per account; the
 * character is who the bot has to meet, and asking again just moves it to
 * whichever character they are on now.
 */
export function requestPayout(account: string, character: string): void {
  db.query(
    `INSERT INTO payout_requests (account, character, requested_at) VALUES (?, ?, ?)
     ON CONFLICT(account) DO UPDATE SET character = excluded.character,
                                       requested_at = excluded.requested_at`
  ).run(account, character, Date.now());
  audit('payout requested', { account, detail: { character } });
}

/** Every open request whose account is still owed something, oldest first. */
export function payoutRequests(): PayoutRequest[] {
  const rows = db
    .query(
      `SELECT p.account, p.character, p.requested_at AS requestedAt
       FROM payout_requests p JOIN balances b ON b.account = p.account
       WHERE b.zen > 0 ORDER BY p.requested_at ASC`
    )
    .all() as PayoutRequest[];
  return rows;
}

/** Paid, or given up on: the request is done either way. */
export function clearPayoutRequest(account: string): void {
  db.query('DELETE FROM payout_requests WHERE account = ?').run(account);
}

// ---- leases ----------------------------------------------------------------

/**
 * Takes every key for `worker`, for `ttlMs`, or none of them.
 *
 * Several bots read the same rows, and a handover is not a thing two of them
 * can do at once. Keys are `listing:<id>`, `payout:<account>` and
 * `customer:<character>` - the customer too, because two bots at one player
 * would have the second trade request refused by the server, and a refusal
 * reads as the player saying no. A lease lapses on its own after `ttlMs`,
 * for a bot that died holding it; the row's own state is still what the next
 * bot works from. A worker may retake its own lease.
 */
export function acquireLeases(keys: string[], worker: string, ttlMs: number): boolean {
  const now = Date.now();
  const until = now + ttlMs;
  try {
    db.transaction(() => {
      for (const key of keys) {
        const changed = db
          .query(
            `INSERT INTO leases (key, worker, until) VALUES (?, ?, ?)
             ON CONFLICT(key) DO UPDATE SET worker = excluded.worker, until = excluded.until
             WHERE leases.until < ? OR leases.worker = excluded.worker`
          )
          .run(key, worker, until, now).changes;
        if (!changed) throw new Error('taken');
      }
    })();
    return true;
  } catch {
    return false;
  }
}

/** Gives the keys back; only the worker holding them can. */
export function releaseLeases(keys: string[], worker: string): void {
  for (const key of keys) {
    db.query('DELETE FROM leases WHERE key = ? AND worker = ?').run(key, worker);
  }
}

/** Who holds a key right now, or null when nobody does or it has lapsed. */
export function leaseHolder(key: string): string | null {
  const row = db.query('SELECT worker, until FROM leases WHERE key = ?').get(key) as
    | { worker: string; until: number }
    | undefined;
  return row && row.until >= Date.now() ? row.worker : null;
}
