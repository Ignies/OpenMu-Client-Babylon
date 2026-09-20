import { randomUUID } from 'node:crypto';
import { audit, db, type ListingRow, type ListingState } from './db';
import type { Verdict } from './reconcile';

/**
 * What the service knows about what is for sale.
 *
 * The rule this file exists to enforce: **a listing is claimed before any
 * token is minted.** Two buyers pressing Buy on the same item at the same
 * moment must not both get a buy token, or the game server would refuse one
 * of them after they had already been told it was theirs. The claim is a
 * conditional UPDATE - it either moves the row out of `active` or it does
 * not, and only the winner gets a token. Every other state change is the
 * same shape, conditional on the state it leaves, so a sweep that read the
 * row a moment ago cannot overwrite what a route did since.
 */

export type Item = {
  group: number;
  num: number;
  lvl?: number;
  /** The server's own twelve serializer bytes, once the box confirmed them. */
  raw?: number[];
  [key: string]: unknown;
};

export type Listing = {
  id: string;
  seller: string;
  sellerCharacter: string;
  price: number;
  item: Item;
  category: string;
  state: ListingState;
  buyer: string | null;
  buyerCharacter: string | null;
  listedAt: number;
  /** When the state last changed; what the reconcile deadlines count from. */
  updatedAt: number;
  /** The escrow box in OpenMU's database, minted with the row. */
  boxId: string;
  /** The item row in the box, known once the box was seen holding it. */
  itemId: string | null;
  /** What the seller collects for it, known once it sold. */
  proceeds: number | null;
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
  boxId: row.box_id ?? '',
  itemId: row.item_id,
  proceeds: row.proceeds,
});

export const MAX_PRICE = 2_000_000_000;

/**
 * Records a seller's intent to list. The row starts `pending`: nothing is on
 * sale until the box holds the item.
 */
export function createPending(input: {
  seller: string;
  sellerCharacter: string;
  price: number;
  item: Item;
  category: string;
  boxId: string;
}): Listing {
  if (!Number.isInteger(input.price) || input.price <= 0) {
    throw new Error('price must be a positive whole number of Zen');
  }
  if (input.price > MAX_PRICE) {
    throw new Error('price is above what a character can hold');
  }

  const now = Date.now();
  const id = randomUUID();

  db.query(
    `INSERT INTO listings
       (id, seller, seller_char, price, item_group, item_number, item_level,
        item_json, category, state, box_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`
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
    input.boxId,
    now,
    now
  );

  audit('listing pending', {
    listing: id,
    account: input.seller,
    detail: { price: input.price, box: input.boxId },
  });
  const listing = byId(id);
  if (!listing) throw new Error('the listing was not written');
  return listing;
}

/**
 * Reserves a listing for one buyer.
 *
 * Conditional on the row still being `active`, so of two buyers racing,
 * SQLite decides and exactly one gets `true`. The buy token is minted only
 * for the winner.
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

/** The buyer gave up (no room, no money): back on sale at once. Only theirs to give back. */
export function release(id: string, buyer: string, why: string): boolean {
  const changed = db
    .query(
      `UPDATE listings SET state = 'active', buyer = NULL, buyer_char = NULL, updated_at = ?
       WHERE id = ? AND state = 'claimed' AND buyer = ?`
    )
    .run(Date.now(), id, buyer).changes;

  if (changed) audit('claim released', { listing: id, account: buyer, detail: { why } });
  return changed > 0;
}

/** The seller wants it back: off sale while they hold a cancel token. */
export function startReturn(id: string, seller: string): boolean {
  const changed = db
    .query(
      `UPDATE listings SET state = 'returning', updated_at = ?
       WHERE id = ? AND seller = ? AND state = 'active'`
    )
    .run(Date.now(), id, seller).changes;

  if (changed) audit('listing cancelled', { listing: id, account: seller });
  return changed > 0;
}

/** A fresh cancel token for a return still under way restarts its deadline. */
export function touchReturn(id: string, seller: string): boolean {
  return (
    db
      .query(`UPDATE listings SET updated_at = ? WHERE id = ? AND seller = ? AND state = 'returning'`)
      .run(Date.now(), id, seller).changes > 0
  );
}

/** A `pending` listing whose item never left the seller's bag: nothing to give back. */
export function cancelPending(id: string, seller: string, why: string): boolean {
  const changed = db
    .query(
      `UPDATE listings SET state = 'cancelled', updated_at = ?
       WHERE id = ? AND seller = ? AND state = 'pending'`
    )
    .run(Date.now(), id, seller).changes;

  if (changed) audit('listing dropped', { listing: id, account: seller, detail: { why } });
  return changed > 0;
}

/**
 * Writes what the box said (reconcile.ts). Conditional on the state the
 * verdict was reached from, so a route that moved the row in between wins.
 */
