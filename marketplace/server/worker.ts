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
import { DEFAULT_OUTFIT, botName, ensureBotAccounts, outfitBotCharacters } from '../bot/accounts';
import * as store from './listings';
import { audit, db } from './db';
import { onServer, presenceOf } from './presence';
import { Backoff, decide } from './dispatch';
import { pickForListing, pickForPayout, type Runner } from './fleet';

/**
 * The fleet of bots that does the work the listings describe.
 *
 * One process, several bots, one game server. A bot can only be in one
 * place and every handover needs it standing next to a particular player,
 * so the way to serve several players at once is several bots: each piece
 * of work goes to an idle one, and while it is away the others are still
 * free. A claim or a return is finished only by the bot holding the item,
 * because only it has the item; a payout goes to a bot that carries the Zen.
 *
 * The bots are `MKT001` upwards, as many as `MARKETPLACE_BOTS` asks for. With
 * `DATABASE_URL` set the fleet makes the accounts it is short of and promotes
 * their characters to game master itself; without it, `createAccounts.ts`
 * does the same by hand.
 *
 * Everything here is driven by the listing's state, never by memory of what
 * a bot was doing: if this process dies mid-handover, the row is still
 * `pending` or `claimed` and the next run picks it up. The only state that
 * matters lives in SQLite and in the game. What the process does remember is
 * which work has been failing, so that it is retried later rather than on
 * every poll. Work in hand is leased in SQLite too, so a second fleet on the
 * same rows (another game server's) leaves it alone.
 *
 * Between handovers every bot is hidden. It is a game master, `/hide` takes
 * it out of everybody's view, and it only steps out - wearing Julia's skin,
 * the market's own NPC - once it is standing on the customer's tile.
 */

const HOST = process.env.GAME_HOST ?? '127.0.0.1';
const PORT = Number(process.env.GAME_PORT ?? 55901);
const PASSWORD = process.env.MARKETPLACE_BOT_PASSWORD ?? '';
const POLL_MS = Number(process.env.MARKETPLACE_POLL_MS ?? 5000);

/**
 * Which bots this process runs. `MARKETPLACE_BOTS=5` is MKT001 to MKT005;
 * `MARKETPLACE_BOT_FIRST=6` starts a second fleet at MKT006, for another
 * game server. The old single-bot `MARKETPLACE_BOT_ACCOUNT` still means that
 * one bot.
 */
const NAMES: string[] = (() => {
  const count = Number(process.env.MARKETPLACE_BOTS ?? 0);
  if (count > 0) {
    const first = Number(process.env.MARKETPLACE_BOT_FIRST ?? 1);
    return Array.from({ length: count }, (_, i) => botName(first + i));
  }
  return [process.env.MARKETPLACE_BOT_ACCOUNT ?? botName(1)];
})();

/** OpenMU's database, for the accounts the fleet is short of. Optional. */
const DATABASE_URL = process.env.DATABASE_URL ?? '';

/** What a fresh bot character is given: enough level for a shop, and a float. */
const OUTFIT = {
  level: Number(process.env.MARKETPLACE_BOT_LEVEL ?? DEFAULT_OUTFIT.level),
  zen: Number(process.env.MARKETPLACE_BOT_ZEN ?? DEFAULT_OUTFIT.zen),
};

/**
 * What the bots look like when they are seen. 547 is Market Union Member
 * Julia, the marketplace's own NPC in the original game. A
 * `MonsterDefinition.Number`; 0 stays human.
 */
const SKIN = Number(process.env.MARKETPLACE_BOT_SKIN ?? 547);

/** Hidden between handovers. `off` for bots that cannot `/hide`. */
const STEALTH = (process.env.MARKETPLACE_BOT_HIDE ?? 'on') !== 'off';

/** A payout request this old is dropped; the seller can press Collect again. */
const PAYOUT_REQUEST_TTL_MS = 24 * 60 * 60_000;

/**
 * How long a piece of work, and its customer, stay one bot's. Longer than
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
  /** Away on a handover. */
  busy: boolean;
};

/** The bots standing in the world right now, by account. */
const fleet = new Map<string, Bot>();

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

