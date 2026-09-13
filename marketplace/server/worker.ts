import { BotConnection } from '../bot/connection';
import { BotSession } from '../bot/session';
import { Scope } from '../bot/scope';
import { TradeSession } from '../bot/trade';
import { Wallet } from '../bot/wallet';
import { Bag } from '../bot/bag';
import { Ledger } from '../bot/ledger';
import { ServerMessages } from '../bot/serverMessages';
import {
  HELD_ITEM_MISSING,
  collectListing,
  deliverPurchase,
  deliverViaShop,
  payOut,
  type EscrowContext,
  type EscrowResult,
} from '../bot/escrow';
import { ShopSession, MINIMUM_SHOP_LEVEL } from '../bot/shop';
import { sameItem, type ListedItem } from '../bot/itemMatch';
import * as store from './listings';
import { audit, db } from './db';
import { onServer, presenceOf } from './presence';
import { Backoff, decide } from './dispatch';

/**
 * The bot that does the work the listings describe.
 *
 * It is one bot doing one handover at a time, on purpose. A bot can only be in
 * one place, and every handover needs it standing next to a particular player,
 * so running several against the same customer would just make them queue
 * anyway. More throughput means more bots, each with its own account and its
 * own worker, not one bot doing two things at once - and they share the rows
 * safely because each piece of work, and each customer, is leased to one bot
 * for the length of a handover, and a claim or a return belongs to the bot
 * holding the item. Each bot plays on one game server and, since presence
 * says which server a player is on, only goes after the players on its own.
 *
 * Everything here is driven by the listing's state, never by memory of what it
 * was doing: if this process dies mid-handover, the row is still `pending` or
 * `claimed` and the next run picks it up. The only state that matters lives in
 * SQLite and in the game. What the process does remember is which work has
 * been failing, so that it is retried later rather than on every poll.
 *
 * Between handovers the bot is hidden. It is a game master, `/hide` takes it
 * out of everybody's view, and it only steps out - wearing Julia's skin, the
 * market's own NPC - once it is standing on the customer's tile.
 */

const HOST = process.env.GAME_HOST ?? '127.0.0.1';
const PORT = Number(process.env.GAME_PORT ?? 55901);
const ACCOUNT = process.env.MARKETPLACE_BOT_ACCOUNT ?? 'MKT001';
const PASSWORD = process.env.MARKETPLACE_BOT_PASSWORD ?? '';
const POLL_MS = Number(process.env.MARKETPLACE_POLL_MS ?? 5000);

/**
 * What the bot looks like when it is seen. 547 is Market Union Member Julia,
 * the marketplace's own NPC in the original game. A `MonsterDefinition.Number`;
 * 0 stays human.
 */
const SKIN = Number(process.env.MARKETPLACE_BOT_SKIN ?? 547);

/** Hidden between handovers. `off` for a bot that cannot `/hide`. */
const STEALTH = (process.env.MARKETPLACE_BOT_HIDE ?? 'on') !== 'off';

/** A payout request this old is dropped; the seller can press Collect again. */
const PAYOUT_REQUEST_TTL_MS = 24 * 60 * 60_000;

/**
 * How long a piece of work, and its customer, stay this bot's. Longer than
 * any handover (a shop waits three minutes), short enough that a bot dying
 * mid-handover does not park a listing for the afternoon.
 */
const LEASE_MS = 6 * 60_000;

const stamp = () => new Date().toISOString().slice(11, 19);
const log = (message: string) => console.log(`${stamp()}  ${message}`);

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

type Bot = {
  name: string;
  connection: BotConnection;
  session: BotSession;
  bag: Bag;
  /** Always present for item moves, whether or not this bot sells through it. */
  shop: ShopSession;
  context: EscrowContext;
};

const backoff = new Backoff();

/** The last reason logged for waiting on a piece of work, so it is said once. */
const waitingBecause = new Map<string, string>();

function noteWaiting(key: string, reason: string | null): void {
  if (reason === null) {
    waitingBecause.delete(key);
    return;
  }
  if (waitingBecause.get(key) === reason) return;
  waitingBecause.set(key, reason);
  log(`${key} is waiting: ${reason}`);
}