export function apply(id: string, from: ListingState, verdict: Verdict): boolean {
  const sets = ['state = ?', 'updated_at = ?'];
  const params: (string | number | null)[] = [verdict.state, Date.now()];
  if (verdict.itemId !== undefined) {
    sets.push('item_id = ?');
    params.push(verdict.itemId);
  }
  if (verdict.proceeds !== undefined) {
    sets.push('proceeds = ?');
    params.push(verdict.proceeds);
  }
  // Back on sale means nobody holds it.
  if (verdict.state === 'active') sets.push('buyer = NULL', 'buyer_char = NULL');

  const changed = db
    .query(`UPDATE listings SET ${sets.join(', ')} WHERE id = ? AND state = ?`)
    .run(...params, id, from).changes;

  if (changed) {
    audit(`listing ${verdict.state}`, {
      listing: id,
      detail: { from, why: verdict.why, itemId: verdict.itemId, proceeds: verdict.proceeds },
    });
  }
  return changed > 0;
}

/**
 * Corrects what the catalogue says about the item from what the box holds,
 * or adds the server's own bytes to it. The box is what the buyer receives.
 */
export function patchItem(id: string, patch: Partial<Item>): void {
  const row = byRow(id);
  if (!row) return;
  const item = { ...(JSON.parse(row.item_json) as Item), ...patch };
  db.query(
    `UPDATE listings SET item_json = ?, item_group = ?, item_number = ?, item_level = ? WHERE id = ?`
  ).run(JSON.stringify(item), item.group, item.num, item.lvl ?? 0, id);
}

export function byId(id: string): Listing | null {
  const row = byRow(id);
  return row ? toListing(row) : null;
}

export function byRow(id: string): ListingRow | null {
  return (db.query('SELECT * FROM listings WHERE id = ?').get(id) as ListingRow) ?? null;
}

export type BrowseQuery = {
  category?: string;
  limit?: number;
  offset?: number;
};

/** What a browsing player sees: only what a box actually holds. */
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

/** Everything a seller has in the market that is not finished with. */
export function bySeller(seller: string): Listing[] {
  const rows = db
    .query(
      `SELECT * FROM listings WHERE seller = ? AND state NOT IN ('paid', 'cancelled')
       ORDER BY created_at DESC`
    )
    .all(seller) as ListingRow[];
  return rows.map(toListing);
}

/** Sales whose money is still in the box, waiting for the seller to collect. */
export function soldBy(seller: string): Listing[] {
  const rows = db
    .query(`SELECT * FROM listings WHERE seller = ? AND state = 'sold' ORDER BY updated_at ASC`)
    .all(seller) as ListingRow[];
  return rows.map(toListing);
}

/** What the seller would collect right now. */
export function owed(seller: string): number {
  const row = db
    .query(`SELECT coalesce(sum(proceeds), 0) AS zen FROM listings WHERE seller = ? AND state = 'sold'`)
    .get(seller) as { zen: number };
  return row.zen;
}

/** Rows in a state, optionally only those that changed before `before`. */
export function inState(state: ListingState, before = Number.MAX_SAFE_INTEGER): Listing[] {
  const rows = db
    .query(`SELECT * FROM listings WHERE state = ? AND updated_at < ? ORDER BY updated_at ASC`)
    .all(state, before) as ListingRow[];
  return rows.map(toListing);
}

// ---- history ---------------------------------------------------------------

export type HistoryStatus = 'success' | 'failed' | 'pending';

export type HistoryEntry = {
  id: string;
  /** What the player was in it. */
  kind: 'sale' | 'purchase';
  item: Item;
  zen: number;
  status: HistoryStatus;
  /** The service's own words for how it ended, or where it is. */
  note: string;
  at: number;
};

const HISTORY_LIMIT = 100;

function statusOf(state: ListingState): HistoryStatus {
  if (state === 'sold' || state === 'paid') return 'success';
  if (state === 'cancelled') return 'failed';
  return 'pending';
}

function noteFor(row: ListingRow, purchase: boolean): string {
  const buyer = row.buyer_char ?? row.buyer ?? 'somebody';
  switch (row.state) {
    case 'pending':
      return 'waiting for the item';
    case 'active':
      return 'for sale';
    case 'claimed':
      return purchase ? 'waiting for your purchase' : `reserved by ${buyer}`;
    case 'sold':
      return purchase ? 'bought' : `sold to ${buyer}, waiting to be collected`;
    case 'paid':
      return purchase ? 'bought' : `sold to ${buyer}`;
    case 'returning':
      return 'coming back to you';
    case 'cancelled':
      return row.item_id ? 'returned to you' : 'never listed';
    default:
      return row.state;
  }
}

/**
 * Everything this account has been part of, newest first: what they sold or
 * tried to sell, and what they bought.
 */
export function historyFor(account: string): HistoryEntry[] {
  const rows = db
    .query(
      `SELECT * FROM listings WHERE seller = ? OR buyer = ?
       ORDER BY updated_at DESC LIMIT ?`
    )
    .all(account, account, HISTORY_LIMIT) as ListingRow[];

  return rows.map(row => {
    const purchase = row.buyer === account && row.seller !== account;
    return {
      id: row.id,
      kind: purchase ? 'purchase' : 'sale',
      item: JSON.parse(row.item_json) as Item,
      zen: row.price,
      status: statusOf(row.state),
      note: noteFor(row, purchase),
      at: row.updated_at,
    };
  });
}
