import type { Bag } from './bag';
import { sameItem, type ListedItem } from './itemMatch';
import type { Scope } from './scope';
import type { ServerMessages } from './serverMessages';
import { FIRST_SHOP_SLOT, type ShopSession } from './shop';
import type { BotSession } from './session';
import type { TradeOutcome, TradeSession, TradeTerms } from './trade';
import type { Wallet } from './wallet';
import type { HandoverKind, Ledger } from './ledger';

/**
 * The three handovers the marketplace is made of, on top of a plain in-game
 * trade.
 *
 * - **collect**: a seller gives the bot an item and gets nothing back. This is
 *   listing.
 * - **deliver**: the bot gives the item and takes the price. This is buying.
 * - **payOut**: the bot gives Zen and takes nothing. This is a seller
 *   collecting what their listing earned.
 *
 * The game server performs every one of them, so an item cannot be duplicated
 * and payment cannot be taken without delivery. What this module adds is the
 * refusal to agree to anything other than the terms, the ordering rules the
 * live runs turned up, and a booked record of whether the money actually moved
 * by what it should have.
 *
 * The bot is not seen between handovers. It stays hidden (a game-master
 * `/hide`), warps to the customer unseen, and only steps into view once it is
 * standing on their tile - wearing whatever skin the worker gave it. When the
 * handover is over, whichever way it went, it hides again.
 */

export type EscrowContext = {
  session: BotSession;
  trade: TradeSession;
  scope: Scope;
  log: (message: string) => void;
  /** The bot's own balance, as the server reports it. */
  wallet?: Wallet;
  ledger?: Ledger;
  /** Which bot this is, for the audit line. */
  botName?: string;
  /** The bot's shop window, when this bot sells through one. */
  shop?: ShopSession;
  /** What the bot is carrying, slot by slot, when it tracks that. */
  bag?: Bag;
  /** What the server says out loud; how "trade partner not found" is heard. */
  messages?: ServerMessages;
  /**
   * Whether the bot hides between handovers and only appears at the
   * customer. On by default; off for a bot that is not a game master.
   */
  stealth?: boolean;
};

/**
 * `declined` on a failure means the bot stood in front of the customer and
 * they refused, cancelled, or never put their side up: the customer's
 * decision, and the worker does not ask them again. Without it the bot could
 * not reach them at all, which is worth another try later.
 */
export type EscrowResult = { ok: true } | { ok: false; reason: string; declined?: boolean };

/** A collect also reports where the server actually put the item. */
export type CollectResult =
  /**
   * The item is ours. `slot` is where the server put it, read from the
   * inventory list it sends after every trade, or null when even that could
   * not say - which is rare, and is reported rather than guessed. Unknown is
   * not failure: the seller has handed the item over either way.
   */
  | { ok: true; slot: number | null }
  | { ok: false; reason: string; declined?: boolean };

/** How long a person gets to put their side up before the bot gives up. */
const PARTNER_PATIENCE_MS = 90_000;

/**
 * How long a person gets to answer the trade request itself. A dialog has
 * to be noticed and clicked; eight seconds was not enough, and asking again
 * while the first request stood was refused in silence.
 */
const REQUEST_PATIENCE_MS = 45_000;

/** The server's blue line when the request's target is not among our observers. */
const NOT_FOUND = /partner not found/i;

/** The balance arrives in its own packet, so it is read a moment after. */
const BALANCE_SETTLE_MS = 1500;

/** The server answers our own offer at once, or it refused it. */
const OWN_ITEM_PATIENCE_MS = 8_000;

/** The inventory list follows the trade result by a packet or two. */
const BAG_SETTLE_MS = 5000;

/**
 * The prefix of the reason given when the service names a slot the bot is
 * not actually holding anything in. The worker treats it differently from a
 * customer who never turned up: the item may be elsewhere in the bag.
 */
export const HELD_ITEM_MISSING = 'nothing is held in bag slot';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/** What `TradeSession.requestWith` throws when the answer was no. */
const REFUSED = 'the trade was refused';

/**
 * Runs a handover and books it.
 *
 * The balance is read from the server before and after and compared against
 * what the handover was supposed to move. A *failed* handover is expected to
 * move nothing and is checked just as strictly - that is precisely where the
 * server's cancel bug destroys Zen, and it is the case a bot carrying a float
 * would otherwise never notice.
 *
 * Whatever happens inside, the bot ends hidden again.
 */
