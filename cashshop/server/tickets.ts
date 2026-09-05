import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { loadGateConfig } from './gate';
import { SESSION_NONCE_RE } from '../../src/common/sessionNonce';

/**
 * Who is asking: the ticket that gives a shop request its account.
 *
 * The window runs inside a session the game server already authenticated.
 * The player typed a password at login and must not type it again, so the
 * shop cannot ask for one - and it cannot trust a name the browser sends,
 * because anyone can type a name. The one process that knows which account
 * owns a socket is the proxy: it reads the login off every connection, waits
 * for the game server to accept it (`proxy/presence.ts` - the client's login
 * frame alone is a claim anyone can make), and binds the result to the
 * `session` nonce the client put on the websocket URL
 * (`src/libs/sockets/createSocket.ts`). The nonce is 128 random bits chosen
 * by the page, so holding it is proof of holding the socket.
 *
 * The browser can never ask the proxy directly: the presence server is
 * loopback only and must never be published, because it answers "is this
 * account playing" to anyone who reaches it. So the exchange goes through
 * this service - the window posts its nonce, this asks the presence server
 * over loopback, and mints a ticket for the account it names. From then on
 * every request carries the ticket in its body or query string; never a
 * cookie and never a custom header, because the window fetches with
 * `credentials: 'omit'` and the CORS preflight in `main.ts` allows only
 * `Content-Type`.
 *
 * The ticket is stateless: `<account>.<expiresAtMs>.<mac>`, where the MAC is
 * HMAC-SHA256 over `${account}|${expiresAt}`. Nothing is stored, so a restart
 * of this service invalidates nothing and a verify costs one hash.
 *
 * It is enough to read with, and not enough to spend with. A ticket outlives
 * the socket, so within its ten minutes a ticket lifted from a request log
 * could still read the order tab; that is the reason the TTL is short. But an
 * order is a promise to take jewels out of the account's bag, and the gate
 * that guards that write only asks whether the account is safe to write to,
 * never whether the order was the player's - so placing or cancelling one
 * also has to prove the socket is still there and still logged in as that
 * account (`confirmLive`), and a ticket alone, however fresh, cannot.
 */

/**
 * The presence server's own rule for a login name (`ACCOUNT_RE` in
 * `proxy/presence.ts`). Letters and digits only, which is what makes the
 * ticket format unambiguous: neither the `.` that separates its three fields
 * nor the `|` under the MAC can appear in a name that passes this.
 */
const ACCOUNT_RE = /^[A-Za-z0-9]{1,10}$/;

/**
 * Ten minutes. Long enough that a browsing session rarely sees it, short
 * enough that a ticket lifted from a request log is worth little; the client
 * re-exchanges silently on a 401.
 */
export const TICKET_TTL_MS = 10 * 60 * 1000;

/** A base64url SHA-256 digest is always this long, so a MAC of any other length is malformed before it is compared. */
const MAC_LENGTH = 43;

/**
 * The signing secret. Set `CASHSHOP_TICKET_SECRET` in production: without it
 * every boot signs with a fresh random key, which is safe - nobody else holds
 * it either - but every restart logs every player out of the shop until they
 * re-exchange, and a second instance of the service could not verify the
 * first one's tickets.
 */
const SECRET: Uint8Array = (() => {
  const configured = process.env.CASHSHOP_TICKET_SECRET;

  if (configured) return new TextEncoder().encode(configured);

  console.warn(
    'cash shop: CASHSHOP_TICKET_SECRET is not set; signing tickets with a random per-boot secret, ' +
      'so every restart invalidates every ticket'
  );

  return new Uint8Array(randomBytes(32));
})();

export interface Ticket {
  ticket: string;
  account: string;
  expiresAt: number;
}

export type Verification =
  | { ok: true; account: string; expiresAt: number }
  | { ok: false; reason: 'malformed' | 'forged' | 'expired' };

/**
 * `malformed`: the nonce is not what the client mints, so nothing was asked.
 * `unknown`: the presence server has no logged-in socket under it - not yet
 * logged in, logged out, or a nonce it never saw. `unreachable`: the presence
 * server did not answer, and nothing may be decided on a guess.
 */
export type SessionFailure = 'malformed' | 'unknown' | 'unreachable';

export type Exchange =
  | { ok: true; ticket: Ticket }
  | { ok: false; reason: SessionFailure; message: string };

type Named = { ok: true; account: string } | { ok: false; reason: SessionFailure; message: string };

function sign(account: string, expiresAt: number): string {
  return createHmac('sha256', SECRET).update(`${account}|${expiresAt}`).digest('base64url');
}

/**
 * The account goes into the ticket lowercased. OpenMU's login is
 * case-insensitive (`SafetyGate.findAccount` matches on `lower()`, as the
 * game does), so "Player" and "PLAYER" are one account; the order store keys
 * on this string, and a cap counted under two spellings would be two caps.
 */
