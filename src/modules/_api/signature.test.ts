import { describe, expect, it } from 'vitest';
import { fromBase64Url, isFirstParty, signedText, toBase64Url } from './signature';

const entry = { id: 'example', version: '1.0.0', sha256: 'a'.repeat(64) };

/** A throwaway key pair, made in memory for the test: its public half as the build would carry it. */
async function owner() {
  const pair = (await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify'])) as CryptoKeyPair;
  const publicKey = toBase64Url(new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey)));
  const sign = async (e: typeof entry) =>
    toBase64Url(new Uint8Array(await crypto.subtle.sign('Ed25519', pair.privateKey, new TextEncoder().encode(signedText(e)))));
  return { publicKey, sign };
}

describe('signedText', () => {
  it('is id|version|sha256', () => {
    expect(signedText(entry)).toBe(`example|1.0.0|${'a'.repeat(64)}`);
  });
});

describe('base64url', () => {
  it('round trips without padding and refuses anything else', () => {
    const bytes = Uint8Array.from([251, 255, 0, 1, 2]);
    expect(toBase64Url(bytes)).toBe('-_8AAQI');
    expect(fromBase64Url('-_8AAQI')).toEqual(bytes);
    for (const bad of ['-_8AAQI=', '+/8AAQI', 'a', 'ab c']) expect(fromBase64Url(bad), bad).toBeNull();
  });
});

describe('isFirstParty', () => {
  it('holds for a module signed with the key built into the client', async () => {
    const { publicKey, sign } = await owner();
    expect(await isFirstParty({ ...entry, signature: await sign(entry) }, publicKey)).toBe(true);
  });

  it('fails when the id, the version or the hash is not the one signed', async () => {
    const { publicKey, sign } = await owner();
    const signature = await sign(entry);
    for (const changed of [{ id: 'other' }, { version: '1.0.1' }, { sha256: 'b'.repeat(64) }]) {
      expect(await isFirstParty({ ...entry, ...changed, signature }, publicKey), JSON.stringify(changed)).toBe(false);
    }
  });

  it('fails for another key, no signature, or a broken one', async () => {
    const mine = await owner();
    const theirs = await owner();
    expect(await isFirstParty({ ...entry, signature: await theirs.sign(entry) }, mine.publicKey)).toBe(false);
    expect(await isFirstParty(entry, mine.publicKey)).toBe(false);
    expect(await isFirstParty({ ...entry, signature: `${'A'.repeat(85)}w` }, mine.publicKey)).toBe(false);
  });

  it('never holds when the client was built without a key, or with one that is not a key', async () => {
    const { publicKey, sign } = await owner();
    const signed = { ...entry, signature: await sign(entry) };
    expect(await isFirstParty(signed, undefined)).toBe(false);
    expect(await isFirstParty(signed, '')).toBe(false);
    expect(await isFirstParty(signed, publicKey.slice(1))).toBe(false);
    expect(await isFirstParty(signed, 'not a key at all')).toBe(false);
  });
});