async function connect(): Promise<Bot> {
  const tag = (message: string) => log(`[${ACCOUNT}] ${message}`);
  const connection = new BotConnection(HOST, PORT, tag);
  const scope = new Scope(connection, tag);
  const trade = new TradeSession(connection, tag);
  const wallet = new Wallet(connection, tag);
  const bag = new Bag(connection, tag);
  const shop = new ShopSession(connection, tag);
  // Registered before the login, so anything the server says during it is seen.
  new ServerMessages(connection, tag);
  const session = new BotSession(
    connection,
    { account: ACCOUNT, password: PASSWORD, character: ACCOUNT, createIfMissing: true },
    tag
  );

  await connection.connect();
  const character = await session.enterWorld();
  scope.selfName = character.Name;

  // Out of sight first, then into costume: a skin change is announced to
  // whoever can see the bot, and nobody should be able to.
  if (STEALTH) session.hide();
  if (SKIN > 0) session.skinAs(SKIN);
  tag(`${STEALTH ? 'hidden' : 'visible'} between handovers, skin ${SKIN || 'none'}`);

  // A shop is the delivery mechanism, and OpenMU refuses a character below
  // level 6 - which a freshly created bot is - at the first step, the move of
  // the item into the shop window. Said once, at startup, and the shop is
  // then simply not offered: every delivery goes by trade instead.
  const shopUsable = character.Level === undefined || character.Level >= MINIMUM_SHOP_LEVEL;
  if (!shopUsable) {
    tag(
      `level ${character.Level}: too low to open a shop (needs ${MINIMUM_SHOP_LEVEL}), ` +
        `so deliveries will be trades`
    );
  }
  await wallet.waitForBalance().catch(() => tag('no balance reported; handovers will not reconcile'));

  // Said once, because a presence server that cannot be reached makes every
  // dispatch a blind try and one that is reachable decides who gets visited.
  const probe = await presenceOf(ACCOUNT);
  tag(
    probe === null
      ? `presence at ${process.env.PRESENCE_URL ?? 'http://127.0.0.1:3001'} is unreachable; dispatching blind`
      : probe.ports === null
        ? 'presence answers, but not which game server a player is on; serving everyone'
        : `presence answers with game servers; this bot serves port ${PORT}`
  );

  return {
    name: character.Name,
    connection,
    session,
    bag,
    shop,
    context: {
      session,
      trade,
      scope,
      wallet,
      shop: shopUsable ? shop : undefined,
      bag,
      stealth: STEALTH,
      ledger: new Ledger(undefined, (m: string) => log(`[ledger] ${m}`)),
      botName: character.Name,
      log: (m: string) => log(`[escrow] ${m}`),
    },
  };
}

/**
 * The one bag slot holding this listing's item, when the bag can say.
 *
 * Slots already written down against other listings are ruled out first, so
 * two listings of the same kind of item never resolve to the same square.
 * Null when there is no candidate or more than one: guessing is what put
 * empty slots up for sale.
 */
function findHeld(bot: Bot, listing: store.Listing): number | null {
  if (!bot.bag.known) return null;
  const taken = store.heldSlots(ACCOUNT);
  const candidates = bot.bag
    .slotsWhere(bytes => sameItem(bytes, listing.item as ListedItem))
    .filter(slot => !taken.has(slot));
  return candidates.length === 1 ? candidates[0] : null;
}

/** True when the recorded slot holds the listed item itself, not merely something. */
function holdsListed(bot: Bot, slot: number, listing: store.Listing): boolean {
  const bytes = bot.bag.slots.get(slot);
  return bytes !== undefined && sameItem(bytes, listing.item as ListedItem);
}

/**
 * The slot to offer from: the recorded one, or the bag's answer, or none.
 *
 * The recorded slot is trusted only while it holds the item the listing
 * describes: what goes out to a buyer is checked against what they were
 * shown, never taken on the slot number's word. An item can also be sitting
 * in the stall grid: an earlier run stocked the shop, misread the server's
 * answer as a refusal, and never put it back. That one is brought back into
 * the bag first - an item is only ever offered from a bag slot - and the
 * listing learns its new home.
 */
