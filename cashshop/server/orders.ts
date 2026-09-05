import { productById, type Product } from './catalog';
import {
  cancel as cancelInStore,
  ordersFor,
  placeOrder,
  spentTodayBy,
  type Order,
  type PlacementView,
} from './db';
import { newSeed, roll, type Roll } from './gacha';
import type { Fulfilment } from './fulfilment';

/**
 * Placement: the rules between the HTTP routes and the order store.
 *
 * `db.ts` knows how to write an order and what this account has already
 * committed; `fulfilment.ts` knows what the account's bag and vault hold in
 * OpenMU's database. Neither knows the catalogue or what makes an order
 * admissible, and that is what lives here: which product, at what price,
 * whether the wallet and the daily cap have room for it, and - for the gacha
 * - the roll itself, made here so that the seed and its outcome go into the
 * order row in the same transaction that creates the row.
 *
 * Every bound here is a courtesy, and the comments say so where it matters.
 * The wallet this reads is the database's copy of the inventory, which is a
 * save behind a player who is online, and it is read before the transaction
 * rather than inside it because it lives in another database. The
 * authoritative check is fulfilment's: it re-reads the wallet under the
 * advisory lock and refuses there, with nothing spent, if the jewels are
 * gone. Placement exists so the window can say no immediately and honestly
 * in the common case, not so fulfilment can trust it.
 */

/**
 * A reason the order was not placed, with the status the route answers. The
 * message is shown to the player as it is - the window has no translation for
 * a reason it cannot predict - so each one says what to do about it.
 */
export class Refusal extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = 'Refusal';
  }
}

/** What GET /api/orders answers: the queue, and what the window needs to explain it. */
export interface OrdersView {
  orders: Order[];
  /**
   * Whether an order placed now would be taken. False when the service
   * cannot see the wallet, which is the one condition under which placement
   * refuses everything.
   */
  acceptingOrders: boolean;
  /** Bag plus vault as the database has them, or null when they cannot be read. */
  wallet: { chaos: number } | null;
  /** productId -> orders placed today that still count against its cap. */
  spentToday: Record<string, number>;
}

/**
 * How many times a roll may miss the game's definitions before placement
 * gives up. The pool and the configuration overlap almost entirely, so one
 * miss is rare and eight in a row means the configuration is not the one the
 * pool was built for, which is worth refusing over rather than looping.
 */
const ROLL_ATTEMPTS = 8;

export class Orders {
  constructor(private readonly fulfilment: Fulfilment) {}

  /**
   * Places an order for `account`, or throws a `Refusal` saying why not.
   *
   * The gacha is rolled here, before the transaction, from a seed nobody has
   * seen: the roll is a pure function of the seed, so it can be made anywhere,
   * and `placeOrder` writes seed and outcome in the statement that creates
   * the order. The player learns the result from the order that comes back,
   * after it is already committed, which is what makes cancelling a gacha
   * pointless and why `db.ts` refuses to.
   */
  async place(account: string, productId: unknown): Promise<Order> {
    const product = typeof productId === 'string' ? productById(productId) : undefined;

    if (!product) throw new Refusal('That item is not for sale.', 404);

    // A wallet the service cannot read is a refusal, not a zero: the
    // difference between "you have no jewels" and "the shop cannot see your
    // jewels" is the difference between a player's fault and ours, and the
    // message has to say which.
    const wallet = await this.fulfilment.wallet(account);

    if (!wallet) throw new Refusal('The shop cannot see your jewels right now. Please try again later.', 503);

    const placed = placeOrder(
      {
        account,
        productId: product.id,
        productName: product.name,
        line: product.line,
        chaos: product.chaos,
        roll: product.line === 'gacha' ? await this.grantableRoll() : null,
      },
      seen => admit(product, wallet.chaos, seen)
    );

    if (!placed.ok) throw new Refusal(placed.reason, 409);

    return placed.order;
  }

  /**
   * A roll the game can actually hand over. The pool is built from the icon
   * pack, the game's items from its own configuration, and the two are not
   * the same list; a roll committed for an item the game does not define
   * would be a paid, revealed prize that delivery has to void. So each roll
   * is checked against the definitions before it is kept, and rolled again
   * on a fresh seed if not - the seed stored is the one that produced the
   * item granted, so replaying it still reproduces the order exactly.
   * Refuses rather than guesses when the definitions cannot be read.
   */
  private async grantableRoll(): Promise<Roll> {
    for (let attempt = 0; attempt < ROLL_ATTEMPTS; attempt++) {
      const candidate = roll(newSeed());
      const grantable = await this.fulfilment.grantable(candidate.group, candidate.num);

      if (grantable === null) {
        throw new Refusal("The shop cannot see the game's items right now. Please try again later.", 503);
      }

      if (grantable) return candidate;

      console.warn(`gacha: ${candidate.group}/${candidate.num} (${candidate.name}) is not in the game configuration; rolling again`);
    }

    throw new Refusal('The shop could not find an item to give you. Please try again later.', 503);
  }

  /**
   * Cancels one of the caller's own queued orders. The store owns the rules
   * (queued only, never a gacha, never someone else's); this only names the
   * status each refusal deserves.
   */
  cancel(account: string, id: unknown): Order {
    if (typeof id !== 'string' || id.length === 0) throw new Refusal('No such order.', 404);

    const cancelled = cancelInStore(id, account);

    if (cancelled.ok) return cancelled.order;

    switch (cancelled.reason) {
      case 'notFound':
        throw new Refusal('No such order.', 404);
      case 'gacha':
        throw new Refusal('A roll cannot be cancelled: its result was decided when it was paid for.', 409);
      case 'notQueued':
        throw new Refusal('That order is no longer waiting, so it cannot be cancelled.', 409);
    }
  }

  /** The delivery tab: newest first, with the wallet and the caps so the window can explain a refusal before making one. */
  async list(account: string): Promise<OrdersView> {
    const wallet = await this.fulfilment.wallet(account);

    return {
      orders: ordersFor(account),
      acceptingOrders: wallet !== null,
      wallet,
      spentToday: spentTodayBy(account),
    };
  }
}

/**
 * The placement bounds, answered inside the store's transaction so two
 * requests from one account cannot both see the same jewels as free.
 *
 * Both are courtesies. The daily cap is counted here and nowhere else, so it
 * is exact; but the wallet is the database's copy, read before the
 * transaction, and fulfilment re-reads it under the lock and is the check
 * that counts. What placement can promise is that a queued order never asks
 * for more than the database showed minus what earlier orders already claim,
 * so a player cannot queue ten wings on one wing's worth of jewels.
 */
function admit(product: Product, chaosInWallet: number, seen: PlacementView): string | null {
  if (seen.spentToday >= product.dailyCap) {
    return product.dailyCap === 1
      ? `${product.name} is limited to one a day. Try again tomorrow.`
      : `${product.name} is limited to ${product.dailyCap} a day, and you have had them. Try again tomorrow.`;
  }

  const free = chaosInWallet - seen.committed;

  if (free < product.chaos) {
    const committed =
      seen.committed > 0 ? ` (${chaosInWallet} in your bag and vault, ${seen.committed} already promised to queued orders)` : '';

    return `Not enough Jewels of Chaos: this costs ${product.chaos} and you have ${Math.max(free, 0)} free${committed}.`;
  }

  return null;
}
