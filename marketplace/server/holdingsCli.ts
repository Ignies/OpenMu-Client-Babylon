import items from '../../src/common/items.json';
import { db } from './db';

/**
 * Who holds what: every listing the service has a bot carrying, by bot.
 *
 *   MARKETPLACE_DB=/home/mu/.mu-marketplace/market.sqlite bun run marketplace-holdings
 *
 * The service's own record, not the game's: `holder` and `holder_slot` are
 * what the worker wrote when it collected, and the worker checks them
 * against the bot's actual bag before every delivery. A row here with no bot
 * online to match is the first thing to look at when a listing is stuck.
 */

type Row = {
  id: string;
  state: string;
  holder: string | null;
  holder_slot: number | null;
  seller: string;
  seller_char: string;
  buyer_char: string | null;
  price: number;
  item_group: number;
  item_number: number;
  item_level: number;
  updated_at: number;
};

const names = new Map<string, string>();
for (const entry of items as { Group: number; Index: number; ItemName: string }[]) {
  names.set(`${entry.Group}/${entry.Index}`, entry.ItemName);
}

const itemName = (row: Row) =>
  `${names.get(`${row.item_group}/${row.item_number}`) ?? `item ${row.item_group}/${row.item_number}`}` +
  (row.item_level ? ` +${row.item_level}` : '');

const age = (at: number) => {
  const mins = Math.floor((Date.now() - at) / 60_000);
  return mins < 60 ? `${mins}m` : mins < 24 * 60 ? `${Math.floor(mins / 60)}h` : `${Math.floor(mins / 1440)}d`;
};

const rows = db
  .query(
    `SELECT id, state, holder, holder_slot, seller, seller_char, buyer_char, price,
            item_group, item_number, item_level, updated_at
     FROM listings WHERE state IN ('active', 'claimed', 'returning', 'stuck')
     ORDER BY holder, holder_slot`
  )
  .all() as Row[];

const byBot = new Map<string, Row[]>();
for (const row of rows) {
  const key = row.holder ?? '(no bot)';
  byBot.set(key, [...(byBot.get(key) ?? []), row]);
}

if (byBot.size === 0) console.log('no bot holds anything');
for (const [holder, held] of [...byBot.entries()].sort()) {
  console.log(`${holder}: ${held.length} item(s)`);
  for (const row of held) {
    const slot = row.holder_slot === null ? 'slot ?' : `slot ${String(row.holder_slot).padStart(3)}`;
    const who = row.state === 'claimed' ? `for ${row.buyer_char}` : `from ${row.seller_char}`;
    console.log(
      `  ${slot}  ${row.state.padEnd(9)} ${itemName(row).padEnd(28)} ${String(row.price).padStart(11)} Zen  ${who}  ${age(row.updated_at)} ago  ${row.id.slice(0, 8)}`
    );
  }
}

const pending = db.query(`SELECT count(*) AS n FROM listings WHERE state = 'pending'`).get() as { n: number };
if (pending.n > 0) console.log(`\n${pending.n} listing(s) waiting to be collected`);

const balances = db.query('SELECT account, zen FROM balances WHERE zen > 0 ORDER BY zen DESC').all() as {
  account: string;
  zen: number;
}[];
if (balances.length > 0) {
  console.log('\nowed to sellers:');
  for (const b of balances) console.log(`  ${b.account.padEnd(12)} ${String(b.zen).padStart(11)} Zen`);
}

const requests = db.query('SELECT account, character, requested_at FROM payout_requests').all() as {
  account: string;
  character: string;
  requested_at: number;
}[];
if (requests.length > 0) {
  console.log('\ncollect requests:');
  for (const r of requests) console.log(`  ${r.account.padEnd(12)} via ${r.character}  ${age(r.requested_at)} ago`);
}

const leases = db.query('SELECT key, worker, until FROM leases WHERE until >= ?').all(Date.now()) as {
  key: string;
  worker: string;
  until: number;
}[];
if (leases.length > 0) {
  console.log('\nin hand right now:');
  for (const l of leases) console.log(`  ${l.worker.padEnd(8)} ${l.key}`);
}

db.close();