async function booked<T extends EscrowResult>(
  context: EscrowContext,
  kind: HandoverKind,
  partner: string,
  expectedZenDelta: number,
  run: () => Promise<T>
): Promise<T> {
  const { wallet, ledger, botName, log } = context;
  const zenBefore = wallet?.zen ?? null;

  let result: T;
  try {
    result = await run();
  } finally {
    vanish(context);
  }

  if (!ledger) return result;

  if (wallet) await wait(BALANCE_SETTLE_MS);

  if (zenBefore === null) {
    log('no balance was known before this handover, so it could not be reconciled');
  }

  ledger.record({
    bot: botName ?? 'unknown',
    partner,
    kind,
    expectedZenDelta,
    zenBefore,
    zenAfter: wallet?.zen ?? null,
    outcome: result.ok ? 'ok' : 'failed',
    ...(result.ok ? {} : { reason: result.reason }),
  });

  return result;
}

/**
 * Steps into the customer's view.
 *
 * Hide first, then unhide, even when the bot believes it is already hidden:
 * `/unhide` re-spawns the bot on the map, which hands every observer a fresh
 * scope entry, and that announcement is the whole point. A bot that arrived
 * by warp alone is in the customer's scope server side but was never
 * announced to their client - the two are one-way visible, and the server
 * refuses a trade whose partner is not among the requester's observers.
 * Hiding first makes the unhide a real re-spawn rather than a no-op.
 */
async function appear(context: EscrowContext): Promise<void> {
  if (context.stealth === false) return;
  context.session.hide();
  await wait(300);
  context.session.unhide();
  await wait(1200);
}

/** Back out of everybody's view. Sent blind: a hide on a hidden bot is free. */
function vanish(context: EscrowContext): void {
  if (context.stealth === false) return;
  try {
    context.session.hide();
  } catch {
    // The connection is gone; there is nobody left to hide from.
  }
}

/**
 * Gets the bot next to the player, and both of them able to see each other.
 *
 * `/trace` is a map change, which takes the bot out of the world and puts it
 * back without announcing it to anyone. So the warp is followed by an in-map
 * move onto the customer's tile, and then by stepping into view, which is
 * what actually puts the bot on their screen.
 */
async function reach(context: EscrowContext, characterName: string, warp: boolean) {
  const { session, scope, log } = context;
  const them = () => scope.byName(characterName);

  if (warp || them() === null) {
    log(`warping to ${characterName}`);
    try {
      await session.warpTo(characterName);
    } catch {
      log(`the server never moved us, so /trace found nobody called ${characterName}`);
      return null;
    }
    for (let waited = 0; waited < 5000 && them() === null; waited += 500) {
      await wait(500);
    }
  }

  const partner = them();
  if (partner) {
    session.teleportTo(partner.x, partner.y);
    await wait(800);
    await appear(context);
  }

  return them();
}

/**
 * Opens a trade, re-announcing and retrying if the server cannot see us.
 *
 * Whether the customer can see the bot is not knowable from here - only their
 * client holds their own scope - so it is not checked, it is *tried*. A
 * partner the server cannot resolve comes back as "Trade partner not found"
 * on the blue line and nothing else, and the answer to that is to announce
 * again and ask again.
 *
 * A request the server did accept is asked once and waited on for as long
 * as a person needs to notice a dialog. It is never asked again while it
 * stands - the server refuses that in silence - and if it is never answered
 * it is withdrawn, which frees the customer from the "trade requested" state
 * the request put them in. Leaving that state behind was what made every
 * later bot's request time out in silence too.
 */