async function slotFor(bot: Bot, listing: store.Listing): Promise<number | null> {
  const { holder, slot } = store.holderOf(listing.id);
  if (holder !== null && holder !== ACCOUNT) return null;
  if (slot !== null && !bot.bag.known) return slot;
  if (slot !== null && holdsListed(bot, slot, listing)) return slot;
  if (slot !== null && bot.bag.slots.has(slot)) {
    log(`"${listing.id}": bag slot ${slot} holds something other than the listed item`);
  }

  let found = findHeld(bot, listing);
  if (found === null) found = await recoverFromStall(bot, listing);
  if (found !== null && found !== slot) {
    log(`"${listing.id}" is in slot ${found}, not ${slot ?? 'unknown'}; adopting it`);
    store.adoptSlot(listing.id, found);
  }
  return found;
}

/** Moves a stranded item from the stall back into the bag; the new bag slot, or null. */
async function recoverFromStall(bot: Bot, listing: store.Listing): Promise<number | null> {
  const stranded = bot.bag.stallSlotsWhere(bytes => sameItem(bytes, listing.item as ListedItem));
  if (stranded.length !== 1) return null;

  // A shop that is open refuses every move out of it.
  bot.shop.close();
  for (const free of bot.bag.freeBagSlots().slice(0, 8)) {
    try {
      await bot.shop.unstockItem(stranded[0], free);
      log(`"${listing.id}" was stranded in stall slot ${stranded[0]}; back in bag slot ${free}`);
      audit('recovered from stall', { listing: listing.id, detail: { from: stranded[0], to: free } });
      return free;
    } catch {
      // That square did not fit it; the next one may.
    }
  }
  log(`"${listing.id}" is stranded in stall slot ${stranded[0]} and no bag square would take it`);
  return null;
}

/** A seller is handing an item over, so it can go on sale. Returns done. */
async function collect(bot: Bot, listing: store.Listing): Promise<boolean> {
  log(`collecting "${listing.id}" from ${listing.sellerCharacter}`);
  const result = await collectListing(
    bot.context,
    listing.sellerCharacter,
    1,
    listing.item as ListedItem
  );

  if (!result.ok) {
    if (result.declined) {
      // The seller said no, cancelled the trade, or left it open: it is their
      // item and their call, and the bot does not come back asking.
      log(`"${listing.id}" dropped: ${result.reason}`);
      store.drop(listing.id, result.reason);
      return true;
    }
    log(`could not collect "${listing.id}": ${result.reason}`);
    audit('collect failed', { listing: listing.id, detail: result.reason });
    return false;
  }
  // Recorded as held before anything else can go wrong. The item has left
  // the seller's bag; if this row is not written the next poll treats the
  // listing as uncollected and takes another one.
  store.activate(listing.id, ACCOUNT, result.slot);

  if (result.slot === null) {
    // The bag may still know: the item is the only one of its kind that is
    // not already spoken for.
    const found = findHeld(bot, listing);
    if (found !== null) {
      store.adoptSlot(listing.id, found);
      log(`"${listing.id}" is on sale, held in slot ${found} (found in the bag)`);
      return true;
    }
    // Held, but nobody can say where. Off sale rather than sold and then
    // never delivered; a person sorts it out.
    store.markStuck(listing.id, 'collected without a known slot');
    log(`"${listing.id}" is held but its slot is unknown; it is marked stuck`);
    return true;
  }
  log(`"${listing.id}" is on sale, held in slot ${result.slot}`);
  return true;
}

/**
 * Whether a refused shop delivery is worth trying as a trade.
 *
 * Only for the reasons a shop is structurally unable to help with. "Nobody
 * bought it" is not one: the buyer had three minutes and did not come, and
 * opening a trade window at them instead would be pestering, not delivering.
 */
function shopUnavailable(reason: string): boolean {
  return (
    reason.includes('no shop') ||
    reason.includes('CharacterLevelTooLow') ||
    reason.includes('ItemIsBlocked') ||
    reason.includes('would not open') ||
    reason.includes('would not take it') ||
    reason.includes('did not reach shop slot')
  );
}

