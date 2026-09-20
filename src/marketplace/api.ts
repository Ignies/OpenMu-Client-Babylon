import { sessionNonce } from '../common/sessionNonce';
import { marketApiUrl } from '../common/serverServices';
import type { Item } from '../ecs/world';

/**
 * The window's side of the marketplace service.
 *
 * Nothing here sends an account name. The service works out who is calling
 * from a ticket it minted for whoever the proxy saw log in on this page's
 * game socket, so the only credential the window holds is the nonce already
 * on that socket's URL. A window that asked "list this as Bob" would be
 * ignored, which is the point.
 *
 * Every commit (list, buy, cancel, collect) is three steps: the service
 * answers with a signed token, the window relays it to the game server
 * (`gameBridge.ts`), and then tells the service to settle by reading the
 * game database. The service never moves an item or a Zen itself.
 */

export type ListingState =
  | 'pending'
  | 'active'
  | 'claimed'
  | 'sold'
  | 'paid'
  | 'returning'
  | 'cancelled';

export type ApiListing = {
  id: string;
  seller: string;
  price: number;
  item: Item;
  category: string;
  state: ListingState;
  buyer: string | null;
  listedAt: number;
  /** Zen waiting for the seller, on a sold row; null once paid. */
  proceeds?: number | null;
};

/** A signed escrow token, lowercase hex, for `gameBridge.sendEscrow`. */
export type Token = string;

export class MarketError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** The service is telling us to get a new ticket and try again. */
    readonly retry = false
  ) {
    super(message);
  }
}


async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${marketApiUrl()}${path}`, {
    // Nothing is cookie-authenticated, and the preflight allows no header but
    // Content-Type, so the ticket rides in the body or the query string.
    credentials: 'omit',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

  const body = (await response.json().catch(() => ({}))) as { error?: string; retry?: boolean };

  if (!response.ok) {
    throw new MarketError(body.error ?? `HTTP ${response.status}`, response.status, body.retry);
  }
  return body as T;
}

type Ticket = { ticket: string; account: string };

let held: Ticket | null = null;
let heldAt = 0;

/** Re-exchanged before it can fail rather than after. */
const TICKET_LIFE_MS = 9 * 60 * 1000;

/**
 * Held in a module variable rather than in the observable state: nothing
 * draws it, and an observable copy of a credential is one more place it lives.
 */
async function ticket(fresh = false): Promise<Ticket> {
  if (!fresh && held && Date.now() - heldAt < TICKET_LIFE_MS) return held;

  held = await request<Ticket>('/session', {
    method: 'POST',
    body: JSON.stringify({ session: sessionNonce() }),
  });
  heldAt = Date.now();
  return held;
}

/** Who the service says we are, or null when it will not vouch for us. */
export async function whoAmI(): Promise<string | null> {
  try {
    return (await ticket()).account;
  } catch {
    return null;
  }
}

/** Runs a call, exchanging the ticket once if the service says it is stale. */
async function withTicket<T>(run: (t: Ticket) => Promise<T>): Promise<T> {
  try {
    return await run(await ticket());
  } catch (error) {
    if (error instanceof MarketError && error.status === 401) {
      return run(await ticket(true));
    }
    throw error;
  }
}

/**
 * A commit body.
 *
 * The nonce rides on every one of these, not only on the exchange. A ticket
 * outlives the socket it was minted for, so the service asks the proxy again
 * before it signs an escrow token; a body without the nonce is refused as a
 * session it cannot recognise, however fresh the ticket is.
 */
function post<T>(path: string, body: Record<string, unknown>) {
  return withTicket(t =>
    request<T>(path, {
      method: 'POST',
      body: JSON.stringify({ ticket: t.ticket, session: sessionNonce(), ...body }),
    })
  );
}

const listingPath = (id: string, action: string) =>
  `/listings/${encodeURIComponent(id)}/${action}`;

export function browse(options: { category?: string; limit?: number; offset?: number } = {}) {
  return withTicket(t => {
    const query = new URLSearchParams({ ticket: t.ticket });
    if (options.category && options.category !== 'all') query.set('category', options.category);
    if (options.limit !== undefined) query.set('limit', String(options.limit));
    if (options.offset !== undefined) query.set('offset', String(options.offset));
    return request<{ total: number; listings: ApiListing[] }>(`/listings?${query}`);
  });
}

export function mine() {
  return withTicket(t =>
    request<{ listings: ApiListing[]; balance: number }>(
      `/mine?ticket=${encodeURIComponent(t.ticket)}`
    )
  );
}

export type ListInput = {
  character: string;
  /** The bag slot the item sits in; the game server takes it from there. */
  slot: number;
  price: number;
  category: string;
  item: Item;
};

/** Asks for a listing. It is `pending` until the game server has taken the item. */
export function list(input: ListInput) {
  return post<{ listing: ApiListing; token: Token }>('/listings', input);
}

/**
 * Tells the service to read the game database and move the listing on. Called
 * after every result packet, whatever its status. A successful list result
 * carries the item as the server serialised it; the service keeps those bytes.
 */
export function settle(id: string, item?: number[]) {
  return post<{ listing: ApiListing }>(listingPath(id, 'settle'), item ? { item } : {});
}

/** Reserves a listing for this buyer. 409 when somebody else got it first. */
export function claim(id: string, character: string) {
  return post<{ listing: ApiListing; token: Token }>(listingPath(id, 'claim'), { character });
}

/** Gives a claim back after the game server refused the buy. */
export function release(id: string) {
  return post<{ listing: ApiListing }>(listingPath(id, 'release'), {});
}

/** A null token means the row was still pending and is cancelled outright. */
export function cancel(id: string, character: string) {
  return post<{ listing: ApiListing; token: Token | null }>(listingPath(id, 'cancel'), {
    character,
  });
}

export type Payout = { listingId: string; token: Token; amount: number };

/** One token per sold box; the game server pays each into the wallet. */
export function payout(character: string) {
  return post<{ payouts: Payout[]; total: number }>('/payout', { character });
}

export function settlePayout() {
  return post<{ paid: number; remaining: number }>('/payout/settle', {});
}

/** One thing that happened to this player in the market, as the service tells it. */
export type HistoryEntry = {
  id: string;
  kind: 'sale' | 'purchase' | 'payout';
  item: Item | null;
  zen: number;
  status: 'success' | 'failed' | 'pending';
  note: string;
  at: number;
};

export function history() {
  return withTicket(t =>
    request<{ history: HistoryEntry[] }>(`/history?ticket=${encodeURIComponent(t.ticket)}`)
  );
}
