import { BurstLimit, bucketFor, clientIp } from '../../src/common/rateLimit';
import { confirmLive, exchangeSession, verifyTicket } from './identity';
import * as store from './listings';
import { audit } from './db';

/**
 * The marketplace's HTTP face.
 *
 * Two rules run through every route here, and both exist because the caller is
 * a browser nobody controls:
 *
 * 1. **The account never comes from the request.** It comes from the ticket,
 *    which this service minted for whoever the proxy said was logged in. A
 *    body saying `seller: "someone-else"` is ignored, not honoured.
 * 2. **Anything that commits also proves the socket is still live.** A ticket
 *    is a bearer token with a ten minute life; it is enough to look at your
 *    own listings with, and deliberately not enough to list, buy, cancel or
 *    collect with.
 */

const PORT = Number(process.env.MARKETPLACE_API_PORT ?? 3300);
const HOSTNAME = process.env.MARKETPLACE_API_HOST ?? '127.0.0.1';

const ALLOWED_ORIGINS = new Set(
  (process.env.MARKETPLACE_CORS_ORIGIN ?? 'https://play.ignies.net')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean)
);

const TOO_MANY = 'Too many requests. Wait a moment and try again.';

/** Exchanges are cheap for us and expensive upstream, so they are limited hardest. */
const sessionExchanges = new BurstLimit(10, 60_000);
/** Anything that commits: listing, buying, cancelling, collecting. */
const commits = new BurstLimit(30, 60_000);
/** Reads. Generous, because browsing pages through the catalogue. */
const reads = new BurstLimit(240, 60_000);

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

/**
 * The extra proof required to commit: the socket behind the nonce must still
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

Bun.serve({
  port: PORT,
  hostname: HOSTNAME,
  async fetch(req, server) {
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
        return json(
          { ticket: exchange.ticket.ticket, account: exchange.ticket.account },
          200,
          cors
        );
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

      if (path === '/api/market/mine' && req.method === 'GET') {
        if (reads.hammering(ip)) return json({ error: TOO_MANY }, 429, cors);

        const auth = authenticate({}, url, cors);
        if ('error' in auth) return auth.error;

        return json(
          { listings: store.bySeller(auth.account), balance: store.balance(auth.account) },
          200,
          cors
        );
      }

      // ---- commits -------------------------------------------------------

      if (path === '/api/market/listings' && req.method === 'POST') {
        if (commits.hammering(ip)) return json({ error: TOO_MANY }, 429, cors);

        const body = await readBody(req);
        const auth = authenticate(body, url, cors);
        if ('error' in auth) return auth.error;
        const refused = await authorizeCommit(body, auth.account, cors);
        if (refused) return refused;

        // The character the bot has to meet. It is the one field the browser
        // supplies that the ticket cannot vouch for, so it is shape-checked
        // here and the handover itself is the real check: a wrong name simply
        // never completes, because that player has to accept the trade and put
        // the item up themselves.
        const character = body.character;
        if (typeof character !== 'string' || !/^[A-Za-z0-9]{1,10}$/.test(character)) {
          return json({ error: 'Log in to a character first.' }, 400, cors);
        }

        const item = body.item as store.Item | undefined;
        const price = Number(body.price);
        const category = typeof body.category === 'string' ? body.category : 'misc';

        if (!item || typeof item.group !== 'number' || typeof item.num !== 'number') {
          return json({ error: 'That item is not one the marketplace can read.' }, 400, cors);
        }

        try {
          // The seller is the ticket's account, never the body's.
          const listing = store.createPending({
            seller: auth.account,
            sellerCharacter: character,
            price,
            item,
            category,
          });
          return json({ listing }, 201, cors);
        } catch (e) {
          return json({ error: e instanceof Error ? e.message : 'That listing was refused.' }, 400, cors);
        }
      }

      const claimMatch = path.match(/^\/api\/market\/listings\/([\w-]+)\/(claim|cancel)$/);
      if (claimMatch && req.method === 'POST') {
        if (commits.hammering(ip)) return json({ error: TOO_MANY }, 429, cors);

        const [, id, action] = claimMatch;
        const body = await readBody(req);
        const auth = authenticate(body, url, cors);
        if ('error' in auth) return auth.error;
        const refused = await authorizeCommit(body, auth.account, cors);
        if (refused) return refused;

        const character = body.character;
        if (action === 'claim' && (typeof character !== 'string' || !/^[A-Za-z0-9]{1,10}$/.test(character))) {
          return json({ error: 'Log in to a character first.' }, 400, cors);
        }

        if (action === 'claim') {
          const listing = store.byId(id);
          if (!listing) return json({ error: 'That listing is gone.' }, 404, cors);
          if (listing.seller === auth.account) {
            return json({ error: 'That is your own listing.' }, 400, cors);
          }
          if (!store.claim(id, auth.account, character as string)) {
            return json({ error: 'Somebody else got there first.' }, 409, cors);
          }
          return json({ listing: store.byId(id) }, 200, cors);
        }

        // cancel: the store checks it is this seller's, so a forged id fails.
        if (!store.cancel(id, auth.account)) {
          return json({ error: 'That listing cannot be cancelled now.' }, 409, cors);
        }
        return json({ listing: store.byId(id) }, 200, cors);
      }

      if (path === '/api/market/payout' && req.method === 'POST') {
        if (commits.hammering(ip)) return json({ error: TOO_MANY }, 429, cors);

        const body = await readBody(req);
        const auth = authenticate(body, url, cors);
        if ('error' in auth) return auth.error;
        const refused = await authorizeCommit(body, auth.account, cors);
        if (refused) return refused;

        const owed = store.balance(auth.account);
        if (owed <= 0) return json({ error: 'You have nothing to collect.' }, 400, cors);

        // Recorded as requested rather than taken: the money is only removed
        // from the balance when a bot is actually about to hand it over, so a
        // request that never reaches a handover cannot lose it.
        audit('payout requested', { account: auth.account, detail: { owed } });
        return json({ owed }, 200, cors);
      }

      return json({ error: 'No such route.' }, 404, cors);
    } catch (error) {
      console.error('marketplace: unhandled error', error);
      return json({ error: 'Something went wrong.' }, 500, cors);
    }
  },
});

console.log(`marketplace: serving on http://${HOSTNAME}:${PORT}`);