/** Socket to standing in the world, hidden and in costume. */
async function connect(name: string): Promise<{ bot: Bot; gameMaster: boolean; level: number }> {
  const tag = (message: string) => log(`[${name}] ${message}`);
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
    { account: name, password: PASSWORD, character: name, createIfMissing: true },
    tag
  );

  await connection.connect();
  const character = await session.enterWorld();
  scope.selfName = character.Name;

  const gameMaster = session.gameMaster;
  const level = Number(character.Level ?? 0);

  // Out of sight first, then into costume: a skin change is announced to
  // whoever can see the bot, and nobody should be able to.
  if (gameMaster && STEALTH) session.hide();
  if (gameMaster && SKIN > 0) session.skinAs(SKIN);
  if (gameMaster) tag(`${STEALTH ? 'hidden' : 'visible'} between handovers, skin ${SKIN || 'none'}`);

  // A shop is the delivery mechanism, and OpenMU refuses a character below
  // level 6 - which a freshly created bot is - at the first step, the move of
  // the item into the shop window. Said once, and the shop is then simply not
  // offered: every delivery goes by trade instead.
  const shopUsable = character.Level === undefined || character.Level >= MINIMUM_SHOP_LEVEL;
  if (gameMaster && !shopUsable) {
    tag(
      `level ${character.Level}: too low to open a shop (needs ${MINIMUM_SHOP_LEVEL}), ` +
        `so deliveries will be trades`
    );
  }
  await wallet.waitForBalance().catch(() => tag('no balance reported; handovers will not reconcile'));

  return {
    gameMaster,
    level,
    bot: {
      name: character.Name,
      connection,
      session,
      bag,
      shop,
      busy: false,
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
        log: (m: string) => log(`[${name}] ${m}`),
      },
    },
  };
}

/**
 * Keeps one bot in the world for as long as the process runs.
 *
 * A character the bot has just made is not a game master until the database
 * says so, and `/hide`, `/skin` and `/trace` are game master commands; with
 * `DATABASE_URL` the fleet promotes it and logs in again, without it the bot
 * is left out and the log says why.
 */
async function runBot(name: string): Promise<never> {
  for (;;) {
    let bot: Bot | null = null;
    try {
      const entered = await connect(name);
      const short = !entered.gameMaster || entered.level < OUTFIT.level;
      if (short && DATABASE_URL) {
        // Written while the bot is out: a logged-in character is saved back
        // over anything written underneath it. The server saves on logout,
        // so the write waits for that, and the login waits for the account
        // to be let go.
        log(
          `[${name}] ${entered.gameMaster ? `is level ${entered.level}` : 'is not a game master yet'}; ` +
            `outfitting the character and logging in again`
        );
        entered.bot.session.logOut();
        await sleep(8_000);
        entered.bot.connection.close();
        await outfitBotCharacters(DATABASE_URL, OUTFIT);
        await sleep(12_000);
        continue;
      }
      if (!entered.gameMaster) {
        log(
          `[${name}] is not a game master and DATABASE_URL is not set, so it cannot hide, ` +
            `dress or reach anybody: run createAccounts.ts, then it will serve`
        );
        entered.bot.session.logOut();
        await sleep(500);
        entered.bot.connection.close();
        await sleep(5 * 60_000);
        continue;
      }

      bot = entered.bot;
      fleet.set(name, bot);
      log(`${name} ready; ${fleet.size} of ${NAMES.length} bot(s) up`);
      while (bot.connection.connected) await sleep(1000);
      log(`[${name}] connection lost; reconnecting`);
    } catch (error) {
      log(`[${name}] error: ${error instanceof Error ? error.message : error}`);
    } finally {
      if (bot) {
        fleet.delete(name);
        try {
          bot.session.logOut();
          await sleep(500);
        } catch {
          // Already gone.
        }
        bot.connection.close();
      }
    }

    // The account stays connected server side for a moment after a socket
    // drops, so reconnecting immediately would be refused.
    await sleep(15_000);
  }
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
  const taken = store.heldSlots(bot.name);
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
  if (holder !== null && holder !== bot.name) return null;
  if (slot !== null && !bot.bag.known) return slot;
  if (slot !== null && holdsListed(bot, slot, listing)) return slot;
  if (slot !== null && bot.bag.slots.has(slot)) {
    log(`[${bot.name}] "${listing.id}": bag slot ${slot} holds something other than the listed item`);
  }

  let found = findHeld(bot, listing);
  if (found === null) found = await recoverFromStall(bot, listing);
  if (found !== null && found !== slot) {
    log(`[${bot.name}] "${listing.id}" is in slot ${found}, not ${slot ?? 'unknown'}; adopting it`);
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
      log(`[${bot.name}] "${listing.id}" was stranded in stall slot ${stranded[0]}; back in bag slot ${free}`);
      audit('recovered from stall', { listing: listing.id, detail: { from: stranded[0], to: free } });
      return free;
    } catch {
      // That square did not fit it; the next one may.
    }
  }
  log(`[${bot.name}] "${listing.id}" is stranded in stall slot ${stranded[0]} and no bag square would take it`);
  return null;
}

