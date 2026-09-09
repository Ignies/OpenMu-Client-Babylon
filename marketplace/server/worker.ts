import { BotConnection } from '../bot/connection';
import { BotSession } from '../bot/session';
import { Scope } from '../bot/scope';
import { TradeSession } from '../bot/trade';
import { Wallet } from '../bot/wallet';
import { Ledger } from '../bot/ledger';
import { collectListing, deliverPurchase, payOut, type EscrowContext } from '../bot/escrow';
import * as store from './listings';
import { audit, db } from './db';

/**
 * The bot that does the work the listings describe.
 *
 * It is one bot doing one handover at a time, on purpose. A bot can only be in
 * one place, and every handover needs it standing next to a particular player,
 * so running several against the same customer would just make them queue
 * anyway. More throughput means more bots, each with its own account and its
 * own worker, not one bot doing two things at once.
 *
 * Everything here is driven by the listing's state, never by memory of what it
 * was doing: if this process dies mid-handover, the row is still `pending` or
 * `claimed` and the next run picks it up. The only state that matters lives in
 * SQLite and in the game.
 */

const HOST = process.env.GAME_HOST ?? '127.0.0.1';
const PORT = Number(process.env.GAME_PORT ?? 55901);
const ACCOUNT = process.env.MARKETPLACE_BOT_ACCOUNT ?? 'MKT001';
const PASSWORD = process.env.MARKETPLACE_BOT_PASSWORD ?? '';
const POLL_MS = Number(process.env.MARKETPLACE_POLL_MS ?? 5000);

const stamp = () => new Date().toISOString().slice(11, 19);
const log = (message: string) => console.log(`${stamp()}  ${message}`);

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Where the bot puts an item it is holding for a listing.
 *
 * The slot matters: every trade shuffles the bag, so the service records where
 * an item landed rather than assuming, and a delivery reads that back. Slot 12
 * is the first bag square; below it is equipment.
 */
const FIRST_BAG_SLOT = 12;

type Bot = {
  name: string;
  connection: BotConnection;
  session: BotSession;
  context: EscrowContext;
};

async function connect(): Promise<Bot> {
  const tag = (message: string) => log(`[${ACCOUNT}] ${message}`);
  const connection = new BotConnection(HOST, PORT, tag);
  const scope = new Scope(connection, tag);
  const trade = new TradeSession(connection, tag);
  const wallet = new Wallet(connection, tag);
  const session = new BotSession(
    connection,
    { account: ACCOUNT, password: PASSWORD, character: ACCOUNT, createIfMissing: true },
    tag
  );

  await connection.connect();
  const character = await session.enterWorld();
  scope.selfName = character.Name;
  await wallet.waitForBalance().catch(() => tag('no balance reported; handovers will not reconcile'));

  return {
    name: character.Name,
    connection,
    session,
    context: {
      session,
      trade,
      scope,
      wallet,
      ledger: new Ledger(undefined, (m: string) => log(`[ledger] ${m}`)),
      botName: character.Name,
      log: (m: string) => log(`[escrow] ${m}`),
    },
  };
}

/** Which bag slot the bot's next collected item should go to. */
function nextFreeSlot(): number {
  const taken = db
    .query(`SELECT holder_slot AS s FROM listings WHERE holder = ? AND holder_slot IS NOT NULL
            AND state IN ('active', 'claimed', 'returning')`)
    .all(ACCOUNT) as { s: number }[];
  const used = new Set(taken.map(r => r.s));
  let slot = FIRST_BAG_SLOT;
  while (used.has(slot)) slot++;
  return slot;
}

/** A seller is handing an item over, so it can go on sale. */
async function collect(bot: Bot, listing: store.Listing): Promise<void> {
  log(`collecting "${listing.id}" from ${listing.sellerCharacter}`);
  const slot = nextFreeSlot();
  const result = await collectListing(bot.context, listing.sellerCharacter, 1);

  if (!result.ok) {
    audit('collect failed', { listing: listing.id, detail: result.reason });
    return;
  }
  store.activate(listing.id, ACCOUNT, slot);
  log(`"${listing.id}" is on sale, held in slot ${slot}`);
}

