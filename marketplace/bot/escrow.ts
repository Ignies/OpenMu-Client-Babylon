import type { Scope } from './scope';
import type { BotSession } from './session';
import type { TradeOutcome, TradeSession } from './trade';

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
 * refusal to agree to anything other than the terms, and the ordering rules
 * that today's live runs turned up.
 */

export type EscrowContext = {
  session: BotSession;
  trade: TradeSession;
  scope: Scope;
  log: (message: string) => void;
};

export type EscrowResult =
  | { ok: true }
  | { ok: false; reason: string };

/** How long a person gets to put their side up before the bot gives up. */
const PARTNER_PATIENCE_MS = 90_000;

/**
 * Brings the bot to the player and opens a trade with them.
 *
 * The warp is only used when it is needed. A warp is a leave-and-re-enter, and
 * warping onto someone already in view drops the bot out of *their* scope
 * without putting it back - which leaves the two one-way visible, and the
 * server refuses a trade whose partner is not among the requester's own
 * observers.
 */
async function openTradeWith(
  context: EscrowContext,
  characterName: string
): Promise<EscrowResult> {
  const { session, trade, scope, log } = context;

  const visible = () => scope.byName(characterName);
  const mutual = () => visible() !== null;

  if (!mutual()) {
    log(`warping to ${characterName}`);
    session.traceTo(characterName);
    for (let waited = 0; waited < 6000 && !mutual(); waited += 500) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  const partner = visible();
  if (!partner) return { ok: false, reason: `${characterName} could not be reached` };

  try {
    await trade.requestWith(partner.id);
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      reason: e instanceof Error ? e.message : `could not open a trade with ${characterName}`,
    };
  }
}

/**
 * Listing: take the seller's item and give nothing back.
 *
 * The bot puts nothing on the table at all, so there is nothing of ours to
 * lose if it falls apart, and the seller's item is only ever moved by the
 * server.
 */
export async function collectListing(
  context: EscrowContext,
  sellerCharacter: string,
  itemCount = 1
): Promise<EscrowResult> {
  const { trade, log } = context;

  const opened = await openTradeWith(context, sellerCharacter);
  if (!opened.ok) return opened;

  try {
    log(`waiting for ${sellerCharacter} to put up ${itemCount} item(s)`);
    await trade.waitForTerms({ expectItems: itemCount, expectMoney: 0 }, PARTNER_PATIENCE_MS);
  } catch (e) {
    trade.cancel();
    return { ok: false, reason: e instanceof Error ? e.message : 'the seller never handed it over' };
  }

  return finish(await trade.settle({ expectItems: itemCount, expectMoney: 0 }), log);
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
export async function deliverPurchase(
  context: EscrowContext,
  buyerCharacter: string,
  inventorySlot: number,
  price: number
): Promise<EscrowResult> {
  const { trade, log } = context;

  const opened = await openTradeWith(context, buyerCharacter);
  if (!opened.ok) return opened;

  trade.offerItem(inventorySlot, 0);
  log(`offered the item to ${buyerCharacter}, waiting for ${price} Zen`);

  try {
    await trade.waitForTerms({ expectMoney: price }, PARTNER_PATIENCE_MS);
  } catch (e) {
    // Nothing of the buyer's is on the table yet, so cancelling here is safe.
    trade.cancel();
    return { ok: false, reason: e instanceof Error ? e.message : 'the buyer never paid' };
  }

  return finish(await trade.settle({ expectMoney: price }), log);
}

/**
 * Paying a seller what their listing earned.
 *
 * The bot's own Zen goes on the table, so this is the one operation where a
 * cancel costs the *service* rather than a player. It is still done by trade
 * rather than by writing to the database, because the seller is online by
 * definition - they are standing here to collect - and a write to a logged-in
 * account is overwritten by their next save.
 */
export async function payOut(
  context: EscrowContext,
  sellerCharacter: string,
  amount: number
): Promise<EscrowResult> {
  const { trade, log } = context;

  const opened = await openTradeWith(context, sellerCharacter);
  if (!opened.ok) return opened;

  trade.setMoney(amount);
  log(`offered ${amount} Zen to ${sellerCharacter}`);

  // The seller has nothing to put up, so there is nothing to wait for.
  return finish(await trade.settle({ expectItems: 0, expectMoney: 0 }), log);
}

function finish(outcome: TradeOutcome, log: (message: string) => void): EscrowResult {
  if (outcome.ok) {
    log('handover complete');
    return { ok: true };
  }
  log(`handover failed: ${outcome.reason}`);
  return { ok: false, reason: outcome.reason };
}