/** A seller is handing an item over, so it can go on sale. Returns done. */
async function collect(bot: Bot, listing: store.Listing): Promise<boolean> {
  log(`[${bot.name}] collecting "${listing.id}" from ${listing.sellerCharacter}`);
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
      log(`[${bot.name}] "${listing.id}" dropped: ${result.reason}`);
      store.drop(listing.id, result.reason);
      return true;
    }
    log(`[${bot.name}] could not collect "${listing.id}": ${result.reason}`);
    audit('collect failed', { listing: listing.id, detail: result.reason });
    return false;
  }
  // Recorded as held before anything else can go wrong. The item has left
  // the seller's bag; if this row is not written the next poll treats the
  // listing as uncollected and takes another one.
  store.activate(listing.id, bot.name, result.slot);

  if (result.slot === null) {
    // The bag may still know: the item is the only one of its kind that is
    // not already spoken for.
    const found = findHeld(bot, listing);
    if (found !== null) {
      store.adoptSlot(listing.id, found);
      log(`[${bot.name}] "${listing.id}" is on sale, held in slot ${found} (found in the bag)`);
      return true;
    }
    // Held, but nobody can say where. Off sale rather than sold and then
    // never delivered; a person sorts it out.
    store.markStuck(listing.id, 'collected without a known slot');
    log(`[${bot.name}] "${listing.id}" is held but its slot is unknown; it is marked stuck`);
    return true;
  }
  log(`[${bot.name}] "${listing.id}" is on sale, held in slot ${result.slot}`);
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
    log(`[${bot.name}] "${listing.id}" cannot be delivered: the held item is not in the bag; marked stuck`);
    return true;
  }

  log(`[${bot.name}] delivering "${listing.id}" to ${listing.buyerCharacter} for ${listing.price}`);
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
    log(`[${bot.name}] shop delivery refused (${result.reason}); trading instead`);
    result = await deliverPurchase(bot.context, listing.buyerCharacter, slot, listing.price);
  }

  if (!result.ok) {
    if (result.reason.startsWith(HELD_ITEM_MISSING)) {
      store.markStuck(listing.id, result.reason);
      log(`[${bot.name}] "${listing.id}": ${result.reason}; marked stuck`);
      return true;
    }
    // Back on sale rather than stuck: the buyer never paid, so nobody is owed
    // anything and somebody else can have it.
    log(`[${bot.name}] could not deliver "${listing.id}": ${result.reason}; back on sale`);
    store.release(listing.id, result.reason);
    return false;
  }
  store.settleSale(listing.id);
  log(`[${bot.name}] "${listing.id}" sold; ${listing.seller} is owed ${listing.price}`);
  return true;
}

/** A cancelled listing nobody ever collected: nothing to return, the row just closes. */
function closeUncollected(listing: store.Listing): void {
  db.query(`UPDATE listings SET state = 'cancelled', updated_at = ? WHERE id = ?`).run(
    Date.now(),
    listing.id
  );
}

