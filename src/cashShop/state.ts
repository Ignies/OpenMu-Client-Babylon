import { observable, runInAction } from 'mobx';
import { JEWEL_OF_CHAOS } from '../common/jewelUpgrade';
import { sessionNonce } from '../common/sessionNonce';
import { shopApiUrl } from '../common/serverServices';
import { t } from '../i18n';
import { playSfx, playUiSound } from '../libs/sfx';
import { LocalStorage } from '../libs/localStorage';
import type { Item } from '../ecs/world';
import {
  CALM_BURST_MS,
  FALL_MS,
  OPEN,
  OPEN_CALM,
  PLACE_TIMEOUT_MS,
  REFUSED_MS,
  SEAL,
  SEAL_CALM,
  TIERS,
  TIER_STING,
  type Phase,
  type Tier,
} from './gacha';

export type { Phase, Tier } from './gacha';

/**
 * Cash shop state: the catalogue, which tab is up, who the service thinks we
 * are, the order queue, and the gacha drop.
 *
 * Two wallets are read here and the window shows whichever it can trust more.
 * The count taken straight off `Store.playerData.items` is exact and live: the
 * client holds the inventory the server sent it. But it is only the bag, and
 * the shop spends from the bag *and* the vault at the player's last save,
 * minus whatever earlier orders have already promised. Once the service has
 * confirmed who we are, that second number is the one an order is actually
 * bounded against, so it is the one shown; until then the bag is what there
 * is. Neither is optimistic: nothing here decrements a count locally.
 *
 * Nothing here spends anything either. Every order is placed by the service,
 * against the ticket it minted for this page's game socket, and the order it
 * answers with is the truth about what was bought.
 *
 * A gacha roll is the one thing that answer withholds. It is drawn and
 * committed when the order is placed, but the jewels for it are not taken
 * until the account is offline and the delivery runs, so the service seals it
 * until then (`cashshop/server/orders.ts`) and this module never sees it
 * early. That splits the drop in two: `rollGacha` runs the tier-blind half
 * that ends with the box locked, and `openSealed` runs the reveal at the
 * next login, once the roll is paid for and the service is willing to say
 * what it was.
 *
 * This module owns the clock both halves run on, so the sounds play from here
 * and never for an order the service refused.
 */

export type ProductLine = 'wings' | 'quest' | 'gacha';

export interface Product {
  id: string;
  line: ProductLine;
  name: string;
  group: number | null;
  number: number | null;
  level: number;
  width: number;
  height: number;
  /** Jewels of Chaos (12/15), the shop's one currency. */
  chaos: number;
  dailyCap: number;
  note?: string;
}

export interface Line {
  id: ProductLine;
  label: string;
}

export interface Roll {
  seed: number;
  group: number;
  num: number;
  name: string;
  slot: string;
  width: number;
  height: number;
  level: number;
  tier: Tier;
  /** Decided by the tier; a plain piece carries no options. */
  excellent: boolean;
  options: string[];
}

export type OrderState = 'queued' | 'delivering' | 'delivered' | 'failed' | 'cancelled';

export interface Order {
  id: string;
  productId: string;
  productName: string;
  line: ProductLine;
  chaos: number;
  state: OrderState;
  reason: string | null;
  roll: Roll | null;
  placedAt: number;
  updatedAt: number;
}

/** What GET /api/orders answers. */
interface OrdersView {
  orders: Order[];
  acceptingOrders: boolean;
  wallet: { chaos: number } | null;
  spentToday: Record<string, number>;
}

/** The service's word for who we are: "<account>.<expiresAt>.<mac>", opaque here. */
interface Ticket {
  ticket: string;
  account: string;
  expiresAt: number;
}

type Loading = 'idle' | 'loading' | 'ready' | 'failed';

