import { CATALOG, LINES } from './catalog';
import { GACHA_POOL, newSeed, roll } from './gacha';

/**
 * The cash shop service.
 *
 * The shop is an in-game window now (`src/ui/pages/worldPage/components/cashShop`),
 * opened from the item shop button on the bottom bar, so there is no sign-in
 * here and no page to serve: the player is already authenticated to the game
 * server, and the window counts their jewels off the inventory the client
 * already holds rather than asking this service for a number it can only know
 * as of the player's last save.
 *
 * What is left is the part a client must not own: the catalogue and its prices,
 * and the gacha draw. Both are read-only, and neither touches OpenMU's
 * database - the safety gate (`gate.ts`, `gateCli.ts`) is the only thing here
 * that talks to it, and only to answer whether an account may be written to.
 *
 * Ordering and fulfilment come next, and they will bring the database back:
 * a queue in the service's own SQLite, and one transaction per delivery. They
 * also bring the only identity problem worth solving - a request from inside
 * the game has to prove which account it is, which the proxy can vouch for
 * (see documentation/cashshop/ARCHITECTURE.md) without a password ever being
 * typed twice.
 *
 * Listens on loopback. Caddy publishes it under `/api` on the client host,
 * which keeps it same-origin with the game; `vite.config.ts` proxies the same
 * path in dev.
 */

const PORT = Number(process.env.PORT || 3200);
const HOSTNAME = process.env.HOSTNAME || '127.0.0.1';

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
 * only, never `*`: nothing here is secret today, but ordering will carry a
 * ticket, and a wildcard that outlives the reason it was harmless is how that
 * goes wrong.
 */
const ALLOWED_ORIGINS = new Set(
  (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean)
);

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

Bun.serve({
  port: PORT,
  hostname: HOSTNAME,
  fetch(req) {
    const path = new URL(req.url).pathname;
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

      if (path === '/api/gacha/preview' && req.method === 'POST') {
        /**
         * A real roll from the real tables, on a fresh seed, that spends
         * nothing and writes nothing.
         *
         * It exists so the reveal can be built and watched before ordering is:
         * the window animates whatever the server returns, so when fulfilment
         * starts returning committed rolls instead, the reveal does not change.
         * Unauthenticated on purpose - it costs nothing and tells the caller
         * nothing about any player.
         */
        return json({ preview: true, roll: roll(newSeed()) }, 200, cors);
      }

      if (path === '/api/orders' && req.method === 'GET') {
        // The queue lands with order placement. Until then the window's
        // delivery tab is honestly empty rather than absent.
        return json({ orders: [], acceptingOrders: false }, 200, cors);
      }

      return json({ error: 'Not found' }, 404, cors);
    } catch (error) {
      console.error(`${req.method} ${path} failed:`, error);
      return json({ error: 'Something went wrong. Please try again.' }, 500, cors);
    }
  },
});

console.info(`cash shop api listening on ${HOSTNAME}:${PORT}`);