/** A seller cancelled: give it back. */
async function giveBack(bot: Bot, listing: store.Listing): Promise<boolean> {
  const slot = await slotFor(bot, listing);
  if (slot === null) {
    store.markStuck(listing.id, 'held item not found in the bag');
    log(`[${bot.name}] "${listing.id}" cannot be returned: the held item is not in the bag; marked stuck`);
    return true;
  }

  log(`[${bot.name}] returning "${listing.id}" to ${listing.sellerCharacter}`);
  const result = await deliverPurchase(bot.context, listing.sellerCharacter, slot, 0);
  if (!result.ok) {
    if (result.reason.startsWith(HELD_ITEM_MISSING)) {
      store.markStuck(listing.id, result.reason);
      return true;
    }
    if (result.declined) {
      // They asked for it back and then would not take it. Back on sale at
      // the same price; cancelling again is one click.
      log(`[${bot.name}] "${listing.id}" back on sale: ${result.reason}`);
      store.backOnSale(listing.id, result.reason);
      return true;
    }
    log(`[${bot.name}] could not return "${listing.id}": ${result.reason}`);
    audit('return failed', { listing: listing.id, detail: result.reason });
    return false;
  }
  closeUncollected(listing);
  return true;
}

/** A seller who pressed Collect. Returns done (whether or not they got paid). */
async function pay(bot: Bot, request: store.PayoutRequest): Promise<boolean> {
  const taken = store.takeBalance(request.account);
  if (taken <= 0) {
    store.clearPayoutRequest(request.account);
    return true;
  }

  log(`[${bot.name}] paying ${request.account} ${taken} Zen via ${request.character}`);
  const result = await payOut(bot.context, request.character, taken);
  if (!result.ok) {
    // Credited back rather than lost: the money never left the bot.
    store.credit(request.account, taken);
    log(`[${bot.name}] could not pay ${request.account} ${taken} Zen: ${result.reason}; credited back`);
    audit('payout failed', { account: request.account, detail: result.reason });
    if (result.declined) {
      // They refused the Zen. The request is done; Collect asks again.
      store.clearPayoutRequest(request.account);
      return true;
    }
    return false;
  }
  store.clearPayoutRequest(request.account);
  audit('payout paid', { account: request.account, detail: { zen: taken } });
  return true;
}

/**
 * The fleet as the scheduler sees it, right now. With an item, each bot also
 * says whether that item would fit in its bag; a bag the server has not
 * listed yet is given the benefit of the doubt.
 */
function runners(item?: store.Item): Runner[] {
  return [...fleet.values()]
    .filter(b => b.connection.connected)
    .map(b => ({
      name: b.name,
      busy: b.busy,
      zen: b.context.wallet?.zen ?? null,
      hasRoom: item && b.bag.known ? b.bag.canHold(item) : true,
    }));
}

/**
 * Runs one job on one bot, and gives everything back afterwards: the leases,
 * the bot, and the record of whether it worked.
 */
async function runJob(
  bot: Bot,
  key: string,
  leases: string[],
  job: () => Promise<boolean>
): Promise<void> {
  let done = false;
  try {
    done = await job();
  } catch (error) {
    log(`[${bot.name}] ${key} failed: ${error instanceof Error ? error.message : error}`);
  } finally {
    store.releaseLeases(leases, bot.name);
    bot.busy = false;
  }

  if (done) backoff.succeeded(key);
  else {
    backoff.failed(key, Date.now());
    log(`${key} will be tried again in ${Math.round(backoff.remaining(key, Date.now()) / 1000)}s`);
  }
}

/**
 * One pass over the work: every job that can go now is handed to a bot and
 * runs on its own; the next pass sees the rest.
 */
