import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { SESSION_NONCE_RE } from '../../src/common/sessionNonce';

/**
 * Who is asking.
 *
 * The window runs inside a session the game server already authenticated. The
 * player typed a password at login and must not type it again, so this service
 * cannot ask for one - and it must never trust a name the browser sends,
 * because anyone can type a name. Without this the marketplace would let
 * anybody list, buy or collect a balance as anybody else.
 *
 * The one process that knows which account owns a socket is the proxy. It
 * reads the login off every connection and waits for the *game server* to
 * accept it (`proxy/presence.ts`; the client's own login frame is a claim,
 * not proof), then binds the result to the nonce the page put on the
 * websocket URL. The nonce is 128 random bits chosen by the page, so holding
 * it is proof of holding the socket.
 *
 * The browser cannot ask the proxy itself: the presence server is loopback
 * only and answers "is this account playing" to anyone who reaches it. So the
 * window posts its nonce here, this asks presence over loopback, and mints a
 * ticket for the account it names.
 *
 * A ticket reads. It is deliberately not enough to *commit* anything: it
 * outlives the socket, so one lifted from a request log would still work for
 * its ten minutes. Anything that moves goods or money asks presence again
 * (`confirmLive`) and refuses if the socket is gone or is now somebody else.
 */

/** The presence server's own rule for a login name (`ACCOUNT_RE` there). */
const ACCOUNT_RE = /^[A-Za-z0-9]{1,10}$/;

/** Short, because a ticket is a bearer token; the client re-exchanges on a 401. */
export const TICKET_TTL_MS = 10 * 60 * 1000;

/** A base64url SHA-256 digest is always this long. */
const MAC_LENGTH = 43;

const PRESENCE_URL = process.env.PRESENCE_URL ?? 'http://127.0.0.1:3001';
const PRESENCE_TIMEOUT_MS = Number(process.env.PRESENCE_TIMEOUT_MS ?? 2000);

/**
 * Set `MARKETPLACE_TICKET_SECRET` in production. Without it every restart
 * invalidates every ticket, which is survivable - clients re-exchange - but
 * it is a warning worth seeing, because it also means two processes behind a
 * load balancer would not accept each other's.
 */
const SECRET: Uint8Array = (() => {
  const configured = process.env.MARKETPLACE_TICKET_SECRET;
  if (configured) return new TextEncoder().encode(configured);
  console.warn(
    'marketplace: MARKETPLACE_TICKET_SECRET is not set; signing with a random per-boot secret, ' +
      'so every ticket is invalidated on restart.'
  );
  return new Uint8Array(randomBytes(32));
})();

export type Ticket = { ticket: string; account: string; expiresAt: number };

export type Verification =
  | { ok: true; account: string; expiresAt: number }
  | { ok: false; reason: 'malformed' | 'forged' | 'expired' };

export type SessionFailure = 'malformed' | 'unknown' | 'unreachable';

export type Exchange =
  | { ok: true; ticket: Ticket }
  | { ok: false; reason: SessionFailure; message: string };

type Named = { ok: true; account: string } | { ok: false; reason: SessionFailure; message: string };

function sign(account: string, expiresAt: number): string {
  return createHmac('sha256', SECRET).update(`${account}|${expiresAt}`).digest('base64url');
}

/**
 * Lowercased, because OpenMU's login is case-insensitive: "Player" and
 * "PLAYER" are one account, and a balance keyed under two spellings would be
 * two balances.
 */
export function mintTicket(account: string, now = Date.now()): Ticket {
  if (!ACCOUNT_RE.test(account)) throw new Error(`refusing to mint a ticket for "${account}"`);

  const canonical = account.toLowerCase();
  const expiresAt = now + TICKET_TTL_MS;
  return { ticket: `${canonical}.${expiresAt}.${sign(canonical, expiresAt)}`, account: canonical, expiresAt };
}

/**
 * Never throws; the caller turns a failure into a 401 and the client
 * exchanges again. The MAC comparison is constant-time, so a forger learns
 * nothing from how fast a wrong one is refused.
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
 * Who the proxy says is logged in on the socket carrying this nonce.
 *
 * Fails closed: a presence server that is down, slow, or answering nonsense
 * names nobody. It never returns a name it did not hear from presence.
 */
async function whoIsOn(nonce: unknown): Promise<Named> {
  if (typeof nonce !== 'string' || !SESSION_NONCE_RE.test(nonce)) {
    return { ok: false, reason: 'malformed', message: 'That session is not one the marketplace recognises.' };
  }

  let answer: { account?: unknown };
  try {
    const response = await fetch(`${PRESENCE_URL}/ticket/${nonce}`, {
      signal: AbortSignal.timeout(PRESENCE_TIMEOUT_MS),
    });

    if (response.status === 404) {
      // Bound but not yet named: the account is known only once the game
      // server has accepted the login.
      return { ok: false, reason: 'unknown', message: 'Log in to the game first.' };
    }
    if (!response.ok) {
      console.error(`marketplace: presence answered HTTP ${response.status}`);
      return { ok: false, reason: 'unreachable', message: 'Cannot confirm who you are right now.' };
    }
    answer = (await response.json()) as { account?: unknown };
  } catch (error) {
    // `PRESENCE=off` on the proxy lands here as a refused connection, and the
    // marketplace then serves nobody, which is the intended failure.
    console.error('marketplace: presence unreachable:', error instanceof Error ? error.message : error);
    return { ok: false, reason: 'unreachable', message: 'Cannot confirm who you are right now.' };
  }

  const account = answer.account;
  if (typeof account !== 'string' || !ACCOUNT_RE.test(account)) {
    console.error('marketplace: presence named an account this refuses to sign for');
    return { ok: false, reason: 'unreachable', message: 'Cannot confirm who you are right now.' };
  }

  return { ok: true, account };
}

/** Turns the websocket nonce into a ticket for whoever the proxy says is on it. */
export async function exchangeSession(nonce: unknown): Promise<Exchange> {
  const named = await whoIsOn(nonce);
  return named.ok ? { ok: true, ticket: mintTicket(named.account) } : named;
}

export type Liveness =
  | { ok: true }
  | { ok: false; reason: SessionFailure | 'someoneElse'; message: string };

/**
 * Whether the socket behind `nonce` is, right now, logged in as the account
 * the ticket names. Asked before anything commits: the ticket proves this
 * service once vouched for the account, this proves the player is still
 * sitting at it. A ticket presented with somebody else's nonce buys nothing.
 */
export async function confirmLive(nonce: unknown, account: string): Promise<Liveness> {
  const named = await whoIsOn(nonce);

  if (!named.ok) {
    return named.reason === 'unknown'
      ? { ok: false, reason: 'unknown', message: 'Your game session has ended. Log in again.' }
      : named;
  }
  if (named.account.toLowerCase() !== account.toLowerCase()) {
    return { ok: false, reason: 'someoneElse', message: 'Your game session has ended. Log in again.' };
  }

  return { ok: true };
}
