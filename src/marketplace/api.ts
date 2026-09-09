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
 */

export type ApiListing = {
  id: string;
  seller: string;
  price: number;
  item: Item;
  category: string;
  state: 'pending' | 'active' | 'claimed' | 'sold' | 'cancelled' | 'returning';
  buyer: string | null;
  listedAt: number;
};

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

/** Asks for a listing. It is not on sale until a bot has collected the item. */
export function list(item: Item, price: number, category: string, character: string) {
  return withTicket(t =>
    request<{ listing: ApiListing }>('/listings', {
      method: 'POST',
      body: JSON.stringify({ ticket: t.ticket, session: sessionNonce(), item, price, category, character }),
    })
  );
}

/** Reserves a listing. Exactly one buyer can win this. */
export function claim(id: string, character: string) {
  return withTicket(t =>
    request<{ listing: ApiListing }>(`/listings/${encodeURIComponent(id)}/claim`, {
      method: 'POST',
      body: JSON.stringify({ ticket: t.ticket, session: sessionNonce(), character }),
    })
  );
}

export function cancel(id: string) {
  return withTicket(t =>
    request<{ listing: ApiListing }>(`/listings/${encodeURIComponent(id)}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ ticket: t.ticket, session: sessionNonce() }),
    })
  );
}

export function requestPayout() {
  return withTicket(t =>
    request<{ owed: number }>('/payout', {
      method: 'POST',
      body: JSON.stringify({ ticket: t.ticket, session: sessionNonce() }),
    })
  );
}