async function tick(): Promise<void> {
  const work = store.pendingWork();
  const requests = store.payoutRequests();
  backoff.keepOnly([...work.map(l => l.id), ...requests.map(r => `payout:${r.account}`)]);

  for (const listing of work) {
    const now = Date.now();
    const key = `"${listing.id}"`;
    if (!backoff.due(listing.id, now)) continue;
    // In hand already: this fleet's, or another's on the same rows.
    if (store.leaseHolder(`listing:${listing.id}`) !== null) continue;

    // A cancellation of something never collected needs nobody: the item is
    // still in the seller's bag, and the row just closes.
    if (listing.state === 'returning' && listing.holder === null) {
      closeUncollected(listing);
      continue;
    }

    const pick = pickForListing(runners(listing.item), listing.holder);
    if (!pick.bot) {
      noteWaiting(key, pick.reason);
      continue;
    }
    const bot = fleet.get(pick.bot.name)!;

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
      noteWaiting(key, decision.reason);
      continue;
    }
    if (decision.kind === 'release') {
      log(`releasing ${key}: ${decision.reason}`);
      store.release(listing.id, decision.reason);
      continue;
    }
    if (decision.kind === 'expire') {
      log(`dropping ${key}: ${decision.reason}`);
      store.drop(listing.id, decision.reason);
      continue;
    }

    // The job and its customer are this bot's for the length of the
    // handover: two bots at one player would have the second trade request
    // refused by the server, and a refusal reads as the player saying no.
    const leases = [`listing:${listing.id}`];
    if (character) leases.push(`customer:${character.toLowerCase()}`);
    if (!store.acquireLeases(leases, bot.name, LEASE_MS)) {
      noteWaiting(key, 'its customer is with another bot');
      continue;
    }
    noteWaiting(key, null);
    bot.busy = true;
    void runJob(bot, listing.id, leases, () => {
      if (listing.state === 'pending') return collect(bot, listing);
      if (listing.state === 'claimed') return deliver(bot, listing);
      return giveBack(bot, listing);
    });
  }

  for (const request of requests) {
    const now = Date.now();
    const key = `payout:${request.account}`;
    if (!backoff.due(key, now)) continue;
    if (store.leaseHolder(key) !== null) continue;

    if (now - request.requestedAt > PAYOUT_REQUEST_TTL_MS) {
      store.clearPayoutRequest(request.account);
      audit('payout request dropped', { account: request.account, detail: 'older than a day' });
      continue;
    }
    const owed = store.balance(request.account);
    if (owed <= 0) {
      store.clearPayoutRequest(request.account);
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

    const pick = pickForPayout(runners(), owed);
    if (!pick.bot) {
      noteWaiting(key, pick.reason);
      continue;
    }
    const bot = fleet.get(pick.bot.name)!;

    const leases = [key, `customer:${request.character.toLowerCase()}`];
    if (!store.acquireLeases(leases, bot.name, LEASE_MS)) {
      noteWaiting(key, 'their character is with another bot');
      continue;
    }
    noteWaiting(key, null);
    bot.busy = true;
    void runJob(bot, key, leases, () => pay(bot, request));
  }
}

async function main(): Promise<void> {
  if (!PASSWORD) {
    console.error('MARKETPLACE_BOT_PASSWORD is not set');
    process.exit(1);
  }

  log(`fleet of ${NAMES.length}: ${NAMES.join(', ')} on ${HOST}:${PORT}`);

  if (DATABASE_URL) {
    try {
      // The password is reset on the accounts too: they are the fleet's own,
      // nothing else logs them in, and a bot that cannot log in serves nobody.
      const made = await ensureBotAccounts({
        databaseUrl: DATABASE_URL,
        names: NAMES,
        password: PASSWORD,
        reset: true,
        outfit: OUTFIT,
      });
      if (made.created.length) log(`created bot accounts ${made.created.join(', ')}`);
      if (made.promoted.length) log(`outfitted and made game master: ${made.promoted.join(', ')}`);
    } catch (error) {
      log(`could not provision bot accounts: ${error instanceof Error ? error.message : error}`);
    }
  } else {
    log('DATABASE_URL is not set: bots are not created here; run createAccounts.ts for any that are missing');
  }

  // Said once, because a presence server that cannot be reached makes every
  // dispatch a blind try and one that is reachable decides who gets visited.
  const probe = await presenceOf(NAMES[0]);
  log(
    probe === null
      ? `presence at ${process.env.PRESENCE_URL ?? 'http://127.0.0.1:3001'} is unreachable; dispatching blind`
      : probe.ports === null
        ? 'presence answers, but not which game server a player is on; serving everyone'
        : `presence answers with game servers; this fleet serves port ${PORT}`
  );

  for (const name of NAMES) {
    void runBot(name);
    // One login at a time is kinder to the server than five at once.
    await sleep(2000);
  }

  for (;;) {
    try {
      await tick();
    } catch (error) {
      log(`scheduler error: ${error instanceof Error ? error.message : error}`);
    }
    await sleep(POLL_MS);
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
