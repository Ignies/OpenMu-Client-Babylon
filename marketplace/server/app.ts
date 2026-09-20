import { BurstLimit, bucketFor, clientIp } from '../../src/common/rateLimit';
import { NO_BOX, type BoxState, type Boxes } from './boxes';
import { audit } from './db';
import { TOKEN_TTL_S, mintEscrowToken, newBoxId, type EscrowClaims } from './escrowToken';
import {
  confirmLive as confirmLiveWithPresence,
  exchangeSession as exchangeSessionWithPresence,
  verifyTicket,
  type Exchange,
  type Liveness,
} from './identity';
import * as store from './listings';
import { CLAIM_TTL_MS, PENDING_TTL_MS, RETURN_TTL_MS, verdict } from './reconcile';

/**
 * The marketplace's HTTP face.
 *
 * Two rules run through every route here, and both exist because the caller is
 * a browser nobody controls:
 *
 * 1. **The account never comes from the request.** It comes from the ticket,
 *    which this service minted for whoever the proxy said was logged in. A
 *    body saying `seller: "someone-else"` is ignored, not honoured.
 * 2. **Anything that mints a token also proves the socket is still live.** A
 *    ticket is a bearer token with a ten minute life; it is enough to look at
 *    your own listings with, and deliberately not enough to list, buy, cancel
 *    or collect with.
 *
 * Nothing here moves an item. A commit route answers with a signed token; the
 * client sends it to the game server, whose escrow plugin does the move; and
 * the client then reports back to a settle route, which reads the box in
 * Postgres and writes down what it finds. A report that never comes is caught
 * by the sweep, which reads the same boxes.
 */

const ALLOWED_ORIGINS = new Set(
  (process.env.MARKETPLACE_CORS_ORIGIN ?? 'https://play.ignies.net')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean)
);

const TOO_MANY = 'Too many requests. Wait a moment and try again.';
const NAME_RE = /^[A-Za-z0-9]{1,10}$/;
/** Bag slots: the equipment slots are below 12, the extended bag ends at 203. */
const FIRST_BAG_SLOT = 12;
const LAST_BAG_SLOT = 203;
const ITEM_BYTES = 12;

/** Exchanges are cheap for us and expensive upstream, so they are limited hardest. */
const sessionExchanges = new BurstLimit(10, 60_000);
/** Anything that mints a token: listing, buying, cancelling, collecting. */
const commits = new BurstLimit(30, 60_000);
/** Reads and settles. Generous, because browsing pages through the catalogue. */
const reads = new BurstLimit(240, 60_000);

export type AppDeps = {
  boxes: Boxes;
  /** Signs the tokens; the game server's plugin holds the same one. */
  secret: Uint8Array;
  /** Zen taken from the seller when the item goes into the box. */
  listingFee: number;
  /** Percent of the price kept from the seller's proceeds on a sale. */
  commissionPercent: number;
  confirmLive?: (nonce: unknown, account: string) => Promise<Liveness>;
  exchangeSession?: (nonce: unknown) => Promise<Exchange>;
  now?: () => number;
};

export type App = {
  fetch(req: Request, server: { requestIP(req: Request): { address: string } | null }): Promise<Response>;
  /** Reads the boxes of every row that is waiting on one; what changed. */
  sweep(): Promise<number>;
  /** One listing against its box. */
  reconcile(id: string): Promise<store.Listing | null>;
};

export function commissionOn(price: number, percent: number): number {
  return Math.floor((price * percent) / 100);
}

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin');
  if (!origin || !ALLOWED_ORIGINS.has(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '600',
  };
}

function json(body: unknown, status = 200, cors: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}