async function openTradeWith(
  context: EscrowContext,
  characterName: string
): Promise<EscrowResult> {
  const { trade, messages, log } = context;
  let lastReason = `${characterName} could not be reached`;
  let everSeen = false;

  for (let attempt = 1; attempt <= 3; attempt++) {
    const partner = await reach(context, characterName, attempt > 1);
    if (!partner) {
      lastReason = `${characterName} never came into view`;
      log(`attempt ${attempt} of 3: ${lastReason}`);
      continue;
    }
    everSeen = true;

    const said = messages?.count ?? 0;
    const asked = trade.requestWith(partner.id, REQUEST_PATIENCE_MS);
    const outcome: 'opened' | 'refused' | 'unanswered' | 'not found' = await Promise.race([
      asked.then(
        () => 'opened' as const,
        (e: unknown) => (e instanceof Error && e.message === REFUSED ? 'refused' : 'unanswered')
      ),
      notFoundSaid(messages, said, REQUEST_PATIENCE_MS).then(() => 'not found' as const),
    ]);

    if (outcome === 'opened') return { ok: true };
    if (outcome === 'refused') {
      // A "no" is an answer. Asking twice more would be pestering.
      return { ok: false, reason: REFUSED, declined: true };
    }
    if (outcome === 'not found') {
      lastReason = `the server could not find ${characterName} among our observers`;
      log(`trade request ${attempt} did not take (${lastReason})`);
      continue;
    }
    // Unanswered: withdrawn, so they are not left in the requested state.
    trade.abandonRequest();
    return {
      ok: false,
      reason: `${characterName} did not answer the trade request`,
      declined: true,
    };
  }

  if (!everSeen) {
    // The two things that make a warp do nothing, said out loud because neither
    // reports itself: the server answers `/trace` with silence for a character
    // that is not a game master, and it cannot reach across game servers at all
    // - each one runs its own copy of every map, so a bot on one is standing in
    // a different Lorencia to a player on another.
    log(
      `never saw ${characterName} at all: check the bot character is a game master ` +
        `(CharacterStatus 32, not only the account State) and that both are on this ` +
        `game server.`
    );
  }

  // Seen, asked, and not answered or refused: that is the customer's call.
  return { ok: false, reason: lastReason, declined: everSeen };
}

/**
 * Resolves when the server says the partner was not found, after the
 * request went out; never, when it does not. The request itself is what
 * ends the wait otherwise.
 */
async function notFoundSaid(
  messages: ServerMessages | undefined,
  sinceCount: number,
  withinMs: number
): Promise<void> {
  if (!messages) return new Promise(() => {});
  const deadline = Date.now() + withinMs + 1000;
  while (Date.now() < deadline) {
    if (messages.count > sinceCount && messages.latest && NOT_FOUND.test(messages.latest)) return;
    await wait(250);
  }
  return new Promise(() => {});
}

/**
 * Listing: take the seller's item and give nothing back.
 *
 * The bot puts nothing on the table at all, so there is nothing of ours to
 * lose if it falls apart, and the seller's item is only ever moved by the
 * server.
 *
 * `listed` is what the listing says the item is. The bot confirms only the
 * item that matches it - a seller who puts up something else is given the
 * same patience to swap it, and then the listing is dropped rather than
 * filled with the wrong thing. Without this a listing for gloves was
 * fulfilled with boots, and a buyer paid for gloves and got boots.
 */
export function collectListing(
  context: EscrowContext,
  sellerCharacter: string,
  itemCount = 1,
  listed?: ListedItem
): Promise<CollectResult> {
  return booked(context, 'list', sellerCharacter, 0, async () => {
    const { trade, bag, log } = context;

    const opened = await openTradeWith(context, sellerCharacter);
    if (!opened.ok) return opened;

    const terms: TradeTerms = { expectItems: itemCount, expectMoney: 0 };
    if (listed) terms.expectItemMatching = data => sameItem(data, listed);

    try {
      log(`waiting for ${sellerCharacter} to put up ${itemCount} item(s)`);
      await trade.waitForTerms(terms, PARTNER_PATIENCE_MS);
    } catch (e) {
      // An empty table and the wrong item read the same to the deadline;
      // the seller deserves to be told which it was.
      const wrongItem =
        listed !== undefined &&
        trade.theirItems.size > 0 &&
        [...trade.theirItems.values()].some(data => !sameItem(data, listed));
      trade.cancel();
      return {
        ok: false,
        reason: wrongItem
          ? 'put up a different item from the one listed'
          : e instanceof Error
            ? e.message
            : 'the seller never handed it over',
        declined: true,
      };
    }

    // What the seller actually put up, and what the bag looked like before
    // the exchange: both are needed to say where the item landed afterwards.
    const offered = [...trade.theirItems.values()];
    const before = bag?.snapshot() ?? null;
    const bagVersion = bag?.version ?? 0;

    const outcome = finish(await trade.settle(terms), log);
    if (!outcome.ok) return outcome;

    // Past this line the trade has completed and the seller no longer has the
    // item, so there is no failure left to report - only how much we know.
    const slot = await landedSlot(context, before, bagVersion, offered);
    if (slot === null) {
      log('the item is ours but which slot it went to could not be worked out');
    }
    return { ok: true, slot };
  });
}