/** A buyer has reserved something: hand it over and take the price. */
async function deliver(bot: Bot, listing: store.Listing): Promise<boolean> {
  if (!listing.buyerCharacter) {
    store.release(listing.id, 'claimed without a buyer character');
    return true;
  }

  const slot = await slotFor(bot, listing);
  if (slot === null) {
    store.markStuck(listing.id, 'held item not found in the bag');
    log(`"${listing.id}" cannot be delivered: the held item is not in the bag; marked stuck`);
    return true;
  }

  log(`delivering "${listing.id}" to ${listing.buyerCharacter} for ${listing.price}`);
  // Through the shop, because the server pairs item and payment there in one
  // step: no table to leave empty, no confirm to get wrong, and no cancel to
  // destroy the buyer's Zen. Trading stays the fallback for what a shop
  // cannot sell - a Harmony item, or a bot too low to open one.
  let result: EscrowResult = await deliverViaShop(
    bot.context,
    listing.buyerCharacter,
    slot,
    listing.price
  );
  if (!result.ok && shopUnavailable(result.reason)) {
    log(`shop delivery refused (${result.reason}); trading instead`);
    result = await deliverPurchase(bot.context, listing.buyerCharacter, slot, listing.price);
  }

  if (!result.ok) {
    if (result.reason.startsWith(HELD_ITEM_MISSING)) {
      store.markStuck(listing.id, result.reason);
      log(`"${listing.id}": ${result.reason}; marked stuck`);
      return true;
    }
    // Back on sale rather than stuck: the buyer never paid, so nobody is owed
    // anything and somebody else can have it.
    log(`could not deliver "${listing.id}": ${result.reason}; back on sale`);
    store.release(listing.id, result.reason);
    return false;
  }
  store.settleSale(listing.id);
  log(`"${listing.id}" sold; ${listing.seller} is owed ${listing.price}`);
  return true;
}

/** A seller cancelled: give it back. */
async function giveBack(bot: Bot, listing: store.Listing): Promise<boolean> {
  const { holder } = store.holderOf(listing.id);
  if (holder === null) {
    // Never collected in the first place, so there is nothing to return.
    db.query(`UPDATE listings SET state = 'cancelled', updated_at = ? WHERE id = ?`).run(
      Date.now(),
      listing.id
    );
    return true;
  }

  const slot = await slotFor(bot, listing);
  if (slot === null) {
    store.markStuck(listing.id, 'held item not found in the bag');
    log(`"${listing.id}" cannot be returned: the held item is not in the bag; marked stuck`);
    return true;
  }

  log(`returning "${listing.id}" to ${listing.sellerCharacter}`);
  const result = await deliverPurchase(bot.context, listing.sellerCharacter, slot, 0);
  if (!result.ok) {
    if (result.reason.startsWith(HELD_ITEM_MISSING)) {
      store.markStuck(listing.id, result.reason);
      return true;
    }
    if (result.declined) {
      // They asked for it back and then would not take it. Back on sale at
      // the same price; cancelling again is one click.
      log(`"${listing.id}" back on sale: ${result.reason}`);
      store.backOnSale(listing.id, result.reason);
      return true;
    }
    log(`could not return "${listing.id}": ${result.reason}`);
    audit('return failed', { listing: listing.id, detail: result.reason });
    return false;
  }
  db.query(`UPDATE listings SET state = 'cancelled', updated_at = ? WHERE id = ?`).run(
    Date.now(),
    listing.id
  );
  return true;
}

