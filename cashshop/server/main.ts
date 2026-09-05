import postgres from 'postgres';
import { CATALOG, LINES } from './catalog';
import { DB_PATH } from './db';
import { Fulfilment, loadFulfilmentConfig } from './fulfilment';
import { GACHA_POOL, newSeed, roll } from './gacha';
import { SafetyGate, loadGateConfig } from './gate';
import { Orders, Refusal } from './orders';
import { confirmLive, exchangeSession, verifyTicket } from './tickets';
import { BurstLimit, bucketFor, clientIp } from '../../src/common/rateLimit';

/**
 * The cash shop service.
 *
 * The shop is an in-game window (`src/ui/pages/worldPage/components/cashShop`)
 * opened from the item shop button on the bottom bar, so there is no page to
 * serve and no sign-in: the player is already authenticated to the game
 * server, and the proxy that carries their socket is what vouches for them
 * here (`tickets.ts`). What this process owns is everything a client must
 * not: the catalogue and its prices, the gacha draw, the order queue, and the
 * one transaction in the repository that writes to OpenMU's database.
 *
 * Four things happen here, in four files:
 *
 *   identity     POST /api/session turns the websocket nonce into a ticket by
 *                asking the proxy's loopback presence server who logged in on
 *                it. Every other request carries that ticket in its body or
 *                query string - never a cookie, never a custom header, because
 *                the window fetches with `credentials: 'omit'` and the
 *                preflight below allows only `Content-Type`. The ticket names
 *                the account; the client's own claim is never read. Anything
 *                that spends - placing, cancelling - carries the nonce as
 *                well, and the proxy is asked again whether that socket is
 *                still logged in as that account: a ticket reads, a live
 *                session spends.
 *   placement    POST /api/orders bounds the spend against the database
 *                wallet and the daily caps and writes the order to the
 *                service's own SQLite (`orders.ts`, `db.ts`). A gacha order is
 *                rolled and committed in that same write, so the window can
 *                play the reveal the moment the player pays and nobody can
 *                shop for an outcome by cancelling.
 *   fulfilment   A worker drains the queue whenever the safety gate says an
 *                account is safe to write to (`fulfilment.ts`, `gate.ts`).
 *                `CASHSHOP_FULFIL=off`, the default, rehearses the whole thing
 *                and writes nothing.
 *   the catalog  GET /api/catalog, public and read-only.
 *
 * Listens on loopback. Caddy publishes it under `/api` on the client host,
 * which keeps it same-origin with the game; `vite.config.ts` proxies the same
 * path in dev. It can also live on a host of its own, in which case
 * `CORS_ORIGIN` names the client and every answer carries the CORS headers.
 */

const PORT = Number(process.env.PORT || 3200);
const HOSTNAME = process.env.HOSTNAME || '127.0.0.1';

/**
 * `postgres://user:pass@host:port/db`, as register and the gate CLI. The
 * database is bound to loopback by the compose file, so this is a local
 * connection.
 */
const DATABASE_URL =
  process.env.DATABASE_URL || 'postgres://postgres:admin@127.0.0.1:5432/openmu';

/**
 * Origins allowed to call this from a browser, comma separated, matched
 * exactly.
 *
 * Unset by default, which is the same-origin deployment: Caddy publishes the
 * service under `/api` on the client's own host, the window fetches a relative
 * path, and no CORS header is involved at all.
 *
 * Set it when the service gets a host of its own (`api.example.net`), and
 * build the client with `VITE_CASHSHOP_API` pointing there. Exact origins
 * only, never `*`: every order carries a ticket, and a wildcard is how a page
 * on any origin gets to spend a player's jewels with a ticket it found.
 */
const ALLOWED_ORIGINS = new Set(
  (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean)
);

/**
 * The free roll that returns a real result from the real tables. It existed so
 * the reveal could be built before ordering was, and it stays available for
 * that - but only when asked for, because a paid gacha next to a free one that
 * draws from the same tables is hollow: anyone could sample the weights for
 * nothing, and a client could show a "real" roll without ever having placed an
 * order. Off unless `CASHSHOP_PREVIEW=on`, and never on in production.
 */
const PREVIEW_OPEN = process.env.CASHSHOP_PREVIEW === 'on';

/**
 * Attempts per bucket per window, in memory. Forgetting them on a restart
 * costs nothing: the daily caps, which are what actually bound the damage,
 * are on disk in the order store.
 *
 * The session exchange is counted per network and nothing else, because no
 * account is known until the presence server answers. A page load costs one
 * and the window re-exchanges once every ten minutes, so 30 in a window is a
 * household of players reloading their tabs, and the bucket is its own: a
 * neighbour's shopping must not make a player's login fail to exchange.
 *
 * Everything that carries a ticket - reading the queue, placing, cancelling -
 * is counted per account, which is the identity a ticket actually proves,
 * with a per-network bucket behind it only as a backstop against one address
 * driving many tickets. The account number comes from what the window does:
 * it polls the queue every 30 s (`ORDERS_POLL_MS` in `src/cashShop/state.ts`),
 * which is 20 reads a window doing nothing, refreshes after every order, and
 * the caps in `catalog.ts` allow about 140 orders a day of which the gacha's
 * 12 is the most a player places in one sitting. 120 lets a player buy the
 * whole day's allowance inside one window and still holds one ticket to a
 * fifth of a request a second - two Postgres reads each, on the database the
 * game server shares. The network backstop is loose on purpose: a shared
 * address is a LAN party or a campus NAT, and one player must never spend
 * the neighbours' allowance.
 */
