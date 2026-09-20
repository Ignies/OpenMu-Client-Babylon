import items from '../../src/common/items.json';
import { postgresBoxes } from './boxes';
import { db, type ListingRow } from './db';
import { verdict } from './reconcile';

/**
 * Listings against boxes, both ways.
 *
 *   MARKETPLACE_DB=/home/mu/.mu-marketplace/market.sqlite bun run marketplace-audit
 *
 * First every listing that should have a box, with what the box actually
 * holds and what the sweep would make of it; then every unowned ItemStorage
 * row in OpenMU's database that no listing names. The second list is the one
 * to worry about: an item there belongs to somebody and nothing will ever
 * move it.
 */

const names = new Map<string, string>();
for (const entry of items as { Group: number; Index: number; ItemName: string }[]) {
  names.set(`${entry.Group}/${entry.Index}`, entry.ItemName);
}

const itemName = (group: number, number: number, level: number) =>
  `${names.get(`${group}/${number}`) ?? `item ${group}/${number}`}` + (level ? ` +${level}` : '');

const age = (at: number) => {
  const mins = Math.floor((Date.now() - at) / 60_000);
  return mins < 60 ? `${mins}m` : mins < 24 * 60 ? `${Math.floor(mins / 60)}h` : `${Math.floor(mins / 1440)}d`;
};

const boxes = postgresBoxes();
const now = Date.now();

const rows = db
  .query(
    `SELECT * FROM listings WHERE state IN ('pending', 'active', 'claimed', 'returning', 'sold')
     ORDER BY state, updated_at`
  )
  .all() as ListingRow[];

const known = new Set<string>();
console.info(`${rows.length} listing(s) waiting on a box`);
for (const row of rows) {
  if (row.box_id) known.add(row.box_id);
  const box = row.box_id ? await boxes.state(row.box_id) : { exists: false, money: 0, item: null };
  const holds = !box.exists
    ? 'no box'
    : box.item
      ? `holds ${itemName(box.item.group, box.item.number, box.item.level)}`
      : `empty, ${box.money} Zen`;
  const next = verdict({ state: row.state, itemId: row.item_id, updatedAt: row.updated_at }, box, now);
  const verdictText = next ? `-> ${next.state} (${next.why})` : 'ok';
  console.info(
    `  ${row.state.padEnd(9)} ${itemName(row.item_group, row.item_number, row.item_level).padEnd(28)} ` +
      `${String(row.price).padStart(11)} Zen  ${row.seller_char.padEnd(10)} ${age(row.updated_at).padStart(4)} ago  ` +
      `${row.id.slice(0, 8)}  ${holds}  ${verdictText}`
  );
}

const unowned = await boxes.unowned();
const strays = unowned.filter(box => !known.has(box.id));
const finished = new Set(
  (db.query(`SELECT box_id FROM listings WHERE box_id IS NOT NULL AND state IN ('paid', 'cancelled')`).all() as {
    box_id: string;
  }[]).map(r => r.box_id)
);

console.info(`\n${unowned.length} unowned box(es) in Postgres, ${strays.length} not waited on by a listing`);
for (const box of strays) {
  const note = finished.has(box.id) ? 'a finished listing still has it' : 'no listing names it';
  console.info(`  ${box.id}  ${box.items} item(s), ${box.money} Zen  ${note}`);
}

await boxes.end();
db.close();
