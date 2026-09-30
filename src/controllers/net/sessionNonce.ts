/**
 * One nonce per page load: what ties this browser's game socket to its cash
 * shop requests.
 *
 * The shop is a separate service that never sees a password. Its only proof
 * that a request comes from a player who is logged in is that the same random
 * value went out on the game socket's URL (`createSocket`, `&session=`) and
 * later arrives in `POST /api/session`: the proxy reads the login name off
 * that socket and answers `/ticket/<nonce>` with it on loopback
 * (proxy/presence.ts), and the shop signs the answer into a ticket. Whoever
 * knows the nonce can therefore act as the account in the shop, which is why
 * it is 128 bits from `crypto.getRandomValues`, chosen here and nowhere else,
 * and never written to a log or the address bar.
 *
 * Drawn on first use rather than at module load: the first caller is
 * `createSocket`, long after the page is up, and a module-scope draw would
 * also run in every test that imports a neighbour.
 */

/** 32 lowercase hex characters. The proxy binds nothing that is not this. */
export const SESSION_NONCE_RE = /^[0-9a-f]{32}$/;

let nonce: string | null = null;

export function sessionNonce(): string {
  if (nonce === null) {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    nonce = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  return nonce;
}