const BURST_WINDOW_MS = Number(process.env.BURST_WINDOW_MS || 10 * 60 * 1000);
const SESSION_BURST_LIMIT = Number(process.env.SESSION_BURST_LIMIT || 30);
const ACCOUNT_BURST_LIMIT = Number(process.env.ACCOUNT_BURST_LIMIT || 120);
const NETWORK_BURST_LIMIT = Number(process.env.NETWORK_BURST_LIMIT || 1000);

const sql = postgres(DATABASE_URL);
const gateConfig = loadGateConfig();
const gate = new SafetyGate(sql, gateConfig);
const fulfilment = new Fulfilment(sql, gate, loadFulfilmentConfig());
const orders = new Orders(fulfilment);

const sessionExchanges = new BurstLimit(SESSION_BURST_LIMIT, BURST_WINDOW_MS);
const accountRequests = new BurstLimit(ACCOUNT_BURST_LIMIT, BURST_WINDOW_MS);
const networkRequests = new BurstLimit(NETWORK_BURST_LIMIT, BURST_WINDOW_MS);

/* --------------------------------------------------------------- answers */

/** The CORS headers for this caller, or nothing when it is same-origin. */
function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin');

  if (!origin || !ALLOWED_ORIGINS.has(origin)) return {};

  return {
    'Access-Control-Allow-Origin': origin,
    // The answer differs by origin, so a shared cache must not reuse one for
    // another.
    Vary: 'Origin',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function json(
  body: unknown,
  status = 200,
  extra: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...extra },
  });
}

const TOO_MANY = 'Too many requests. Please slow down.';

/** Caddy is in front, so the real client is in the forwarded header; `clientIp` knows when to believe it. */
function networkHammering(
  req: Request,
  server: { requestIP(req: Request): { address: string } | null }
): boolean {
  return networkRequests.hammering(bucketFor(clientIp(req, server)));
}

/**
 * The account a ticket names, with its bucket charged, or the answer to send
 * instead. 401 for anything but a good ticket: the client treats 401 as
 * "exchange again", and every failure here - malformed, forged, expired - is
 * cured by exactly that, so they are not told apart on the wire. The account
 * bucket is charged only after the ticket verifies, because before that
 * there is no account to charge and a forged ticket could name anyone's.
 */
function accountFor(
  ticket: unknown,
  cors: Record<string, string>
): { account: string } | { answer: Response } {
  const verified = verifyTicket(ticket);

  if (!verified.ok) {
    return { answer: json({ error: 'Your session has expired. Please try again.' }, 401, cors) };
  }

  if (accountRequests.hammering(verified.account)) {
    return { answer: json({ error: TOO_MANY }, 429, cors) };
  }

  return { account: verified.account };
}

/**
 * The status for a spend the proxy would not vouch for. Not 401: that tells
 * the client to exchange its ticket, and a fresh ticket would be refused for
 * the same reason. `unknown` and `someoneElse` are the player's to fix by
 * logging in; `unreachable` is ours.
 */
function liveStatus(reason: 'malformed' | 'unknown' | 'unreachable' | 'someoneElse'): number {
  return reason === 'malformed' ? 400 : reason === 'unreachable' ? 503 : 403;
}