export const CashShopState = observable({
  windowOpen: false,
  tab: 'wings' as ProductLine,
  catalogue: [] as Product[],
  lines: [] as Line[],
  status: 'idle' as Loading,
  error: null as string | null,

  /** Who the service confirmed we are, or null while it has not. */
  account: null as string | null,
  /**
   * Why it could not, when it could not. Not an error: a player whose game
   * socket the shop cannot see is in a state the window explains, not a
   * fault it reports.
   */
  unconfirmed: null as string | null,

  /** The queue, newest first, and what the service said about taking more. */
  orders: [] as Order[],
  acceptingOrders: false,
  /** Bag plus vault as the database last saw them, or null until the service can say. */
  wallet: null as { chaos: number } | null,
  /** productId -> orders placed today that count against its cap. */
  spentToday: {} as Record<string, number>,
  ordersError: null as string | null,

  /** The product whose order is out, while it is. */
  buying: null as string | null,
  /** The service's reason for the last refusal, in its own words. */
  buyError: null as string | null,

  /**
   * The drop. `roll` is null for the whole sealed half - the service does not
   * send it - and is set by `openSealed`, which shows it from the burst.
   */
  phase: 'idle' as Phase,
  roll: null as Roll | null,
  order: null as Order | null,
  /**
   * Delivered rolls this browser has not played the opening for yet, oldest
   * first. Filled by the queue read; emptied one ceremony at a time.
   */
  unopened: [] as Order[],
  /** The stage's own line, drawn in red while the stage is idle. */
  rollError: null as string | null,
  /** Bumped per knock from inside the box; the lid keys its animation on it. */
  knock: 0,
  /** `prefers-reduced-motion`, read once per roll. */
  calm: false,
});

/* ---------------------------------------------------------------- opened */

/**
 * The order ids whose opening this browser has already played.
 *
 * Local on purpose, and the one piece of shop state that is. The item is in
 * the bag either way - the ceremony is the only thing at stake - so this is
 * a convenience, not a record, and it is not worth a column in the service's
 * database or a route to write it with. What it costs is that a player who
 * logs in somewhere else sees the opening a second time, which is a better
 * failure than never seeing it at all.
 */
const OPENED_KEY = 'mu_cashshop_opened';

/** Ids kept before the oldest are dropped. Comfortably more than the daily cap. */
const OPENED_KEEP = 200;

function openedIds(): ReadonlySet<string> {
  const raw = LocalStorage.load(OPENED_KEY);

  if (!raw) return new Set();

  try {
    const stored: unknown = JSON.parse(raw);

    return new Set(Array.isArray(stored) ? stored.filter((id): id is string => typeof id === 'string') : []);
  } catch {
    return new Set();
  }
}

function markOpened(id: string): void {
  LocalStorage.save(OPENED_KEY, JSON.stringify([...openedIds(), id].slice(-OPENED_KEEP)));

  runInAction(() => {
    CashShopState.unopened = CashShopState.unopened.filter(order => order.id !== id);
  });
}

/* ------------------------------------------------------------------- http */

/** An answer the service gave on purpose: its message is the player's to read. */
class ShopError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = 'ShopError';
  }
}

/** The service could not say who we are. A state, not a fault (see `unconfirmed`). */
class Unconfirmed extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'Unconfirmed';
  }
}

/**
 * Whether the service actually spoke: a refusal in its own words, or the
 * session exchange failing before anything was sent. Everything else - the
 * socket dropping, the placement ceiling in `rollGacha` - is silence, and
 * silence after a POST is not "no": the service writes the order before its
 * answer travels, so the order may well be in the queue. A spend that met
 * silence asks the queue (`landed`) before it tells the player anything.
 */
function answered(error: unknown): boolean {
  return error instanceof ShopError || error instanceof Unconfirmed;
}

/**
 * What the window is told of an answer. The service writes its refusals for
 * the player and they are shown as they are; anything else - a socket that
 * never connected, a body that was not JSON - is the shop being unreachable,
 * in the player's language rather than the browser's.
 */