/** Sellers who pressed Collect, met one at a time. */
async function payOutRequested(bot: Bot): Promise<void> {
  const now = Date.now();
  for (const request of store.payoutRequests()) {
    if (!bot.connection.connected) return;

    const key = `payout:${request.account}`;
    if (!backoff.due(key, now)) continue;

    if (now - request.requestedAt > PAYOUT_REQUEST_TTL_MS) {
      store.clearPayoutRequest(request.account);
      audit('payout request dropped', { account: request.account, detail: 'older than a day' });
      continue;
    }
    const seen = await presenceOf(request.account);
    if (seen?.online === false) {
      noteWaiting(key, `${request.account} is not online`);
      continue;
    }
    if (onServer(seen, PORT) === false) {
      noteWaiting(key, `${request.account} is on another game server`);
      continue;
    }
    noteWaiting(key, null);

    const keys = [key, `customer:${request.character.toLowerCase()}`];
    if (!store.acquireLeases(keys, ACCOUNT, LEASE_MS)) continue;
    try {
      const taken = store.takeBalance(request.account);
      if (taken <= 0) {
        store.clearPayoutRequest(request.account);
        continue;
      }

      log(`paying ${request.account} ${taken} Zen via ${request.character}`);
      const result = await payOut(bot.context, request.character, taken);
      if (!result.ok) {
        // Credited back rather than lost: the money never left the bot.
        store.credit(request.account, taken);
        log(`could not pay ${request.account} ${taken} Zen: ${result.reason}; credited back`);
        audit('payout failed', { account: request.account, detail: result.reason });
        if (result.declined) {
          // They refused the Zen. The request is done; Collect asks again.
          store.clearPayoutRequest(request.account);
        } else {
          backoff.failed(key, Date.now());
        }
        continue;
      }
      store.clearPayoutRequest(request.account);
      backoff.succeeded(key);
      audit('payout paid', { account: request.account, detail: { zen: taken } });
    } finally {
      store.releaseLeases(keys, ACCOUNT);
    }
  }
}

async function tick(bot: Bot): Promise<void> {
  const work = store.pendingWork();
  backoff.keepOnly([
    ...work.map(l => l.id),
    ...store.payoutRequests().map(r => `payout:${r.account}`),
  ]);

  for (const listing of work) {
    if (!bot.connection.connected) return;
    const now = Date.now();
    if (!backoff.due(listing.id, now)) continue;

    // A claim or a return is the holding bot's to finish: only it has the item.
    if (listing.holder !== null && listing.holder !== ACCOUNT) continue;

    // A cancellation of something never collected needs nobody: the item is
    // still in the seller's bag, and the row just closes.
    if (listing.state === 'returning' && listing.holder === null) {
      await giveBack(bot, listing);
      continue;
    }

    // Who the bot has to meet: the buyer of a claim, the seller otherwise.
    const who = listing.state === 'claimed' ? listing.buyer : listing.seller;
    const character = listing.state === 'claimed' ? listing.buyerCharacter : listing.sellerCharacter;
    const seen = who ? await presenceOf(who) : null;
    const decision = decide(
      { id: listing.id, state: listing.state as 'pending' | 'claimed' | 'returning', updatedAt: listing.updatedAt },
      seen?.online ?? null,
      now,
      onServer(seen, PORT)
    );

    if (decision.kind === 'wait') {
      noteWaiting(`"${listing.id}"`, decision.reason);
      continue;
    }
    noteWaiting(`"${listing.id}"`, null);
    if (decision.kind === 'release') {
      log(`releasing "${listing.id}": ${decision.reason}`);
      store.release(listing.id, decision.reason);
      continue;
    }
    if (decision.kind === 'expire') {
      log(`dropping "${listing.id}": ${decision.reason}`);
      store.drop(listing.id, decision.reason);
      continue;
    }

    // Ours for the length of the handover, the customer included: two bots
    // at one player would have the second trade request refused by the
    // server, and a refusal reads as the player saying no.
    const keys = [`listing:${listing.id}`];
    if (character) keys.push(`customer:${character.toLowerCase()}`);
    if (!store.acquireLeases(keys, ACCOUNT, LEASE_MS)) {
      noteWaiting(`"${listing.id}"`, 'another bot has it, or has its customer');
      continue;
    }

    let done = false;
    try {
      if (listing.state === 'pending') done = await collect(bot, listing);
      else if (listing.state === 'claimed') done = await deliver(bot, listing);
      else if (listing.state === 'returning') done = await giveBack(bot, listing);
    } finally {
      store.releaseLeases(keys, ACCOUNT);
    }

    if (done) backoff.succeeded(listing.id);
    else {
      backoff.failed(listing.id, Date.now());
      log(`"${listing.id}" will be tried again in ${Math.round(backoff.remaining(listing.id, Date.now()) / 1000)}s`);
    }
  }

  await payOutRequested(bot);
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
