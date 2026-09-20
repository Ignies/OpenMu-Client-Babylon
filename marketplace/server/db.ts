import { Database } from 'bun:sqlite';
import { mkdirSync, readdirSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * The marketplace's own storage: the catalogue, and an audit row for
 * everything that moves.
 *
 * Deliberately not OpenMU's database. The items themselves live there, in
 * escrow boxes the game server's plugin moves them into and out of, and the
 * service reads those boxes as the truth; but a service that adds tables to a
 * schema EF Core owns and migrates is a service that breaks on the next
 * OpenMU upgrade. So what is for sale, at what price, and for whom, is kept
 * here, keyed to the boxes by id.
 *
 * Every piece of SQL lives in this file and listings.ts. The rest of the
 * service sees typed records, never rows.
 */

/**
 * Outside the checkout on purpose: the production update runs
 * `git clean -fdx` in it, which would take the listings with it.
 */
export const DB_PATH =
  process.env.MARKETPLACE_DB || path.join(os.homedir(), '.mu-marketplace', 'market.sqlite');

mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH, { create: true });

// WAL so a CLI can read the listings while the server is serving them.
db.run('PRAGMA journal_mode = WAL');
db.run('PRAGMA foreign_keys = ON');

/**
 * The schema lives in `schema/*.sql`, numbered, and every statement in them
 * is idempotent or made so here. They are applied on every start so a fresh
 * box works, and they are what an operator runs by hand on a live one after
 * a deploy - a table that only ever came into being as a side effect of a
 * service booting would be invisible to whoever has to reproduce it.
 *
 * SQLite has no `ADD COLUMN IF NOT EXISTS`, so an ALTER is skipped when the
 * column is already there.
 */
const SCHEMA_DIR = path.join(import.meta.dir, 'schema');
const ADD_COLUMN_RE = /^ALTER\s+TABLE\s+(\w+)\s+ADD\s+COLUMN\s+(\w+)/i;

function hasColumn(table: string, column: string): boolean {
  const columns = db.query(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return columns.some(c => c.name === column);
}

function applySchema(file: string): void {
  const source = readFileSync(path.join(SCHEMA_DIR, file), 'utf8').replace(/--[^\n]*/g, '');
  for (const statement of source.split(';').map(s => s.trim()).filter(Boolean)) {
    const alter = statement.match(ADD_COLUMN_RE);
    if (alter && hasColumn(alter[1], alter[2])) continue;
    db.exec(statement);
  }
}

for (const file of readdirSync(SCHEMA_DIR).filter(f => f.endsWith('.sql')).sort()) {
  applySchema(file);
}

export { db };

/**
 * A listing's life, as the box in Postgres tells it (reconcile.ts):
 *
 *   pending    the seller asked; the item is still in their bag until the
 *              game server has acted on the list token
 *   active     the box holds the item; on sale
 *   claimed    one buyer holds a buy token for it
 *   sold       the box holds the money instead of the item
 *   paid       the seller collected; the box is gone
 *   returning  the seller holds a cancel token for it
 *   cancelled  the item never left, or went back
 */
export type ListingState =
  | 'pending'
  | 'active'
  | 'claimed'
  | 'sold'
  | 'paid'
  | 'returning'
  | 'cancelled';

export const LISTING_STATES: readonly ListingState[] = [
  'pending',
  'active',
  'claimed',
  'sold',
  'paid',
  'returning',
  'cancelled',
];

export type ListingRow = {
  id: string;
  seller: string;
  seller_char: string;
  price: number;
  item_group: number;
  item_number: number;
  item_level: number;
  item_json: string;
  category: string;
  state: ListingState;
  buyer: string | null;
  buyer_char: string | null;
  box_id: string | null;
  item_id: string | null;
  proceeds: number | null;
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