/**
 * Where a collected item ended up.
 *
 * The server lists the whole inventory after every trade, so the answer is
 * the slot that is occupied now and was not before. When several are (the
 * seller put up more than one), the one holding the bytes the trade showed
 * us wins. The item-appear notice the trade code used to rely on is a
 * fallback only: the server does not send it for traded goods.
 */
async function landedSlot(
  context: EscrowContext,
  before: Set<number> | null,
  bagVersion: number,
  offered: Uint8Array[]
): Promise<number | null> {
  const { bag, trade, log } = context;

  if (bag && before) {
    try {
      await bag.waitForUpdate(bagVersion, BAG_SETTLE_MS);
    } catch {
      log('the server did not list the bag after the trade');
    }
    const arrived = bag.newSince(before);
    if (arrived.length === 1) return arrived[0];
    if (arrived.length > 1) {
      const last = offered.at(-1);
      const matched = last ? bag.slotOf(last) : null;
      if (matched !== null && arrived.includes(matched)) return matched;
      log(`${arrived.length} items arrived (slots ${arrived.join(', ')}); taking the last`);
      return arrived[arrived.length - 1];
    }
    const last = offered.at(-1);
    if (last) {
      const matched = bag.slotOf(last);
      if (matched !== null) return matched;
    }
  }

  return trade.receivedSlots.at(-1) ?? null;
}

/**
 * Refuses to offer from a slot the bag says is empty.
 *
 * The service writes a slot down when it collects; if a human moved the item
 * or a shop stranded it, offering that slot sends a silent no-op and the
 * handover fails for a reason that reads like the customer's fault.
 */
function checkHeld(context: EscrowContext, inventorySlot: number): EscrowResult {
  const { bag } = context;
  if (!bag || !bag.known) return { ok: true };
  if (bag.slots.has(inventorySlot)) return { ok: true };
  return { ok: false, reason: `${HELD_ITEM_MISSING} ${inventorySlot}` };
}

/**
 * Buying: the bot puts the item up, the buyer puts the price up.
 *
 * The order matters and it is not arbitrary. The bot's item goes up first so
 * the buyer can see exactly what they are paying for before any money is
 * committed - and because Zen on a cancelled trade is destroyed by the server
 * (`issues/trade/zen_destroyed_when_a_trade_is_cancelled.md`), the buyer's
 * money must sit on the table for as short a time as possible. Once it is
 * there the bot never cancels: it confirms, or it waits for the server.
 */
export function deliverPurchase(
  context: EscrowContext,
  buyerCharacter: string,
  inventorySlot: number,
  price: number
): Promise<EscrowResult> {
  return booked(context, 'buy', buyerCharacter, price, async () => {
    const { trade, log } = context;

    const held = checkHeld(context, inventorySlot);
    if (!held.ok) return held;

    const opened = await openTradeWith(context, buyerCharacter);
    if (!opened.ok) return opened;

    trade.offerItem(inventorySlot, 0);
    log(`offered the item to ${buyerCharacter}, waiting for ${price} Zen`);

    try {
      await trade.waitForTerms({ expectMoney: price, expectOwnItems: 1 }, PARTNER_PATIENCE_MS);
    } catch (e) {
      // Nothing of the buyer's is on the table yet, so cancelling is safe here.
      trade.cancel();
      return {
        ok: false,
        reason: e instanceof Error ? e.message : 'the buyer never paid',
        declined: true,
      };
    }

    return finish(await trade.settle({ expectMoney: price, expectOwnItems: 1 }), log);
  });
}

/** How long a claimed listing stays open in the shop before it goes back. */
const SHOP_PATIENCE_MS = 180_000;

/** What the shop is called while it is standing next to somebody. */
const SHOP_NAME = 'Marketplace';

/**
 * Buying, done as a shop instead of a trade.
 *
 * The bot stocks the one item the buyer claimed, prices it at the listing
 * price, walks to them and opens. `BuyRequestAction` then moves the item and
 * the Zen in a single server-side step: there is no table to leave empty, no
 * confirm to get wrong, and no cancel to destroy money standing on it. The
 * bot's part is over before the buyer clicks.
 *
 * Somebody other than the claimer can still buy it - a shop sells to whoever
 * asks first - but they pay the same price into the same pocket, so the
 * seller is made whole either way. The server names the buyer, so it is
 * recorded rather than assumed.
 */
