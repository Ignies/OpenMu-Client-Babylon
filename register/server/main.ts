import postgres from 'postgres';
import bcrypt from 'bcryptjs';
import { forgetSignupsBefore, recordSignup, signupsSince } from './db';
import { BurstLimit, bucketFor, clientIp } from '../../src/common/rateLimit';

/**
 * The account-creation endpoint behind `register.ignies.net`.
 *
 * It writes straight into OpenMU's database rather than going through the game
 * server, because OpenMU has no public "create account" call — the admin panel
 * does it in-process. That makes this file the *only* thing outside OpenMU that
 * writes to `data."Account"`, so the column list below has to stay in step with
 * that table (see `docs` in README for the `\d` output it was written from).
 *
 * Listens on loopback only. Caddy publishes it under `/api` on the register
 * host, which keeps it same-origin with the form and means no CORS.
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
 * in-memory counter would hand out a fresh allowance each time — a limit anyone
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

const MIN_USERNAME_LENGTH = 4;
/** `data."Account"."LoginName"` is `varchar(10)` — longer would truncate. */
const MAX_USERNAME_LENGTH = 10;
const MIN_PASSWORD_LENGTH = 4;
const MAX_PASSWORD_LENGTH = 10;

const USERNAME_RE = /^[A-Za-z0-9]+$/;

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

/**
 * Everything the form checks, checked again. The form's copy exists to save a
 * round trip; this one is the one that counts, because anything can POST here.
 */
function validate(body: {
  username?: unknown;
  password?: unknown;
}): string | null {
  const { username, password } = body;

  if (typeof username !== 'string' || typeof password !== 'string') {
    return 'Malformed request.';
  }

  if (
    username.length < MIN_USERNAME_LENGTH ||
    username.length > MAX_USERNAME_LENGTH
  ) {
    return `ID must be ${MIN_USERNAME_LENGTH}-${MAX_USERNAME_LENGTH} characters.`;
  }

  if (!USERNAME_RE.test(username)) {
    return 'ID may contain only letters and numbers.';
  }

  if (
    password.length < MIN_PASSWORD_LENGTH ||
    password.length > MAX_PASSWORD_LENGTH
  ) {
    return `Password must be ${MIN_PASSWORD_LENGTH}-${MAX_PASSWORD_LENGTH} characters.`;
  }

  return null;
}

/**
 * OpenMU stores a bare BCrypt string — variant `2a` at cost 11, no wrapper.
 * Both are matched exactly below, because a hash OpenMU cannot verify produces
 * an account that exists but cannot log in, which is far more confusing than a
 * failed registration.
 *
 * To re-confirm this against a live server (after an OpenMU upgrade, say),
 * read the prefix off any existing account — `$2a$11$` is algorithm and cost:
 *
 *   docker exec -i database psql -U postgres -d openmu \
 *     -c 'SELECT "LoginName", left("PasswordHash", 7) FROM data."Account";'
 *
 * `left(...)` deliberately: the prefix answers the question, and the rest is
 * the hash of somebody's password and does not belong in a terminal, a log, or
 * a comment.
 */
const BCRYPT_COST = 11;
const BCRYPT_VARIANT = '$2a$';

/**
 * Async, not `hashSync`: BCrypt at cost 11 takes ~100-300 ms on a shared vCPU,
 * and the sync call would stall every other request in the process for that
 * long. `bcryptjs` chunks the async path so the loop keeps turning.
 */
async function hashPassword(password: string): Promise<string> {
  const hash = await bcrypt.hash(password, BCRYPT_COST);

  if (hash.startsWith(BCRYPT_VARIANT)) return hash;

  // Some `bcryptjs` versions emit `$2b$`. The variants differ only in how
  // passwords of 256 bytes or more are handled, and `validate` caps them at
  // ten characters — so for anything reaching here the digests are identical
  // and only the label differs. Rewrite it so what we store is byte-identical
  // to what OpenMU writes itself.
  return BCRYPT_VARIANT + hash.slice(hash.indexOf('$', 1) + 1);
}

/** Postgres `unique_violation`: the name was taken between the check and the write. */
const UNIQUE_VIOLATION = '23505';

/** Creates the account, or returns why it could not be. */
async function createAccount(
  username: string,
  password: string
): Promise<string | null> {
  const existing = await sql`
    SELECT 1 FROM data."Account" WHERE lower("LoginName") = lower(${username}) LIMIT 1
  `;

  if (existing.length > 0) return 'That ID is already taken.';

  try {
    const passwordHash = await hashPassword(password);

    // Column list mirrors every NOT NULL column on `data."Account"` that has no
    // default. `VaultId` stays null: OpenMU creates the vault storage itself on
    // first use, and inventing one here would mean writing `ItemStorage` too.
    // `EMail` is NOT NULL but the form does not ask for one, so it takes the
    // empty string.
    await sql`
      INSERT INTO data."Account" (
        "Id", "LoginName", "PasswordHash", "SecurityCode", "EMail",
        "RegistrationDate", "State", "TimeZone", "VaultPassword", "IsVaultExtended"
      ) VALUES (
        gen_random_uuid(), ${username}, ${passwordHash}, '', '',
        now(), 0, 0, '', false
      )
    `;
  } catch (err) {
    // The unique index on `LoginName` is what actually prevents duplicates: the
    // check above races, and loses to two submissions of the same name landing
    // together. The loser gets the same answer the check would have given it.
    if ((err as { code?: string }).code === UNIQUE_VIOLATION) {
      return 'That ID is already taken.';
    }

    throw err;
  }

  return null;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Bun.serve({
  port: PORT,
  hostname: HOSTNAME,
  async fetch(req, server) {
    const url = new URL(req.url);

    if (url.pathname !== '/api/register') return json({ error: 'Not found' }, 404);
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

    // Caddy is in front, so the socket address is always loopback — the real
    // client is in the forwarded header, which `clientIp` believes for exactly
    // that reason and no other.
    const ip = clientIp(req, server);
    const bucket = bucketFor(ip);

    if (bursts.hammering(bucket)) {
      return json({ error: 'Too many requests. Please slow down.' }, 429);
    }

    // Checked before the work, so a spent quota costs a lookup rather than a
    // BCrypt round.
    if (quotaSpent(bucket)) {
      return json(
        { error: 'An account has already been created from this network today.' },
        429
      );
    }

    let body: Record<string, unknown>;

    try {
      body = await req.json();
    } catch {
      return json({ error: 'Malformed request.' }, 400);
    }

    const problem = validate(body);

    if (problem) return json({ error: problem }, 400);

    try {
      const rejection = await createAccount(
        body.username as string,
        body.password as string
      );

      if (rejection) return json({ error: rejection }, 409);

      recordSignup(bucket);
      console.log(`registered ${body.username} from ${ip}`);
      return json({ ok: true });
    } catch (err) {
      // Never surface the database error itself: it would leak the schema, and
      // the player can do nothing with it either way.
      console.error('registration failed:', err);
      return json({ error: 'Registration failed. Please try again.' }, 500);
    }
  },
});

console.log(`register api listening on ${HOSTNAME}:${PORT}`);
