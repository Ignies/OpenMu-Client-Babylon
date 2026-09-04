import { describe, expect, it } from 'vitest';
import { ConnectionPresence, lookup, onlineAccounts, unidentifiedConnections } from './presence';
import { SimpleModulusEncryptor, SimpleModulusKeys } from '../src/common/encryption/simpleModulus';
import { Xor32Encryptor } from '../src/common/encryption/xor32';
import { Xor3Byte } from '../src/common/encryption/xor3';
import { stringToBytes } from '../src/common/wireUtils';
import { gameVersion } from '../versions/season6';

/**
 * The sniffer is only worth anything if it reads a frame the real client
 * produced, so every frame here is built by the client's own encoders, in the
 * order `Store.sendToGS` applies them: Xor32 over everything, then
 * SimpleModulus for headers >= 0xC3.
 */
function clientEncryptor(): SimpleModulusEncryptor {
  const encryptor = new SimpleModulusEncryptor();
  encryptor.encryptionKeys = SimpleModulusKeys.CreateEncryptionKeys([
    ...gameVersion.protocol.encryption.clientToServer,
  ]);
  return encryptor;
}

/** `Store.loginRequest`: Xor3 over the zero-padded name and password. */
function loginFrame(encryptor: SimpleModulusEncryptor, xor32: Xor32Encryptor, name: string): Uint8Array {
  const packet = new Uint8Array(50);
  packet[0] = 0xc3;
  packet[1] = 50;
  packet[2] = 0xf1;
  packet[3] = 0x01;

  const username = stringToBytes(name, 10);
  Xor3Byte(username);
  packet.set(username, 4);

  const password = stringToBytes('secret', 10);
  Xor3Byte(password);
  packet.set(password, 14);

  packet.set(stringToBytes('10404', 5), 28);
  packet.set(stringToBytes('k1Pk2jcET48mxL3b', 16), 33);

  return encryptor.Encrypt(xor32.Encrypt(packet));
}

/** Any other C3 the client might send first, so the packet counter has to line up. */
function otherFrame(encryptor: SimpleModulusEncryptor, xor32: Xor32Encryptor): Uint8Array {
  const packet = new Uint8Array([0xc3, 0x05, 0xf3, 0x00, 0x00]);
  return encryptor.Encrypt(xor32.Encrypt(packet));
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, part) => n + part.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

describe('login sniffing', () => {
  it('reads the account name out of an encrypted login frame', () => {
    const connection = new ConnectionPresence();
    const frame = loginFrame(clientEncryptor(), new Xor32Encryptor(), 'testuser');

    expect(connection.feed(frame)).toBe('testuser');
    expect(connection.loginName).toBe('testuser');

    connection.close();
  });

  it('does not modify the bytes it is handed', () => {
    const connection = new ConnectionPresence();
    const frame = loginFrame(clientEncryptor(), new Xor32Encryptor(), 'copytest');
    const untouched = frame.slice();

    connection.feed(frame);

    expect(frame).toEqual(untouched);

    connection.close();
  });

  it('reassembles a login split across websocket messages', () => {
    const connection = new ConnectionPresence();
    const frame = loginFrame(clientEncryptor(), new Xor32Encryptor(), 'splituser');

    let found: string | null = null;
    for (let i = 0; i < frame.length; i++) {
      found = connection.feed(frame.subarray(i, i + 1)) ?? found;
    }

    expect(found).toBe('splituser');

    connection.close();
  });

  it('keeps the packet counter in step across earlier frames', () => {
    const encryptor = clientEncryptor();
    const xor32 = new Xor32Encryptor();
    const connection = new ConnectionPresence();

    const stream = concat(
      otherFrame(encryptor, xor32),
      otherFrame(encryptor, xor32),
      loginFrame(encryptor, xor32, 'thirduser')
    );

    expect(connection.feed(stream)).toBe('thirduser');

    connection.close();
  });

  it('finds nothing in a stream that never logs in', () => {
    const encryptor = clientEncryptor();
    const xor32 = new Xor32Encryptor();
    const connection = new ConnectionPresence();

    expect(connection.feed(otherFrame(encryptor, xor32))).toBeNull();
    expect(connection.loginName).toBeNull();

    connection.close();
  });

  it('survives garbage without throwing', () => {
    const connection = new ConnectionPresence();
    const noise = new Uint8Array(256);
    for (let i = 0; i < noise.length; i++) noise[i] = (i * 37) & 0xff;

    expect(() => connection.feed(noise)).not.toThrow();
    expect(connection.loginName).toBeNull();

    connection.close();
  });
});

describe('failing closed', () => {
  it('flags a socket that spoke encrypted but never named itself', () => {
    const encryptor = clientEncryptor();
    const xor32 = new Xor32Encryptor();
    const connection = new ConnectionPresence();

    expect(unidentifiedConnections()).toBe(0);

    // A C3 frame that is not a login. The stream is readable, but until a
    // login arrives this socket could belong to anyone.
    connection.feed(otherFrame(encryptor, xor32));

    expect(connection.unidentified).toBe(true);
    expect(unidentifiedConnections()).toBe(1);
    // Every account reads as unsafe while it is open, not just some.
    expect(lookup('someoneelse').unidentifiedConnections).toBe(1);

    connection.close();
    expect(unidentifiedConnections()).toBe(0);
  });

  it('does not flag a connect-server socket, which is C1 throughout', () => {
    const connection = new ConnectionPresence();

    connection.feed(new Uint8Array([0xc1, 0x04, 0xf4, 0x06]));

    expect(connection.unidentified).toBe(false);
    expect(unidentifiedConnections()).toBe(0);

    connection.close();
  });

  it('stops flagging a socket once it names itself', () => {
    const encryptor = clientEncryptor();
    const xor32 = new Xor32Encryptor();
    const connection = new ConnectionPresence();

    connection.feed(otherFrame(encryptor, xor32));
    expect(unidentifiedConnections()).toBe(1);

    connection.feed(loginFrame(encryptor, xor32, 'namedlater'));
    expect(unidentifiedConnections()).toBe(0);
    expect(lookup('namedlater').online).toBe(true);

    connection.close();
  });
});

describe('the registry', () => {
  it('reports an account online while its socket is open, offline after', () => {
    const connection = new ConnectionPresence();
    connection.feed(loginFrame(clientEncryptor(), new Xor32Encryptor(), 'regtest'));

    const online = lookup('regtest');
    expect(online.online).toBe(true);
    expect(online.connections).toBe(1);
    expect(onlineAccounts()).toContain('regtest');

    connection.close();

    const offline = lookup('regtest');
    expect(offline.online).toBe(false);
    expect(offline.connections).toBe(0);
    expect(offline.lastSeenAt).toBeGreaterThan(0);
    expect(onlineAccounts()).not.toContain('regtest');
  });

  it('counts two sockets for the same account, and matches case-insensitively', () => {
    const first = new ConnectionPresence();
    const second = new ConnectionPresence();

    first.feed(loginFrame(clientEncryptor(), new Xor32Encryptor(), 'twice'));
    second.feed(loginFrame(clientEncryptor(), new Xor32Encryptor(), 'TWICE'));

    expect(lookup('twice').connections).toBe(2);
    expect(lookup('Twice').online).toBe(true);

    first.close();
    expect(lookup('twice').online).toBe(true);

    second.close();
    expect(lookup('twice').online).toBe(false);
  });

  it('has never seen an account nobody logged in as', () => {
    const answer = lookup('nobody');

    expect(answer.online).toBe(false);
    expect(answer.lastSeenAt).toBeNull();
    expect(answer.startedAt).toBeGreaterThan(0);
  });
});
