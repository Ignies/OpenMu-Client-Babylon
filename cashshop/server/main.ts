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

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Bun.serve({
  port: PORT,
  hostname: HOSTNAME,
  fetch(req) {
    const path = new URL(req.url).pathname;

    try {
      if (path === '/api/catalog' && req.method === 'GET') {
        return json({ lines: LINES, products: CATALOG, gachaPoolSize: GACHA_POOL.length });
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
        return json({ preview: true, roll: roll(newSeed()) });
      }

      if (path === '/api/orders' && req.method === 'GET') {
        // The queue lands with order placement. Until then the window's
        // delivery tab is honestly empty rather than absent.
        return json({ orders: [], acceptingOrders: false });
      }

      return json({ error: 'Not found' }, 404);
    } catch (error) {
      console.error(`${req.method} ${path} failed:`, error);
      return json({ error: 'Something went wrong. Please try again.' }, 500);
    }
  },
});

console.info(`cash shop api listening on ${HOSTNAME}:${PORT}`);