/** The request body as an object, or null for anything that is not one. */
async function bodyOf(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await req.json();
    return body !== null && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ serve */

Bun.serve({
  port: PORT,
  hostname: HOSTNAME,
  async fetch(req, server) {
    const url = new URL(req.url);
    const path = url.pathname;
    const cors = corsHeaders(req);

    // The preflight a browser sends before a cross-origin POST. Answered here
    // rather than falling through to the 404 below.
    if (req.method === 'OPTIONS') {
      const allowed = cors['Access-Control-Allow-Origin'] !== undefined;
      return new Response(null, { status: allowed ? 204 : 403, headers: cors });
    }

    try {
      if (path === '/api/catalog' && req.method === 'GET') {
        return json(
          { lines: LINES, products: CATALOG, gachaPoolSize: GACHA_POOL.length },
          200,
          cors
        );
      }

      if (path === '/api/session' && req.method === 'POST') {
        // Checked before the presence server is asked, so a spent allowance
        // costs nothing upstream.
        if (sessionExchanges.hammering(bucketFor(clientIp(req, server)))) {
          return json({ error: TOO_MANY }, 429, cors);
        }

        const body = await bodyOf(req);

        if (!body) return json({ error: 'Malformed request.' }, 400, cors);

        const exchange = await exchangeSession(body.session);

        if (exchange.ok) return json(exchange.ticket, 200, cors);

        // Not 401: that status tells the client its ticket is stale and to
        // exchange again, and here there is no ticket yet - answering 401 to
        // the exchange itself would have the window exchanging in a loop.
        // `unknown` is the player's to fix (log in, then try again);
        // `unreachable` is ours.
        const status = exchange.reason === 'malformed' ? 400 : exchange.reason === 'unknown' ? 403 : 503;

        return json({ error: exchange.message }, status, cors);
      }

      if (path === '/api/orders' && req.method === 'GET') {
        // Limited like a spend: every read is two Postgres queries against
        // OpenMU's database (`Fulfilment.wallet`), and nothing else bounds
        // how many of them a ticket can drive.
        if (networkHammering(req, server)) return json({ error: TOO_MANY }, 429, cors);

        const who = accountFor(url.searchParams.get('ticket'), cors);

        if ('answer' in who) return who.answer;

        return json(await orders.list(who.account), 200, cors);
      }

      if (path === '/api/orders' && req.method === 'POST') {
        if (networkHammering(req, server)) return json({ error: TOO_MANY }, 429, cors);

        const body = await bodyOf(req);

        if (!body) return json({ error: 'Malformed request.' }, 400, cors);

        const who = accountFor(body.ticket, cors);

        if ('answer' in who) return who.answer;

        const live = await confirmLive(body.session, who.account);

        if (!live.ok) return json({ error: live.message }, liveStatus(live.reason), cors);

        const order = await orders.place(who.account, body.productId);

        console.info(
          `order ${order.id}: ${who.account} bought ${order.productName} for ${order.chaos} chaos` +
            (order.roll ? ` (seed ${order.roll.seed}, ${order.roll.tier})` : '')
        );

        return json({ order }, 200, cors);
      }

      if (path === '/api/orders/cancel' && req.method === 'POST') {
        if (networkHammering(req, server)) return json({ error: TOO_MANY }, 429, cors);

        const body = await bodyOf(req);

        if (!body) return json({ error: 'Malformed request.' }, 400, cors);

        const who = accountFor(body.ticket, cors);

        if ('answer' in who) return who.answer;

        const live = await confirmLive(body.session, who.account);

        if (!live.ok) return json({ error: live.message }, liveStatus(live.reason), cors);

        const order = orders.cancel(who.account, body.id);

        console.info(`order ${order.id}: ${who.account} cancelled ${order.productName}`);

        return json({ order }, 200, cors);
      }

      if (path === '/api/gacha/preview' && req.method === 'POST') {
        // A 404 rather than a 403: when the preview is closed, the route does
        // not exist, and the answer should not confirm that it could.
        if (!PREVIEW_OPEN) return json({ error: 'Not found' }, 404, cors);

        // A real roll from the real tables, on a fresh seed, that spends
        // nothing and writes nothing. Unauthenticated: it tells the caller
        // nothing about any player.
        return json({ preview: true, roll: roll(newSeed()) }, 200, cors);
      }

      return json({ error: 'Not found' }, 404, cors);
    } catch (error) {
      if (error instanceof Refusal) return json({ error: error.message }, error.status, cors);

      // Never surface the error itself: it would leak the schema, and the
      // player can do nothing with it either way.
      console.error(`${req.method} ${path} failed:`, error);
      return json({ error: 'Something went wrong. Please try again.' }, 500, cors);
    }
  },
});

/* ------------------------------------------------------------------- boot */

console.info(`cash shop api listening on ${HOSTNAME}:${PORT}`);
console.info(`  orders          ${DB_PATH}`);
console.info(`  fulfilment      ${fulfilment.mode}`);
console.info(`  ticket secret   ${process.env.CASHSHOP_TICKET_SECRET ? 'configured' : 'random per boot (set CASHSHOP_TICKET_SECRET)'}`);
console.info(`  preview         ${PREVIEW_OPEN ? 'open (CASHSHOP_PREVIEW=on; development only)' : 'closed'}`);
console.info(`  cors            ${ALLOWED_ORIGINS.size > 0 ? [...ALLOWED_ORIGINS].join(', ') : 'same-origin only'}`);
console.info(`  presence        ${gateConfig.presenceUrl}`);

if (!gateConfig.gameHost || !gateConfig.gamePort) {
  console.warn(
    '  GAME_PROBE_HOST / GAME_PROBE_PORT are unset, so the port probe will refuse and nothing will be delivered.' +
      ' Set them to the address a player\'s client would dial.'
  );
}

// Said once at boot, in the resolver's own words, rather than discovered on
// the first order: a database that is down or does not look like OpenMU's is
// the difference between a shop that will sell and one that will only queue.
// The worker keeps retrying on its own, so this is a report, not a verdict.
fulfilment
  .resolveOnce()
  .catch(error =>
    console.error(
      `  OpenMU's database cannot be written to yet, so orders will queue: ${error instanceof Error ? error.message : error}`
    )
  );

fulfilment.start();
