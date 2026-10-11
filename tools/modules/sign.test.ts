import { describe, expect, it } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { describeModule, insideRepo, publicKeyOf, signModule } from './sign';
import { isFirstParty } from '../../src/modules/_api/signature';
import { sha256Hex } from '../../src/modules/_api/download';

/** A throwaway private key, in memory only. */
const pem = () => generateKeyPairSync('ed25519').privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
const bytes = new TextEncoder().encode('export default {};');

describe('signModule', () => {
  it('signs what the client checks: id|version|sha256, with the key whose public half the build carries', async () => {
    const key = pem();
    const { sha256, signature } = signModule(key, { id: 'example', version: '1.0.0' }, bytes);
    expect(sha256).toBe(await sha256Hex(bytes));
    expect(await isFirstParty({ id: 'example', version: '1.0.0', sha256, signature }, publicKeyOf(key))).toBe(true);
    expect(await isFirstParty({ id: 'example', version: '1.0.1', sha256, signature }, publicKeyOf(key))).toBe(false);
    expect(await isFirstParty({ id: 'example', version: '1.0.0', sha256, signature }, publicKeyOf(pem()))).toBe(false);
  });

  it('gives the public key as 32 raw bytes in base64url', () => {
    expect(publicKeyOf(pem())).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('refuses a key that is not ed25519', () => {
    const rsa = generateKeyPairSync('rsa', { modulusLength: 1024 }).privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
    expect(() => signModule(rsa, { id: 'example', version: '1.0.0' }, bytes)).toThrow('ed25519');
  });
});

describe('describeModule', () => {
  it('writes the description the installer reads next to the module', () => {
    const key = pem();
    const d = describeModule(key, { id: 'example', version: '1.0.0', api: '^1.1' }, bytes);
    expect(Object.keys(d)).toEqual(['id', 'version', 'api', 'signature']);
    expect(d.signature).toBe(signModule(key, { id: 'example', version: '1.0.0' }, bytes).signature);
  });

  it('refuses a bad id or version', () => {
    expect(() => describeModule(pem(), { id: 'Bad', version: '1.0.0', api: '^1.1' }, bytes)).toThrow('id');
    expect(() => describeModule(pem(), { id: 'ok', version: '1.0', api: '^1.1' }, bytes)).toThrow('version');
  });
});

describe('insideRepo', () => {
  it('keeps keys out of the repository', () => {
    expect(insideRepo(resolve(import.meta.dirname, 'owner.pem'))).toBe(true);
    expect(insideRepo(resolve(import.meta.dirname, '../../owner.pem'))).toBe(true);
    expect(insideRepo(join(tmpdir(), 'owner.pem'))).toBe(false);
  });
});