function message(error: unknown): string {
  if (error instanceof ShopError || error instanceof Unconfirmed) return error.message;

  return t('cashShop.unreachable');
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  // Read per call, not once at load: which world is being played decides whose
  // shop this is, and that is not known when this module is first evaluated.
  const response = await fetch(`${shopApiUrl()}${path}`, {
    // Nothing here is cookie-authenticated, and asking for credentials on a
    // cross-origin call would only add a CORS requirement for no gain. The
    // ticket rides in the body or the query string for the same reason: the
    // preflight allows no header but Content-Type.
    credentials: 'omit',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ShopError((body as { error?: string }).error ?? `HTTP ${response.status}`, response.status);
  }

  return body as T;
}

/* ----------------------------------------------------------------- ticket */

let held: Ticket | null = null;

/** A ticket this close to expiring is exchanged before it is used, not after it fails. */
const TICKET_MARGIN_MS = 30_000;

/**
 * The ticket: the nonce this page put on its game socket's URL, exchanged
 * through the service for a signed name. Held in a module variable rather
 * than the state: nothing draws it, and an observable copy of a credential
 * is one more place it lives.
 */
async function ensureTicket(fresh = false, signal?: AbortSignal): Promise<Ticket> {
  if (!fresh && held && held.expiresAt - Date.now() > TICKET_MARGIN_MS) return held;

  try {
    held = await request<Ticket>('/session', {
      method: 'POST',
      body: JSON.stringify({ session: sessionNonce() }),
      signal,
    });
  } catch (error) {
    held = null;

    // The caller gave up, not the service: leave the identity as it was.
    if (signal?.aborted) throw error;

    // 403 is "the proxy has no login on that socket": the service's own
    // sentence says so. Anything unreachable gets the shop's plain one.
    const reason = error instanceof ShopError ? error.message : t('cashShop.unconfirmed');

    runInAction(() => {
      CashShopState.account = null;
      CashShopState.unconfirmed = reason;
    });

    throw new Unconfirmed(reason);
  }

  const { account } = held;

  runInAction(() => {
    CashShopState.account = account;
    CashShopState.unconfirmed = null;
  });

  return held;
}

/**
 * A request that carries the ticket: in the query for a GET, in the body for
 * a POST. One 401 means the ticket went stale between the check above and
 * the service's clock, and is cured by exchanging once and trying again; a
 * second one is refused like any other answer.
 *
 * A POST is a spend - an order placed or cancelled - so it carries the
 * session nonce beside the ticket. The ticket says who this page was; the
 * nonce lets the service ask the proxy whether that socket is still logged
 * in as them right now, which a ticket lifted from somewhere cannot answer.
 */
async function ticketed<T>(
  path: string,
  method: 'GET' | 'POST',
  body: Record<string, unknown> = {},
  signal?: AbortSignal
): Promise<T> {
  let ticket = await ensureTicket(false, signal);

  for (let attempt = 0; ; attempt++) {
    try {
      if (method === 'GET') {
        return await request<T>(`${path}?ticket=${encodeURIComponent(ticket.ticket)}`, { signal });
      }

      return await request<T>(path, {
        method,
        body: JSON.stringify({ ...body, ticket: ticket.ticket, session: sessionNonce() }),
        signal,
      });
    } catch (error) {
      if (attempt === 0 && error instanceof ShopError && error.status === 401) {
        ticket = await ensureTicket(true, signal);
        continue;
      }

      throw error;
    }
  }
}

/* -------------------------------------------------------------- catalogue */

/** Loads the catalogue once. Safe to call on every open. */
export async function ensureCatalogue(): Promise<void> {
  if (CashShopState.status === 'loading' || CashShopState.status === 'ready') return;

  runInAction(() => {
    CashShopState.status = 'loading';
    CashShopState.error = null;
  });

  try {
    const answer = await request<{ lines: Line[]; products: Product[] }>('/catalog');

    runInAction(() => {
      CashShopState.lines = answer.lines;
      CashShopState.catalogue = answer.products;
      CashShopState.status = 'ready';
    });
  } catch (error) {
    runInAction(() => {
      CashShopState.status = 'failed';
      CashShopState.error = message(error);
    });
  }
}

/* ----------------------------------------------------------------- orders */

/**
 * Re-read while the window is open. Delivery happens at logout, so what this
 * mostly catches is the wallet moving under an order that was placed on
 * another device, and a queue the operator settled by hand; it does not
 * need to be quick.
 */
const ORDERS_POLL_MS = 30_000;

let ordersInFlight: Promise<void> | null = null;

/**
 * The queue, the wallet and today's counts, from the service. Called on open,
 * after every order and cancellation, when the drop settles, and on the poll.
 * Concurrent calls share one request: the answer is the same either way.
 */
export function refreshOrders(): Promise<void> {
  if (!ordersInFlight) {
    ordersInFlight = readOrders().finally(() => {
      ordersInFlight = null;
    });
  }

  return ordersInFlight;
}

async function readOrders(): Promise<void> {
  let view: OrdersView;

  try {
    view = await ticketed<OrdersView>('/orders', 'GET');
  } catch (error) {
    runInAction(() => {
      if (error instanceof Unconfirmed) {
        // Nothing to show and nothing wrong: `unconfirmed` carries the why.
        CashShopState.orders = [];
        CashShopState.acceptingOrders = false;
        CashShopState.wallet = null;
        CashShopState.spentToday = {};
        CashShopState.ordersError = null;
      } else {
        CashShopState.ordersError = message(error);
      }
    });

    return;
  }

  // The one sound that does not come from the drop's clock: the item is in
  // the bag only when the service says so, which with fulfilment rehearsing
  // is never, and the shop must not claim a delivery it has not made. Only a
  // transition counts - an order that was already delivered when the window
  // first read it is old news.
  const before = new Map(CashShopState.orders.map(order => [order.id, order.state]));
  const justDelivered = view.orders.some(order => {
    const was = before.get(order.id);

    // A gacha's arrival is announced by its own opening, which has a whole
    // score of its own; two sounds for one delivery is one too many.
    return order.line !== 'gacha' && order.state === 'delivered' && was !== undefined && was !== 'delivered';
  });

  // A roll is only ever sent once it is delivered, so anything here with a
  // roll on it has been paid for and is the player's to see.
  const opened = openedIds();
  const unopened = view.orders
    .filter(order => order.line === 'gacha' && order.state === 'delivered' && order.roll && !opened.has(order.id))
    .reverse();

  runInAction(() => {
    CashShopState.orders = view.orders;
    CashShopState.unopened = unopened;
    CashShopState.acceptingOrders = view.acceptingOrders;
    CashShopState.wallet = view.wallet;
    CashShopState.spentToday = view.spentToday;
    CashShopState.ordersError = null;

    // The settled stage's status line follows the same order as the queue.
    const shown = CashShopState.order;
    if (shown) CashShopState.order = view.orders.find(order => order.id === shown.id) ?? shown;
  });

  if (justDelivered) playUiSound('getItem');
}

/** Places one order. The service's answer is the order; its refusal is the reason. */
async function placeOrder(productId: string, signal?: AbortSignal): Promise<Order> {
  const { order } = await ticketed<{ order: Order }>('/orders', 'POST', { productId }, signal);

  return order;
}

/** The ids the queue held before a press, so what it gains afterwards can be told apart. */
const knownOrders = (): ReadonlySet<string> => new Set(CashShopState.orders.map(order => order.id));

/**
 * The order a press placed when its answer never came: after `refreshOrders`,
 * the one for that product the queue did not hold before the press. Null
 * when nothing landed - or has not landed yet; a write the service is still
 * slow to finish shows up on the poll, in the Orders tab.
 */
function landed(before: ReadonlySet<string>, productId: string): Order | null {
  return CashShopState.orders.find(order => order.productId === productId && !before.has(order.id)) ?? null;
}

/**
 * Buys a fixed product. The window has already asked the player to confirm;
 * this is the placement, and it resolves to whether the service took it. On
 * success the queue is re-read so the wallet and today's counts move with
 * it; on refusal the service's sentence lands in `buyError` as it is.
 */
export async function buy(productId: string): Promise<boolean> {
  if (CashShopState.buying) return false;

  const before = knownOrders();

  runInAction(() => {
    CashShopState.buying = productId;
    CashShopState.buyError = null;
  });

  let order: Order;

  try {
    order = await placeOrder(productId);
  } catch (error) {
    if (!answered(error)) {
      await refreshOrders();
      const found = landed(before, productId);

      runInAction(() => {
        CashShopState.buying = null;
        CashShopState.buyError = found ? null : t('cashShop.noAnswer');
      });
      playUiSound(found ? 'coin' : 'error');

      return found !== null;
    }

    runInAction(() => {
      CashShopState.buying = null;
      CashShopState.buyError = message(error);
    });
    playUiSound('error');

    return false;
  }

  runInAction(() => {
    CashShopState.orders = [order, ...CashShopState.orders];
    CashShopState.buying = null;
  });

  // The jewels are promised on the frame the order is committed.
  playUiSound('coin');
  await refreshOrders();

  return true;
}

/** Takes back a queued order. The service decides what may be (never a roll). */
export async function cancelOrder(id: string): Promise<boolean> {
  try {
    const { order } = await ticketed<{ order: Order }>('/orders/cancel', 'POST', { id });

    runInAction(() => {
      CashShopState.orders = CashShopState.orders.map(known => (known.id === order.id ? order : known));
      CashShopState.buyError = null;
    });
    await refreshOrders();

    return true;
  } catch (error) {
    if (!answered(error)) {
      await refreshOrders();
      if (CashShopState.orders.some(known => known.id === id && known.state === 'cancelled')) return true;
    }

    runInAction(() => {
      CashShopState.buyError = answered(error) ? message(error) : t('cashShop.noAnswer');
    });
    playUiSound('error');

    return false;
  }
}

/* ----------------------------------------------------------------- window */

let poll: ReturnType<typeof setInterval> | null = null;

export function toggleCashShopWindow(open?: boolean): void {
  runInAction(() => {
    CashShopState.windowOpen = open ?? !CashShopState.windowOpen;
  });

  if (CashShopState.windowOpen) {
    void ensureCatalogue();
    void refreshOrders().then(openOnSight);

    if (!poll) poll = setInterval(() => void refreshOrders(), ORDERS_POLL_MS);
  } else {
    abandonRoll();

    if (poll) {
      clearInterval(poll);
      poll = null;
    }
  }
}

/** Switches tab. Leaving the gacha mid-drop abandons it: the order is already the service's. */
export function setCashShopTab(tab: ProductLine): void {
  if (tab === CashShopState.tab) return;

  if (CashShopState.tab === 'gacha') abandonRoll();

  runInAction(() => {
    CashShopState.tab = tab;
    CashShopState.buyError = null;
  });

  if (tab === 'gacha') openSealed();
}

/**
 * Once per window open: a roll that arrived while the player was away is the
 * best reason the window has to be looked at, so the gacha tab is what opens.
 * Only here, never on the poll - a tab pulled out from under someone
 * mid-purchase would be a bug, however good the news.
 */
function openOnSight(): void {
  if (!CashShopState.windowOpen || CashShopState.unopened.length === 0) return;

  runInAction(() => {
    CashShopState.tab = 'gacha';
  });

  openSealed();
}

/* ------------------------------------------------------------------ gacha */

/**
 * The drop, run from here because this module is the only clock. Every beat
 * is a timer from `SEAL` / `OPEN` (or their calm tables), held in `timers`
 * so closing the window can clear them all: no sound may fire at a stage
 * nobody is looking at.
 *
 * `attempt` names the press each timer belongs to. A press, an abandon and a
 * refusal each bump it, so a request that answers after the window closed
 * still records its order - the service has committed it - but plays
 * nothing and runs no theatre.
 */
let timers: ReturnType<typeof setTimeout>[] = [];
let attempt = 0;

function cancelTimeline(): void {
  for (const timer of timers) clearTimeout(timer);
  timers = [];
}

/** Read per roll rather than at load: the OS setting can change mid-session. */
const calmDown = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function setPhase(phase: Phase): void {
  runInAction(() => {
    CashShopState.phase = phase;
  });
}

function knock(): void {
  runInAction(() => {
    CashShopState.knock++;
  });
}

/** Phases a new press is taken from. */
const ARMED: ReadonlySet<Phase> = new Set<Phase>(['idle', 'sealed', 'prize', 'settled']);

/** Whether the Roll button should take a press right now. */
export function canRoll(): boolean {
  return ARMED.has(CashShopState.phase) && CashShopState.catalogue.some(product => product.line === 'gacha');
}

/**
 * Closing the window, leaving the tab, or re-rolling from `prize` onward. The
 * order is already committed server-side, so a reopened stage shows the
 * settled reveal rather than replaying the ceremony.
 */
export function abandonRoll(): void {
  cancelTimeline();
  attempt++;

  runInAction(() => {
    CashShopState.phase = CashShopState.roll ? 'settled' : 'idle';
  });
}

/**
 * A paid roll, up to the lock. The press mounts the box and sends the order
 * together; the fall and the request are awaited as one, so a fast answer
 * still gets the full drop and a slow one leaves the box hanging over the
 * floor rather than desynchronising it. Everything after the landing is
 * fixed-length theatre.
 *
 * What it is not is a reveal. The order that comes back carries no roll - the
 * service seals it until the jewels have been taken - so there is nothing
 * here to leak, and nothing in this half may be drawn from the outcome. The
 * box locks, and `openSealed` finishes the story at the next login.
 */
export async function rollGacha(): Promise<void> {
  if (!ARMED.has(CashShopState.phase)) return;

  const product = CashShopState.catalogue.find(entry => entry.line === 'gacha');
  if (!product) return;

  cancelTimeline();
  const mine = ++attempt;
  const before = knownOrders();
  const calm = calmDown();
  const at = (ms: number, run: () => void): void => {
    if (ms < 0) return;
    timers.push(
      setTimeout(() => {
        if (attempt === mine) run();
      }, ms)
    );
  };

  runInAction(() => {
    CashShopState.phase = 'falling';
    CashShopState.roll = null;
    CashShopState.order = null;
    CashShopState.rollError = null;
    CashShopState.calm = calm;
  });

  const S = calm ? SEAL_CALM : SEAL;
  const control = new AbortController();
  const ceiling = setTimeout(() => control.abort(), PLACE_TIMEOUT_MS);
  const placed = placeOrder(product.id, control.signal);
  const fell = new Promise<void>(resolve => setTimeout(resolve, calm ? 0 : FALL_MS));

  let order: Order;

  try {
    [order] = await Promise.all([placed, fell]);
  } catch (error) {
    if (answered(error)) {
      // Refused: no coin, the jewel never left. The box is yanked back up and
      // the stage goes idle with the reason where the hint was.
      if (attempt !== mine) return;

      runInAction(() => {
        CashShopState.phase = 'refused';
        CashShopState.rollError = message(error);
      });
      playUiSound('error');
      at(REFUSED_MS, () => setPhase('idle'));

      return;
    }

    // Silence (see `answered`): the roll may be committed on the far side of
    // it. The box is yanked and the stage says the shop did not answer, and
    // Roll stays down until the queue has been asked - a player told "no"
    // by a shop that in fact said "yes" would pay for a second box. A roll
    // that did land settles the stage rather than replaying the drop: the
    // ceremony belongs to the frame the answer arrived on, and none did.
    if (attempt === mine) {
      runInAction(() => {
        CashShopState.phase = 'refused';
        CashShopState.rollError = t('cashShop.noAnswer');
      });
      playUiSound('error');
    }

    await refreshOrders();
    if (attempt !== mine) return;

    const found = landed(before, product.id);

    if (found) {
      runInAction(() => {
        CashShopState.order = found;
        CashShopState.phase = 'sealed';
        CashShopState.rollError = null;
      });
    } else {
      at(REFUSED_MS, () => setPhase('idle'));
    }

    return;
  } finally {
    clearTimeout(ceiling);
  }

  if (attempt !== mine) {
    // Committed while nobody was watching. Keep the order - the service has
    // it either way - and play nothing.
    runInAction(() => {
      CashShopState.orders = [order, ...CashShopState.orders];
    });

    return;
  }

  // Landed. The queue gains the order now, so the wallet bar's committed sum
  // drops on this frame and never before.
  runInAction(() => {
    CashShopState.order = order;
    CashShopState.phase = 'landed';
    CashShopState.orders = [order, ...CashShopState.orders];
  });
  playUiSound('dropItem');

  at(S.feed, () => playUiSound('coin'));
  at(S.fed, () => {
    setPhase('rattling');
    playUiSound('gemstone');
  });
  // Quieter than the thud it echoes; only `playSfx` takes a gain.
  at(S.knockA, () => {
    knock();
    playSfx('Sound/pDropItem', null, 0.45);
  });
  at(S.knockB, () => {
    knock();
    playSfx('Sound/pDropItem', null, 0.45);
  });
  // The clasp. The box is the same box whatever is in it, so this is the last
  // thing the player is told until it is paid for.
  at(S.shut, () => {
    setPhase('sealing');
    playUiSound('repair');
  });
  at(S.sealed, () => {
    setPhase('sealed');
    void refreshOrders();
  });
}

/**
 * The other half: a roll that has been delivered, opened at last.
 *
 * By the time this runs the jewels are gone and the item is in the bag - the
 * service only sends a roll once its order is `delivered` - so there is
 * nothing left to shop for and the whole tier can be spent on the reveal.
 * The box comes back sealed, cracks in the tier's colour, slams shut on the
 * Chaos Machine's failure chime, and bursts after a silence whose length is
 * the tier.
 */
export function openSealed(): void {
  if (!CashShopState.windowOpen || CashShopState.tab !== 'gacha') return;
  if (!ARMED.has(CashShopState.phase)) return;

  const order = CashShopState.unopened[0];
  const roll = order?.roll;

  if (!order || !roll) return;

  cancelTimeline();
  const mine = ++attempt;
  const calm = calmDown();
  const O = calm ? OPEN_CALM : OPEN;
  const look = TIERS[roll.tier];
  const at = (ms: number, run: () => void): void => {
    if (ms < 0) return;
    timers.push(
      setTimeout(() => {
        if (attempt === mine) run();
      }, ms)
    );
  };

  // Marked before a frame of it plays. A poll landing mid-ceremony must not
  // queue the same box again, and a reveal the player walked out on is still
  // a reveal they were given - replaying it on every window open would be
  // worse than missing it once.
  markOpened(order.id);

  runInAction(() => {
    CashShopState.order = order;
    CashShopState.roll = roll;
    CashShopState.phase = 'sealed';
    CashShopState.rollError = null;
    CashShopState.calm = calm;
  });
  playUiSound('dropItem');

  at(O.seam, () => {
    setPhase('seam');
    playUiSound('window');
  });
  if (look.announce) {
    const announce = look.announce;
    at(O.announce, () => playUiSound(announce));
  }
  at(O.strain, () => setPhase('strain'));
  at(O.slam, () => {
    setPhase('slam');
    playUiSound('mixFailed');
  });
  at(O.hush, () => setPhase('hush'));

  const burst = calm ? O.seam + CALM_BURST_MS : O.hush + look.hold;

  at(burst, () => {
    setPhase('burst');
    playUiSound('win');
  });
  for (const sting of TIER_STING[roll.tier]) {
    at(burst + sting.at, () => playUiSound(sting.key));
  }
  // The Roll button re-arms here: a player can pay for the next box the
  // instant they have seen what this one held.
  at(burst + O.afterPrize, () => setPhase('prize'));
  if (!calm) {
    roll.options.forEach((_, index) =>
      at(burst + O.afterOption + index * O.optionStep, () => playSfx('Sound/iButtonMove', null, 0.3))
    );
  }
  // Straight on to the next, if more than one arrived while they were away.
  at(burst + O.afterSettle, () => {
    setPhase('settled');
    openSealed();
  });
}

/* ----------------------------------------------------------------- wallet */

/**
 * Jewels of Chaos the player is carrying right now.
 *
 * Inventory only: the vault is not loaded into the client unless it is open,
 * so counting it here would show zero for anyone who banks their jewels, which
 * is worse than saying plainly that this is what is on the character.
 */
export function walletOnHand(items: readonly (Item | null)[]): number {
  let count = 0;

  for (const item of items) {
    if (item && item.group === JEWEL_OF_CHAOS.group && item.num === JEWEL_OF_CHAOS.num) count++;
  }

  return count;
}

/** Jewels already promised to orders that have not been delivered or dropped. */
export function committedChaos(orders: readonly Order[] = CashShopState.orders): number {
  let sum = 0;

  for (const order of orders) {
    if (order.state === 'queued' || order.state === 'delivering') sum += order.chaos;
  }

  return sum;
}

/**
 * What the next order can spend: the service's wallet minus what the queue
 * has promised once it has confirmed who we are, else the bag. Never below
 * zero on screen - a wallet that shrank under its queue is the service's
 * problem to refuse, not a negative number for the player to read.
 */
export function chaosToSpend(items: readonly (Item | null)[]): number {
  const { wallet } = CashShopState;

  if (wallet) return Math.max(wallet.chaos - committedChaos(), 0);

  return walletOnHand(items);
}

/**
 * Why the window should grey a product out, or null when it should not.
 *
 * Advice, not a verdict: the service bounds every order against its own
 * wallet and today's counts, and its refusal - in its own words - is what the
 * player sees when this and the service disagree. The four reasons are
 * checked in the order the player can fix them.
 */
export function blockedReason(product: Product, items: readonly (Item | null)[]): string | null {
  const { account, unconfirmed, acceptingOrders, spentToday } = CashShopState;

  if (!account) return unconfirmed ?? t('cashShop.unconfirmed');
  if (!acceptingOrders) return t('cashShop.notAccepting');
  if ((spentToday[product.id] ?? 0) >= product.dailyCap) return t('cashShop.dailyCapReached');
  if (chaosToSpend(items) < product.chaos) return t('cashShop.notEnoughChaos');

  return null;
}
