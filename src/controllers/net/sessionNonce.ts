/**
 * One nonce per page load: ties this browser's game socket to its cash shop requests
 * (proxy/presence.ts). It is a credential: never log it. See readme.md.
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
