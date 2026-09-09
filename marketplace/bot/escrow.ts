import type { Scope } from './scope';
import type { BotSession } from './session';
import type { TradeOutcome, TradeSession } from './trade';
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
};

export type EscrowResult = { ok: true } | { ok: false; reason: string };

/** How long a person gets to put their side up before the bot gives up. */
const PARTNER_PATIENCE_MS = 90_000;

/** The balance arrives in its own packet, so it is read a moment after. */
const BALANCE_SETTLE_MS = 1500;

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Runs a handover and books it.
 *
 * The balance is read from the server before and after and compared against
 * what the handover was supposed to move. A *failed* handover is expected to
 * move nothing and is checked just as strictly - that is precisely where the
 * server's cancel bug destroys Zen, and it is the case a bot carrying a float
 * would otherwise never notice.
 */
async function booked(
  context: EscrowContext,
  kind: HandoverKind,
  partner: string,
  expectedZenDelta: number,
  run: () => Promise<EscrowResult>
): Promise<EscrowResult> {
  const { wallet, ledger, botName, log } = context;
  const zenBefore = wallet?.zen ?? null;

  const result = await run();

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
 * Brings the bot to the player and opens a trade with them.
 *
 * The warp is only used when it is needed. A warp is a leave-and-re-enter, and
 * warping onto someone already in view drops the bot out of *their* scope
 * without putting it back - which leaves the two one-way visible, and the
 * server refuses a trade whose partner is not among the requester's own
 * observers.
 */
/**
 * Gets the bot next to the player, and both of them able to see each other.
 *
 * Seeing them is not enough. The server resolves a trade partner out of the
 * requester's *own* observers, so the customer has to be able to see the bot
 * too, and a warp on its own does not manage that: `/trace` is a map change,
 * which takes the bot out of the world and puts it back, dropping it from the
 * customer's scope without ever announcing its return.
 *
 * So the warp is followed by an ordinary in-map move onto the customer's tile.
 * That is broadcast to everyone nearby the same way walking is, which is what
 * actually puts the bot on their screen.
 */
async function reach(context: EscrowContext, characterName: string, warp: boolean) {
  const { session, scope, log } = context;
  const them = () => scope.byName(characterName);

  if (warp || them() === null) {
    log(`warping to ${characterName}`);
    session.traceTo(characterName);
    for (let waited = 0; waited < 5000 && them() === null; waited += 500) {
      await wait(500);
    }
  }

  const partner = them();
  if (partner) {
    // Onto their tile by an ordinary in-map move, which is broadcast to
    // everyone nearby. This is the step that puts the bot on their screen;
    // the warp alone does not.
    session.teleportTo(partner.x, partner.y);
    await wait(1500);
  }

  return them();
}

/**
 * Opens a trade, re-announcing and retrying if the server cannot see us.
 *
 * Whether the customer can see the bot is not knowable from here - only their
 * client holds their own scope - so it is not checked, it is *tried*. A
 * partner the server cannot resolve comes back as "Trade partner not found",
 * and the answer to that is to announce again and ask again.
 */
async function openTradeWith(
  context: EscrowContext,
  characterName: string
): Promise<EscrowResult> {
  const { trade, log } = context;
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

    try {
      await trade.requestWith(partner.id, 8000);
      return { ok: true };
    } catch (e) {
      lastReason = e instanceof Error ? e.message : `could not open a trade with ${characterName}`;
      log(`trade request ${attempt} did not take (${lastReason})`);
    }
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

  return { ok: false, reason: lastReason };
}

/**
 * Listing: take the seller's item and give nothing back.
 *
 * The bot puts nothing on the table at all, so there is nothing of ours to
 * lose if it falls apart, and the seller's item is only ever moved by the
 * server.
 */
export function collectListing(
  context: EscrowContext,
  sellerCharacter: string,
  itemCount = 1
): Promise<EscrowResult> {
  return booked(context, 'list', sellerCharacter, 0, async () => {
    const { trade, log } = context;

    const opened = await openTradeWith(context, sellerCharacter);
    if (!opened.ok) return opened;

    const terms = { expectItems: itemCount, expectMoney: 0 };
    try {
      log(`waiting for ${sellerCharacter} to put up ${itemCount} item(s)`);
      await trade.waitForTerms(terms, PARTNER_PATIENCE_MS);
    } catch (e) {
      trade.cancel();
      return {
        ok: false,
        reason: e instanceof Error ? e.message : 'the seller never handed it over',
      };
    }

    return finish(await trade.settle(terms), log);
  });
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

    const opened = await openTradeWith(context, buyerCharacter);
    if (!opened.ok) return opened;

    trade.offerItem(inventorySlot, 0);
    log(`offered the item to ${buyerCharacter}, waiting for ${price} Zen`);

    try {
      await trade.waitForTerms({ expectMoney: price }, PARTNER_PATIENCE_MS);
    } catch (e) {
      // Nothing of the buyer's is on the table yet, so cancelling is safe here.
      trade.cancel();
      return { ok: false, reason: e instanceof Error ? e.message : 'the buyer never paid' };
    }

    return finish(await trade.settle({ expectMoney: price }), log);
  });
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

    // The seller has nothing to put up, so there is nothing to wait for.
    return finish(await trade.settle({ expectItems: 0, expectMoney: 0 }), log);
  });
}

function finish(outcome: TradeOutcome, log: (message: string) => void): EscrowResult {
  if (outcome.ok) {
    log('handover complete');
    return { ok: true };
  }
  log(`handover failed: ${outcome.reason}`);
  return { ok: false, reason: outcome.reason };
}