async function readBody(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** The account this request may act as, or a response saying why not. */
function authenticate(
  body: Record<string, unknown>,
  url: URL,
  cors: Record<string, string>
): { account: string } | { error: Response } {
  const verified = verifyTicket(body.ticket ?? url.searchParams.get('ticket'));
  if (!verified.ok) {
    return { error: json({ error: 'Your session expired.', retry: true }, 401, cors) };
  }
  return { account: verified.account };
}

const hex = (token: Uint8Array) => Buffer.from(token).toString('hex');

/** Twelve bytes the client copied out of the game server's result packet. */
function itemBytes(value: unknown): number[] | null {
  if (!Array.isArray(value) || value.length !== ITEM_BYTES) return null;
  if (!value.every(b => Number.isInteger(b) && b >= 0 && b <= 0xff)) return null;
  return value as number[];
}

/** What the wire bytes say the item is, in the two fields a box can confirm. */
function decodeBytes(bytes: number[]): { group: number; num: number } {
  return { num: bytes[0] + ((bytes[3] & 0x80) << 1), group: (bytes[5] & 0xf0) >> 4 };
}

export function createApp(deps: AppDeps): App {
  const { boxes, secret, listingFee, commissionPercent } = deps;
  const confirmLive = deps.confirmLive ?? confirmLiveWithPresence;
  const exchangeSession = deps.exchangeSession ?? exchangeSessionWithPresence;
  const now = deps.now ?? Date.now;
  let sweeps = 0;

  function mint(claims: Omit<EscrowClaims, 'expiresAt'>): string {
    return hex(mintEscrowToken({ ...claims, expiresAt: Math.floor(now() / 1000) + TOKEN_TTL_S }, secret));
  }

  /**
   * The extra proof required to mint: the socket behind the nonce must still
   * be logged in as the ticket's account, right now.
   */
  async function authorizeCommit(
    body: Record<string, unknown>,
    account: string,
    cors: Record<string, string>
  ): Promise<Response | null> {
    const live = await confirmLive(body.session, account);
    return live.ok ? null : json({ error: live.message, retry: live.reason === 'unknown' }, 403, cors);
  }

  async function boxOf(listing: store.Listing): Promise<BoxState> {
    // A row from before the escrow has no box; it reads as one that is gone.
    return listing.boxId ? boxes.state(listing.boxId) : NO_BOX;
  }

  /**
   * Writes what the box says about one listing. When that puts a `pending`
   * row on sale, the catalogue entry is checked against the item row first:
   * the box is what the buyer receives, so the box wins.
   */
  async function reconcileWith(listing: store.Listing, box: BoxState): Promise<store.Listing> {
    const next = verdict(listing, box, now());
    if (!next) return listing;
    if (next.anomaly) {
      console.error(`marketplace: listing ${listing.id} ${listing.state} -> ${next.state}: ${next.why}`);
    }
    if (listing.state === 'pending' && next.state === 'active' && box.item) {
      const { item } = listing;
      const { group, number, level } = box.item;
      if (item.group !== group || item.num !== number || (item.lvl ?? 0) !== level) {
        console.error(
          `marketplace: listing ${listing.id} said ${item.group}/${item.num} +${item.lvl ?? 0}, ` +
            `the box holds ${group}/${number} +${level}; corrected`
        );
        store.patchItem(listing.id, { group, num: number, lvl: level });
        audit('listing item corrected', {
          listing: listing.id,
          detail: { said: [item.group, item.num, item.lvl ?? 0], held: [group, number, level] },
        });
      }
    }
    store.apply(listing.id, listing.state, next);
    return store.byId(listing.id) ?? listing;
  }

  async function reconcile(id: string): Promise<store.Listing | null> {
    const listing = store.byId(id);
    if (!listing) return null;
    return reconcileWith(listing, await boxOf(listing));
  }

  async function sweep(): Promise<number> {
    const at = now();
    sweeps += 1;
    const rows = [
      ...store.inState('pending', at - PENDING_TTL_MS),
      ...store.inState('claimed', at - CLAIM_TTL_MS),
      ...store.inState('returning', at - RETURN_TTL_MS),
      ...store.inState('sold'),
      // Nothing should ever move an active listing's box behind the service's
      // back, so those are looked at rarely.
      ...(sweeps % 10 === 1 ? store.inState('active') : []),
    ];

    let changed = 0;
    for (const listing of rows) {
      try {
        const after = await reconcileWith(listing, await boxOf(listing));
        if (after.state !== listing.state) changed += 1;
      } catch (error) {
        console.error('marketplace: sweep could not read a box:', error instanceof Error ? error.message : error);
        break;
      }
    }
    return changed;
  }

  async function fetch(
    req: Request,
    server: { requestIP(req: Request): { address: string } | null }
  ): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;
    const cors = corsHeaders(req);
    const ip = bucketFor(clientIp(req, server));

    if (req.method === 'OPTIONS') {
      const allowed = cors['Access-Control-Allow-Origin'] !== undefined;
      return new Response(null, { status: allowed ? 204 : 403, headers: cors });
    }

    try {
      // ---- identity ------------------------------------------------------

      if (path === '/api/market/session' && req.method === 'POST') {
        if (sessionExchanges.hammering(ip)) return json({ error: TOO_MANY }, 429, cors);

        const body = await readBody(req);
        const exchange = await exchangeSession(body.session);
        if (!exchange.ok) {
          return json({ error: exchange.message, retry: exchange.reason === 'unknown' }, 401, cors);
        }
        return json({ ticket: exchange.ticket.ticket, account: exchange.ticket.account }, 200, cors);
      }

      // ---- reads ---------------------------------------------------------

      if (path === '/api/market/listings' && req.method === 'GET') {
        if (reads.hammering(ip)) return json({ error: TOO_MANY }, 429, cors);

        const auth = authenticate({}, url, cors);
        if ('error' in auth) return auth.error;

        const page = store.browse({
          category: url.searchParams.get('category') ?? undefined,
          limit: Number(url.searchParams.get('limit') ?? 50),
          offset: Number(url.searchParams.get('offset') ?? 0),
        });
        return json(page, 200, cors);
      }

      if (path === '/api/market/history' && req.method === 'GET') {
        if (reads.hammering(ip)) return json({ error: TOO_MANY }, 429, cors);

        const auth = authenticate({}, url, cors);
        if ('error' in auth) return auth.error;

        return json({ history: store.historyFor(auth.account) }, 200, cors);
      }

      if (path === '/api/market/mine' && req.method === 'GET') {
        if (reads.hammering(ip)) return json({ error: TOO_MANY }, 429, cors);

        const auth = authenticate({}, url, cors);
        if ('error' in auth) return auth.error;

        return json(
          { listings: store.bySeller(auth.account), balance: store.owed(auth.account) },
          200,
          cors
        );
      }

      // ---- listing -------------------------------------------------------

      if (path === '/api/market/listings' && req.method === 'POST') {
        if (commits.hammering(ip)) return json({ error: TOO_MANY }, 429, cors);

        const body = await readBody(req);
        const auth = authenticate(body, url, cors);
        if ('error' in auth) return auth.error;
        const refused = await authorizeCommit(body, auth.account, cors);
        if (refused) return refused;

        // The character is the one field the browser supplies that the
        // ticket cannot vouch for. The token names it, and the plugin refuses
        // a token for a character the account is not playing.
        const character = body.character;
        if (typeof character !== 'string' || !NAME_RE.test(character)) {
          return json({ error: 'Log in to a character first.' }, 400, cors);
        }

        const slot = Number(body.slot);
        if (!Number.isInteger(slot) || slot < FIRST_BAG_SLOT || slot > LAST_BAG_SLOT) {
          return json({ error: 'That item is not in your bag.' }, 400, cors);
        }

        const item = body.item as store.Item | undefined;
        const price = Number(body.price);
        const category = typeof body.category === 'string' ? body.category : 'misc';

        if (!item || typeof item.group !== 'number' || typeof item.num !== 'number') {
          return json({ error: 'That item is not one the marketplace can read.' }, 400, cors);
        }
        if (!Number.isInteger(price) || price < 1 || price > store.MAX_PRICE) {
          return json({ error: 'Price must be between 1 and 2,000,000,000 Zen.' }, 400, cors);
        }

        let listing: store.Listing;
        try {
          // The seller is the ticket's account, never the body's.
          listing = store.createPending({
            seller: auth.account,
            sellerCharacter: character,
            price,
            item,
            category,
            boxId: newBoxId(),
          });
        } catch (e) {
          return json({ error: e instanceof Error ? e.message : 'That listing was refused.' }, 400, cors);
        }

        const token = mint({
          op: 'list',
          listingId: listing.id,
          boxId: listing.boxId,
          slot,
          amount: price,
          fee: listingFee,
          account: auth.account,
          character,
        });
        return json({ listing, token }, 201, cors);
      }

      const action = path.match(/^\/api\/market\/listings\/([\w-]+)\/(settle|claim|release|cancel)$/);
      if (action && req.method === 'POST') {
        const [, id, verb] = action;
        const body = await readBody(req);
        const auth = authenticate(body, url, cors);
        if ('error' in auth) return auth.error;

        const listing = store.byId(id);
        if (!listing) return json({ error: 'That listing is gone.' }, 404, cors);

        // ---- settle: anyone may ask; it only reads the box -------------
        if (verb === 'settle') {
          if (reads.hammering(ip)) return json({ error: TOO_MANY }, 429, cors);

          const box = await boxOf(listing);
          const after = await reconcileWith(listing, box);
          const bytes = itemBytes(body.item);
          if (bytes && listing.state === 'pending' && after.state === 'active' && box.item) {
            const said = decodeBytes(bytes);
            if (said.group === box.item.group && said.num === box.item.number) {
              store.patchItem(id, { raw: bytes });
            } else {
              console.error(`marketplace: listing ${id}: the posted item bytes are not the box's item; ignored`);
            }
          }
          return json({ listing: store.byId(id) }, 200, cors);
        }

        if (commits.hammering(ip)) return json({ error: TOO_MANY }, 429, cors);
        const refused = await authorizeCommit(body, auth.account, cors);
        if (refused) return refused;

        const character = body.character;
        const named = typeof character === 'string' && NAME_RE.test(character);

        // ---- claim: active -> claimed, one winner ----------------------
        if (verb === 'claim') {
          if (!named) return json({ error: 'Log in to a character first.' }, 400, cors);
          if (listing.seller === auth.account) {
            return json({ error: 'That is your own listing.' }, 400, cors);
          }
          if (!listing.itemId) {
            return json({ error: 'That listing is not on sale.' }, 409, cors);
          }
          if (!store.claim(id, auth.account, character)) {
            return json({ error: 'Somebody else got there first.' }, 409, cors);
          }
          const token = mint({
            op: 'buy',
            listingId: id,
            boxId: listing.boxId,
            itemId: listing.itemId,
            amount: listing.price,
            fee: commissionOn(listing.price, commissionPercent),
            account: auth.account,
            character,
          });
          return json({ listing: store.byId(id), token }, 200, cors);
        }

        // ---- release: claimed -> active, by the claimant ---------------
        if (verb === 'release') {
          if (listing.state !== 'claimed' || listing.buyer !== auth.account) {
            return json({ error: 'That listing is not yours to release.' }, 409, cors);
          }
          const box = await boxOf(listing);
          if (!box.item || box.item.id !== listing.itemId) {
            // The box no longer holds the item: the purchase went through,
            // or something else did. The box says which.
            const after = await reconcileWith(listing, box);
            return json({ error: 'That purchase already went through.', listing: after }, 409, cors);
          }
          store.release(id, auth.account, 'the buyer let it go');
          return json({ listing: store.byId(id) }, 200, cors);
        }

        // ---- cancel: pending -> cancelled, active -> returning ---------
        if (!named) return json({ error: 'Log in to a character first.' }, 400, cors);
        if (listing.seller !== auth.account) {
          return json({ error: 'That is not your listing.' }, 403, cors);
        }

        let current = listing;
        if (current.state === 'pending') {
          const box = await boxOf(current);
          if (!box.exists) {
            store.cancelPending(id, auth.account, 'the seller changed their mind');
            return json({ listing: store.byId(id), token: null }, 200, cors);
          }
          // The item did go in; carry on as a cancel of an active listing.
          current = await reconcileWith(current, box);
        }

        if (current.state === 'claimed') {
          return json({ error: 'Somebody is buying that right now.' }, 409, cors);
        }
        if (current.state === 'active') {
          if (!store.startReturn(id, auth.account)) {
            return json({ error: 'That listing cannot be cancelled now.' }, 409, cors);
          }
        } else if (current.state === 'returning') {
          // A second cancel token, for a bag that was full the first time.
          store.touchReturn(id, auth.account);
        } else {
          return json({ error: 'That listing cannot be cancelled now.', listing: current }, 409, cors);
        }

        const token = mint({
          op: 'cancel',
          listingId: id,
          boxId: current.boxId,
          itemId: current.itemId ?? undefined,
          amount: 0,
          fee: 0,
          account: auth.account,
          character,
        });
        return json({ listing: store.byId(id), token }, 200, cors);
      }

      // ---- collecting ----------------------------------------------------

      if (path === '/api/market/payout' && req.method === 'POST') {
        if (commits.hammering(ip)) return json({ error: TOO_MANY }, 429, cors);

        const body = await readBody(req);
        const auth = authenticate(body, url, cors);
        if ('error' in auth) return auth.error;
        const refused = await authorizeCommit(body, auth.account, cors);
        if (refused) return refused;

        const character = body.character;
        if (typeof character !== 'string' || !NAME_RE.test(character)) {
          return json({ error: 'Log in to a character first.' }, 400, cors);
        }

        const payouts = store.soldBy(auth.account).map(listing => ({
          listingId: listing.id,
          amount: listing.proceeds ?? 0,
          token: mint({
            op: 'collect',
            listingId: listing.id,
            boxId: listing.boxId,
            itemId: listing.itemId ?? undefined,
            amount: listing.proceeds ?? 0,
            fee: 0,
            account: auth.account,
            character,
          }),
        }));
        const total = payouts.reduce((sum, p) => sum + p.amount, 0);
        return json({ payouts, total }, 200, cors);
      }

      if (path === '/api/market/payout/settle' && req.method === 'POST') {
        if (reads.hammering(ip)) return json({ error: TOO_MANY }, 429, cors);

        const body = await readBody(req);
        const auth = authenticate(body, url, cors);
        if ('error' in auth) return auth.error;

        let paid = 0;
        let paidTotal = 0;
        for (const listing of store.soldBy(auth.account)) {
          const after = await reconcileWith(listing, await boxOf(listing));
          if (after.state === 'paid') {
            paid += 1;
            paidTotal += listing.proceeds ?? 0;
          }
        }
        const remaining = store.soldBy(auth.account).length;
        return json({ paid, paidTotal, remaining, remainingTotal: store.owed(auth.account) }, 200, cors);
      }

      return json({ error: 'No such route.' }, 404, cors);
    } catch (error) {
      console.error('marketplace: unhandled error', error);
      return json({ error: 'Something went wrong.' }, 500, cors);
    }
  }

  return { fetch, sweep, reconcile };
}
