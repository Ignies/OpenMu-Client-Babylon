import postgres from 'postgres';
import { forgetSignupsBefore, recordAccount, recordSignup, signupsSince } from './db';
import { BurstLimit, bucketFor, clientIp } from '../../src/core/rateLimit';
import { createAccount, validate } from './accounts';

/**
 * The account-creation endpoint behind `register.ignies.net`.
 *
 * It writes straight into OpenMU's database rather than going through the game
 * server, because OpenMU has no public "create account" call - the admin panel
 * does it in-process. That makes this file the *only* thing outside OpenMU that
 * writes to `data."Account"`, so the column list below has to stay in step with
 * that table (see `docs` in README for the `\d` output it was written from).
 *
 * Listens on loopback only. Caddy publishes it under `/api` on the register
 * host, which keeps it same-origin with the standalone page. The client's own
 * register window is not same-origin - it is served from `play.<domain>` -
 * which is what `CORS_ORIGIN` is for.
 */

const PORT = Number(process.env.PORT || 3100);
const HOSTNAME = process.env.HOSTNAME || '127.0.0.1';

/**
 * `postgres://user:pass@host:port/db`. The database is bound to loopback by the
 * compose file, so this is a local connection.
 */
const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgres://postgres:admin@127.0.0.1:5432/openmu';

/**
 * One account per network per day.
 *
 * This page is open to the internet with nothing in front of it, so this is the
 * only thing between it and a script. It is kept on disk rather than in memory
 * because `mu-update.sh` restarts this service on every deploy, and an
 * in-memory counter would hand out a fresh allowance each time - a limit anyone
 * could reset by waiting for a push.
 */
const RATE_LIMIT = Number(process.env.RATE_LIMIT || 1);
const RATE_WINDOW_MS = Number(
  process.env.RATE_WINDOW_MS || 24 * 60 * 60 * 1000
);

/**
 * A separate, much looser cap on *attempts* rather than successes, so a client
 * that has spent its daily account cannot sit there hammering the endpoint.
 * In memory is fine for this one: forgetting it on restart costs nothing.
 */
const BURST_LIMIT = Number(process.env.BURST_LIMIT || 20);
const BURST_WINDOW_MS = Number(process.env.BURST_WINDOW_MS || 10 * 60 * 1000);


/**
 * Origins allowed to post a signup from a browser, comma separated, matched
 * exactly. As the cash shop's, and for the same reason: the standalone page is
 * same-origin and needs none of this, but the client's login window is served
 * from the world's play host and is not.
 *
 * Exact origins only, never `*`: this endpoint writes accounts, and a wildcard
 * is an open invitation for any page anywhere to drive it.
 */
const ALLOWED_ORIGINS = new Set(
  (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean)
);

const sql = postgres(DATABASE_URL);

/** Rows outside the window prove nothing; drop them hourly. */
setInterval(
  () => forgetSignupsBefore(Date.now() - RATE_WINDOW_MS),
  60 * 60 * 1000
).unref();

/** Has this network already used its allowance for the window? */
function quotaSpent(bucket: string): boolean {
  return signupsSince(bucket, Date.now() - RATE_WINDOW_MS) >= RATE_LIMIT;
}

const bursts = new BurstLimit(BURST_LIMIT, BURST_WINDOW_MS);


/** The CORS headers for this caller, or nothing when it is same-origin. */
function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin');

  if (!origin || !ALLOWED_ORIGINS.has(origin)) return {};

  return {
    'Access-Control-Allow-Origin': origin,
    // The answer differs by origin, so a shared cache must not reuse one for
    // another.
    Vary: 'Origin',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
  async fetch(req, server) {
    const url = new URL(req.url);
    const cors = corsHeaders(req);

    if (url.pathname !== '/api/register') {
      return json({ error: 'Not found' }, 404, cors);
    }

    // The preflight a browser sends before a cross-origin POST. An origin that
    // is not on the list is refused here rather than after the work.
    if (req.method === 'OPTIONS') {
      const allowed = cors['Access-Control-Allow-Origin'] !== undefined;
      return new Response(null, { status: allowed ? 204 : 403, headers: cors });
    }

    if (req.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405, cors);
    }

    // Caddy is in front, so the socket address is always loopback - the real
    // client is in the forwarded header, which `clientIp` believes for exactly
    // that reason and no other.
    const ip = clientIp(req, server);
    const bucket = bucketFor(ip);

    if (bursts.hammering(bucket)) {
      return json({ error: 'Too many requests. Please slow down.' }, 429, cors);
    }

    // Checked before the work, so a spent quota costs a lookup rather than a
    // BCrypt round.
    if (quotaSpent(bucket)) {
      return json(
        { error: 'An account has already been created from this network today.' },
        429,
        cors
      );
    }

    let body: Record<string, unknown>;

    try {
      body = await req.json();
    } catch {
      return json({ error: 'Malformed request.' }, 400, cors);
    }

    const problem = validate(body);

    if (problem) return json({ error: problem }, 400, cors);

    try {
      const rejection = await createAccount(
        sql,
        body.username as string,
        body.password as string
      );

      if (rejection) return json({ error: rejection }, 409, cors);

      recordSignup(bucket);
      // The account exists in OpenMU's database by now, so this log lists
      // accounts that were made rather than attempts that were tried.
      recordAccount(body.username as string, bucket);
      console.log(`registered ${body.username} from ${ip}`);
      return json({ ok: true }, 200, cors);
    } catch (err) {
      // Never surface the database error itself: it would leak the schema, and
      // the player can do nothing with it either way.
      console.error('registration failed:', err);
      return json({ error: 'Registration failed. Please try again.' }, 500, cors);
    }
  },
});

console.log(`register api listening on ${HOSTNAME}:${PORT}`);
// As the cash shop's boot lines: the client's register window is refused
// without this, and the only sign of it is a CORS error in the player's
// console, which nobody is looking at.
console.info(
  `  cors            ${
    ALLOWED_ORIGINS.size ? [...ALLOWED_ORIGINS].join(', ') : 'same-origin only'
  }`
);