/** A buyer has reserved something: hand it over and take the price. */
async function deliver(bot: Bot, listing: store.Listing): Promise<void> {
  const slot = holderSlot(listing.id);
  if (slot === null || !listing.buyerCharacter) {
    audit('deliver impossible', { listing: listing.id, detail: 'no held slot or buyer character' });
    return;
  }

  log(`delivering "${listing.id}" to ${listing.buyerCharacter} for ${listing.price}`);
  const result = await deliverPurchase(bot.context, listing.buyerCharacter, slot, listing.price);

  if (!result.ok) {
    // Back on sale rather than stuck: the buyer never paid, so nobody is owed
    // anything and somebody else can have it.
    store.release(listing.id, result.reason);
    return;
  }
  store.settleSale(listing.id);
  log(`"${listing.id}" sold; ${listing.seller} is owed ${listing.price}`);
}

/** A seller cancelled: give it back. */
async function giveBack(bot: Bot, listing: store.Listing): Promise<void> {
  const slot = holderSlot(listing.id);
  if (slot === null) {
    // Never collected in the first place, so there is nothing to return.
    db.query(`UPDATE listings SET state = 'cancelled', updated_at = ? WHERE id = ?`).run(
      Date.now(),
      listing.id
    );
    return;
  }

  log(`returning "${listing.id}" to ${listing.sellerCharacter}`);
  const result = await deliverPurchase(bot.context, listing.sellerCharacter, slot, 0);
  if (!result.ok) {
    audit('return failed', { listing: listing.id, detail: result.reason });
    return;
  }
  db.query(`UPDATE listings SET state = 'cancelled', updated_at = ? WHERE id = ?`).run(
    Date.now(),
    listing.id
  );
}

function holderSlot(id: string): number | null {
  const row = db.query('SELECT holder_slot AS s FROM listings WHERE id = ?').get(id) as
    | { s: number | null }
    | undefined;
  return row?.s ?? null;
}

/** Sellers waiting on Zen from sales made while they were away. */
async function payOutOwed(bot: Bot): Promise<void> {
  const owed = db
    .query(
      `SELECT b.account, b.zen, (
         SELECT seller_char FROM listings l WHERE l.seller = b.account
         ORDER BY updated_at DESC LIMIT 1
       ) AS character
       FROM balances b WHERE b.zen > 0`
    )
    .all() as { account: string; zen: number; character: string | null }[];

  for (const row of owed) {
    if (!row.character) continue;
    // Only pay somebody standing in front of us; the balance keeps until then.
    if (!bot.context.scope.byName(row.character)) continue;

    const taken = store.takeBalance(row.account);
    if (taken <= 0) continue;

    const result = await payOut(bot.context, row.character, taken);
    if (!result.ok) {
      // Credited back rather than lost: the money never left the bot.
      store.credit(row.account, taken);
      audit('payout failed', { account: row.account, detail: result.reason });
    }
  }
}

async function tick(bot: Bot): Promise<void> {
  for (const listing of store.pendingWork()) {
    if (!bot.connection.connected) return;

    if (listing.state === 'pending') await collect(bot, listing);
    else if (listing.state === 'claimed') await deliver(bot, listing);
    else if (listing.state === 'returning') await giveBack(bot, listing);
  }

  await payOutOwed(bot);
}

async function main(): Promise<void> {
  if (!PASSWORD) {
    console.error('MARKETPLACE_BOT_PASSWORD is not set');
    process.exit(1);
  }

  for (;;) {
    let bot: Bot | null = null;
    try {
      bot = await connect();
      log(`worker ready as ${bot.name}, polling every ${POLL_MS}ms`);

      while (bot.connection.connected) {
        await tick(bot);
        await sleep(POLL_MS);
      }
      log('connection lost; reconnecting');
    } catch (error) {
      log(`worker error: ${error instanceof Error ? error.message : error}`);
    } finally {
      try {
        bot?.session.logOut();
        await sleep(500);
      } catch {
        // Already gone.
      }
      bot?.connection.close();
    }

    // The account stays connected server side for a moment after a socket
    // drops, so reconnecting immediately would be refused.
    await sleep(15_000);
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
