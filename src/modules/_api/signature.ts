// First party (readme.md, "Streaming"): a module signed with the owner's ed25519 key, whose public half
// the build carries (`VITE_MODULE_SIGNING_KEY`). Checked with WebCrypto; no key built in, no first party.

/** What the owner signs (`tools/modules/sign.ts`): the id, the version and the file's hash. */
export const signedText = ({ id, version, sha256 }: { id: string; version: string; sha256: string }): string =>
  `${id}|${version}|${sha256}`;

const BASE64URL = /^[A-Za-z0-9_-]*$/;

export function toBase64Url(bytes: Uint8Array): string {
  let text = '';
  for (const b of bytes) text += String.fromCharCode(b);
  return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Unpadded base64url, or null. */
export function fromBase64Url(text: string): Uint8Array | null {
  if (!BASE64URL.test(text) || text.length % 4 === 1) return null;
  try {
    return Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  } catch {
    return null;
  }
}

/** The owner's public key this client was built with: 32 raw bytes in base64url, or nothing. */
export const MODULE_SIGNING_KEY: string | undefined = import.meta.env?.VITE_MODULE_SIGNING_KEY || undefined;

/**
 * Whether the entry is first party: its `signature` is the owner's over `id|version|sha256`. The hash
 * is checked against the bytes before anything loads, so the signature covers the file too. False
 * without a key, with a key that is not 32 bytes, or where the browser has no ed25519.
 */
export async function isFirstParty(
  entry: { id: string; version: string; sha256: string; signature?: string },
  publicKey: string | undefined = MODULE_SIGNING_KEY
): Promise<boolean> {
  const raw = publicKey ? fromBase64Url(publicKey) : null;
  const signature = entry.signature ? fromBase64Url(entry.signature) : null;
  if (raw?.length !== 32 || signature?.length !== 64) return false;
  try {
    const key = await crypto.subtle.importKey('raw', raw, { name: 'Ed25519' }, false, ['verify']);
    return await crypto.subtle.verify('Ed25519', key, signature, new TextEncoder().encode(signedText(entry)));
  } catch {
    return false;
  }
}