export function mintTicket(account: string, now = Date.now()): Ticket {
  if (!ACCOUNT_RE.test(account)) {
    throw new Error(`refusing to mint a ticket for "${account}"`);
  }

  const canonical = account.toLowerCase();
  const expiresAt = now + TICKET_TTL_MS;

  return {
    ticket: `${canonical}.${expiresAt}.${sign(canonical, expiresAt)}`,
    account: canonical,
    expiresAt,
  };
}

/**
 * Never throws: the caller turns a failure into a 401 and the client
 * exchanges again. The MAC comparison is constant-time so a forger learns
 * nothing from how quickly a wrong one is refused; the shape checks before
 * it only reject strings that could not have been minted here at all.
 */
export function verifyTicket(ticket: unknown, now = Date.now()): Verification {
  if (typeof ticket !== 'string') return { ok: false, reason: 'malformed' };

  const parts = ticket.split('.');

  if (parts.length !== 3) return { ok: false, reason: 'malformed' };

  const [account, expiry, mac] = parts;

  if (!ACCOUNT_RE.test(account)) return { ok: false, reason: 'malformed' };
  if (!/^\d{1,16}$/.test(expiry)) return { ok: false, reason: 'malformed' };
  if (mac.length !== MAC_LENGTH) return { ok: false, reason: 'malformed' };

  const expiresAt = Number(expiry);
  const encoder = new TextEncoder();
  const expected = encoder.encode(sign(account, expiresAt));
  const given = encoder.encode(mac);

  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    return { ok: false, reason: 'forged' };
  }

  if (expiresAt <= now) return { ok: false, reason: 'expired' };

  return { ok: true, account, expiresAt };
}

/**
 * Asks the proxy who is logged in over the socket carrying this nonce. Same
 * base URL and timeout as the safety gate's presence signal
 * (`SafetyGate.presence`), because it is the same server and a second knob
 * would only drift.
 *
 * Fails closed the way the gate does: a presence server that is down, slow
 * or answering nonsense names nobody, never a name this did not hear from it.
 */
async function whoIsOn(nonce: unknown): Promise<Named> {
  // The page's own rule for what it mints, checked before the nonce is ever
  // put in a URL.
  if (typeof nonce !== 'string' || !SESSION_NONCE_RE.test(nonce)) {
    return { ok: false, reason: 'malformed', message: 'That session is not one this shop recognises.' };
  }

  const { presenceUrl, requestTimeoutMs } = loadGateConfig();
  let answer: { account?: unknown };

  try {
    const response = await fetch(`${presenceUrl}/ticket/${nonce}`, {
      signal: AbortSignal.timeout(requestTimeoutMs),
    });

    if (response.status === 404) {
      // Bound, but not yet named: the account is only known once the game
      // server has accepted the login, and the connect-server socket never
      // sends one. The client retries after it is in the world.
      return { ok: false, reason: 'unknown', message: 'Log in to the game first.' };
    }

    if (!response.ok) {
      console.error(`ticket exchange: presence server answered HTTP ${response.status}`);
      return { ok: false, reason: 'unreachable', message: 'The shop cannot confirm who you are right now.' };
    }

    answer = (await response.json()) as { account?: unknown };
  } catch (error) {
    // `PRESENCE=off` on the proxy lands here too, as a refused connection.
    // The shop then sells to nobody, which is the intended failure.
    console.error('ticket exchange: presence server unreachable:', error instanceof Error ? error.message : error);
    return { ok: false, reason: 'unreachable', message: 'The shop cannot confirm who you are right now.' };
  }

  const account = answer.account;

  if (typeof account !== 'string' || !ACCOUNT_RE.test(account)) {
    console.error('ticket exchange: presence server named an account this refuses to sign for');
    return { ok: false, reason: 'unreachable', message: 'The shop cannot confirm who you are right now.' };
  }

  return { ok: true, account };
}

/** Turns the websocket nonce into a ticket for whoever the proxy says logged in on it. */
export async function exchangeSession(nonce: unknown): Promise<Exchange> {
  const named = await whoIsOn(nonce);

  return named.ok ? { ok: true, ticket: mintTicket(named.account) } : named;
}

export type Liveness =
  | { ok: true }
  | { ok: false; reason: SessionFailure | 'someoneElse'; message: string };

/**
 * Whether the socket behind `nonce` is, right now, logged in as the account a
 * ticket names. Asked before anything is placed or cancelled: a ticket proves
 * this service once vouched for the account, this proves the player is still
 * sitting at it. A page whose game socket dropped is told to log in again,
 * and a ticket presented with somebody else's nonce buys nothing.
 */
export async function confirmLive(nonce: unknown, account: string): Promise<Liveness> {
  const named = await whoIsOn(nonce);

  if (!named.ok) {
    return named.reason === 'unknown'
      ? { ok: false, reason: 'unknown', message: 'Your game session has ended. Log in again to buy.' }
      : named;
  }

  if (named.account.toLowerCase() !== account.toLowerCase()) {
    return { ok: false, reason: 'someoneElse', message: 'Your game session has ended. Log in again to buy.' };
  }

  return { ok: true };
}
