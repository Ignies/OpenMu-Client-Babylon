import { describe, expect, it } from 'vitest';
import { BotCrypto, FrameReader, codeOf } from './wire';
import {
  SimpleModulusDecryptor,
  SimpleModulusEncryptor,
} from '../../src/common/encryption/simpleModulus';
import { Xor32Decryptor } from '../../src/common/encryption/xor32';

/**
 * The server's side of each direction.
 *
 * Encryption and decryption key lists are derived *pairs*, not the same
 * numbers: `CreateDecryptionKeys(clientToServer)` does not reverse
 * `CreateEncryptionKeys(clientToServer)`. The server's halves are exactly the
 * two constructor defaults, which is the same reasoning `proxy/presence.ts`
 * relies on to read a login frame.
 */
const serverSideDecryptor = () => new SimpleModulusDecryptor();
const serverSideEncryptor = () => new SimpleModulusEncryptor();

const plain = () => new Uint8Array([0xc1, 0x04, 0xf3, 0x00]);
const encrypted = () => new Uint8Array([0xc3, 0x05, 0xf3, 0x00, 0x07]);

describe('BotCrypto', () => {
  it('encrypts an outgoing C3 the way the game server reads it', () => {
    const crypto = new BotCrypto();
    const wire = crypto.encrypt(encrypted());

    // The server reverses SimpleModulus first, then Xor32.
    const [ok, unmodulus] = serverSideDecryptor().Decrypt(wire);
    expect(ok).toBe(true);
    const [, recovered] = new Xor32Decryptor().Decrypt(unmodulus);

    expect(Array.from(recovered)).toEqual(Array.from(encrypted()));
  });

  it('leaves a plain C1 unencrypted but still Xor32s the body', () => {
    const wire = new BotCrypto().encrypt(plain());
    expect(wire[0]).toBe(0xc1);
    const [, recovered] = new Xor32Decryptor().Decrypt(wire.slice());
    expect(Array.from(recovered)).toEqual(Array.from(plain()));
  });

  it('decrypts an incoming C3 built with the server-to-client keys', () => {
    const body = new Uint8Array([0xc3, 0x06, 0xf3, 0x03, 0x01, 0x02]);
    const wire = serverSideEncryptor().Encrypt(body.slice());

    const decrypted = new BotCrypto().decrypt(wire);
    expect(decrypted).not.toBeNull();
    expect(Array.from(decrypted!.subarray(2, 6))).toEqual([0xf3, 0x03, 0x01, 0x02]);
  });

  it('returns null rather than throwing on an undecryptable frame', () => {
    const junk = new Uint8Array(16).fill(0xab);
    junk[0] = 0xc3;
    junk[1] = 16;
    expect(new BotCrypto().decrypt(junk)).toBeNull();
  });

  it('passes an incoming plain frame straight through', () => {
    const wire = plain();
    expect(new BotCrypto().decrypt(wire)).toBe(wire);
  });
});

describe('FrameReader', () => {
  it('reassembles a frame split across chunks', () => {
    const reader = new FrameReader();
    reader.push(new Uint8Array([0xc1, 0x05, 0xf1]));
    expect([...reader.frames()]).toEqual([]);

    reader.push(new Uint8Array([0x01, 0x01]));
    const frames = [...reader.frames()];
    expect(frames).toHaveLength(1);
    expect(Array.from(frames[0])).toEqual([0xc1, 0x05, 0xf1, 0x01, 0x01]);
  });

  it('splits several frames delivered in one chunk', () => {
    const reader = new FrameReader();
    reader.push(new Uint8Array([0xc1, 0x04, 0xf3, 0x00, 0xc1, 0x04, 0xf3, 0x01]));
    const frames = [...reader.frames()];
    expect(frames.map(f => f[3])).toEqual([0x00, 0x01]);
  });

  it('reads a C2 two-byte length', () => {
    const body = new Uint8Array(300);
    body[0] = 0xc2;
    body[1] = 300 >> 8;
    body[2] = 300 & 0xff;
    body[3] = 0xf3;
    const reader = new FrameReader();
    reader.push(body);
    expect([...reader.frames()]).toHaveLength(1);
  });

  it('resyncs past a byte that is not a header instead of jamming', () => {
    const reader = new FrameReader();
    reader.push(new Uint8Array([0x00, 0xff, 0xc1, 0x04, 0xf3, 0x09]));
    const frames = [...reader.frames()];
    expect(frames).toHaveLength(1);
    expect(frames[0][3]).toBe(0x09);
  });

  it('keeps a partial frame for the next chunk', () => {
    const reader = new FrameReader();
    reader.push(new Uint8Array([0xc1, 0x08, 0xf3]));
    expect([...reader.frames()]).toEqual([]);
    reader.push(new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04]));
    expect([...reader.frames()]).toHaveLength(1);
  });
});

describe('codeOf', () => {
  it('reads code and sub-code from a C1 frame', () => {
    expect(codeOf(new Uint8Array([0xc1, 0x05, 0xf1, 0x01, 0x01]))).toEqual({
      code: 0xf1,
      sub: 0x01,
    });
  });

  it('reads them past the two-byte length of a C2 frame', () => {
    expect(codeOf(new Uint8Array([0xc2, 0x00, 0x06, 0xf3, 0x03, 0x00]))).toEqual({
      code: 0xf3,
      sub: 0x03,
    });
  });
});