export async function deliverViaShop(
  context: EscrowContext,
  buyerCharacter: string,
  inventorySlot: number,
  price: number,
  patienceMs = SHOP_PATIENCE_MS
): Promise<EscrowResult> {
  const { shop } = context;
  if (!shop) return { ok: false, reason: 'this bot has no shop' };

  return booked(context, 'buy', buyerCharacter, price, async () => {
    const { log } = context;
    const shopSlot = FIRST_SHOP_SLOT;

    const held = checkHeld(context, inventorySlot);
    if (!held.ok) return held;

    // Shut first: OpenMU refuses a price change on an open store, and an
    // inherited open shop from a previous run would make every step below
    // fail for a reason that reads like something else.
    shop.close();
    shop.reset();

    try {
      await shop.stockItem(inventorySlot, shopSlot);
      await shop.setPrice(shopSlot, price);
    } catch (e) {
      shop.close();
      return { ok: false, reason: e instanceof Error ? e.message : 'the shop would not take it' };
    }

    // Standing next to them, and in view, before opening: the shop is
    // announced to the buyer as it opens rather than to an empty room.
    const partner = await reach(context, buyerCharacter, false);
    if (!partner) {
      shop.close();
      await putBack(context, shopSlot, inventorySlot);
      return { ok: false, reason: `${buyerCharacter} never came into view` };
    }

    try {
      await shop.openWith(SHOP_NAME);
    } catch (e) {
      shop.close();
      await putBack(context, shopSlot, inventorySlot);
      return { ok: false, reason: e instanceof Error ? e.message : 'the shop would not open' };
    }

    log(`selling to ${buyerCharacter} for ${price} Zen from the shop`);

    try {
      const sale = await shop.waitForSale(shopSlot, patienceMs);
      shop.close();
      if (sale.buyer !== buyerCharacter) {
        log(`${sale.buyer} bought it before ${buyerCharacter} did; the seller is paid either way`);
      }
      return { ok: true };
    } catch (e) {
      shop.close();
      await putBack(context, shopSlot, inventorySlot);
      return {
        ok: false,
        reason: e instanceof Error ? e.message : 'nobody bought it',
        declined: true,
      };
    }
  });
}

/**
 * Returns an unsold item to the bag.
 *
 * Failing this is worse than failing the sale: the item is still the bot's,
 * but the slot the service has written down no longer holds it. So it is
 * logged loudly rather than swallowed, and the listing stays where it is for
 * a human to look at.
 */
async function putBack(
  context: EscrowContext,
  shopSlot: number,
  inventorySlot: number
): Promise<void> {
  try {
    await context.shop?.unstockItem(shopSlot, inventorySlot);
  } catch (e) {
    context.log(
      `could not put the item back in bag slot ${inventorySlot}: ` +
        `${e instanceof Error ? e.message : e}`
    );
  }
}

/**
 * Paying a seller what their listing earned.
 *
 * The bot's own Zen goes on the table, so this is the one operation where a
 * cancel costs the *service* rather than a player - which is why the bot keeps
 * a float and the ledger checks it every time. It is still done by trade
 * rather than by writing to the database, because the seller is online by
 * definition (they are standing here to collect) and a write to a logged-in
 * account is overwritten by their next save.
 */
export function payOut(
  context: EscrowContext,
  sellerCharacter: string,
  amount: number
): Promise<EscrowResult> {
  return booked(context, 'payout', sellerCharacter, -amount, async () => {
    const { trade, log } = context;

    const opened = await openTradeWith(context, sellerCharacter);
    if (!opened.ok) return opened;

    trade.setMoney(amount);
    log(`offered ${amount} Zen to ${sellerCharacter}`);

    // The server says yes to an offer it took and nothing to one it refused,
    // which is what a bot short of Zen gets. Confirming anyway would close a
    // trade with nothing on it and book the seller as paid.
    try {
      await trade.waitForTerms({ expectOwnMoney: amount }, OWN_ITEM_PATIENCE_MS);
    } catch {
      trade.cancel();
      return { ok: false, reason: `the server would not take ${amount} Zen from this bot` };
    }

    // The seller has nothing to put up, so there is nothing more to wait for.
    return finish(
      await trade.settle({ expectItems: 0, expectMoney: 0, expectOwnMoney: amount }),
      log
    );
  });
}

function finish(outcome: TradeOutcome, log: (message: string) => void): EscrowResult {
  if (outcome.ok) {
    log('handover complete');
    return { ok: true };
  }
  log(`handover failed: ${outcome.reason}`);
  // The table was open and the exchange did not go through: whichever side
  // cancelled, the customer was there and it did not happen.
  return { ok: false, reason: outcome.reason, declined: true };
}
