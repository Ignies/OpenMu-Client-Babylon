import { Database } from 'bun:sqlite';
import { mkdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * The marketplace's own storage: listings, what each seller is owed, and an
 * audit row for everything that moves.
 *
 * Deliberately not OpenMU's database, for the same reason the cash shop keeps
 * its queue apart: none of this is game state, and a service that adds tables
 * to a schema EF Core owns and migrates is a service that breaks on the next
 * OpenMU upgrade. Items in flight are held on accounts the service owns, and
 * the only thing that ever moves goods is an in-game trade.
 *
 * Every piece of SQL lives in this file. The rest of the service sees typed
 * records, never rows.
 */

/**
 * Outside the checkout on purpose: the production update runs
 * `git clean -fdx` in it, which would take the listings and every seller's
 * unpaid balance with it.
 */
export const DB_PATH =
  process.env.MARKETPLACE_DB || path.join(os.homedir(), '.mu-marketplace', 'market.sqlite');

mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH, { create: true });

// WAL so a CLI can read the listings while the server is serving them.
db.run('PRAGMA journal_mode = WAL');
// Enforced rather than assumed: a claim that points at a listing that is gone
// is a bug worth failing on, not one worth carrying.
db.run('PRAGMA foreign_keys = ON');

db.run(`
  CREATE TABLE IF NOT EXISTS listings (
    id            TEXT PRIMARY KEY,
    seller        TEXT NOT NULL,
    price         INTEGER NOT NULL,
    item_group    INTEGER NOT NULL,
    item_number   INTEGER NOT NULL,
    item_level    INTEGER NOT NULL DEFAULT 0,
    item_json     TEXT NOT NULL,
    category      TEXT NOT NULL,
    state         TEXT NOT NULL,
    holder        TEXT,
    holder_slot   INTEGER,
    buyer         TEXT,
    created_at    INTEGER NOT NULL,
    updated_at    INTEGER NOT NULL
  )
`);

db.run('CREATE INDEX IF NOT EXISTS listings_state ON listings (state)');
db.run('CREATE INDEX IF NOT EXISTS listings_seller ON listings (seller)');
db.run('CREATE INDEX IF NOT EXISTS listings_item ON listings (item_group, item_number)');

db.run(`
  CREATE TABLE IF NOT EXISTS balances (
    account   TEXT PRIMARY KEY,
    zen       INTEGER NOT NULL DEFAULT 0
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS audit (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    at        INTEGER NOT NULL,
    listing   TEXT,
    account   TEXT,
    event     TEXT NOT NULL,
    detail    TEXT
  )
`);

export { db };

/**
 * A listing's life.
 *
 * `pending` is the important one: a listing exists the moment a seller asks
 * for it, but it is not on sale until a bot has physically taken the item, and
 * a seller who never completes that handover leaves a `pending` row that never
 * becomes visible to anybody. Showing it earlier would advertise an item the
 * service does not hold.
 */
export type ListingState =
  | 'pending'
  | 'active'
  | 'claimed'
  | 'sold'
  | 'cancelled'
  | 'returning';

export type ListingRow = {
  id: string;
  seller: string;
  price: number;
  item_group: number;
  item_number: number;
  item_level: number;
  item_json: string;
  category: string;
  state: ListingState;
  holder: string | null;
  holder_slot: number | null;
  buyer: string | null;
  created_at: number;
  updated_at: number;
};

export function audit(
  event: string,
  fields: { listing?: string; account?: string; detail?: unknown } = {}
): void {
  db.query(
    'INSERT INTO audit (at, listing, account, event, detail) VALUES (?, ?, ?, ?, ?)'
  ).run(
    Date.now(),
    fields.listing ?? null,
    fields.account ?? null,
    event,
    fields.detail === undefined ? null : JSON.stringify(fields.detail)
  );
}
