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
