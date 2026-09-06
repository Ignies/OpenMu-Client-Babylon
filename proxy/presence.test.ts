import { describe, expect, it } from 'vitest';
import {
  ConnectionPresence,
  handlePresenceRequest,
  lookup,
  onlineAccounts,
  sessionAccount,
  unidentifiedConnections,
} from './presence';
import { SimpleModulusEncryptor, SimpleModulusKeys } from '../src/common/encryption/simpleModulus';
import { Xor32Encryptor } from '../src/common/encryption/xor32';
import { Xor3Byte } from '../src/common/encryption/xor3';
import { stringToBytes } from '../src/common/wireUtils';
import { SESSION_NONCE_RE, sessionNonce } from '../src/common/sessionNonce';
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

/**
 * The game server's answer, in the clear: `LoginResponse` is C1 F1 01 with
 * the `LoginResponseLoginResultEnum` value last. Only `Okay` (1) names a
 * socket.
 */
const LOGIN_OKAY = new Uint8Array([0xc1, 0x05, 0xf1, 0x01, 0x01]);
const LOGIN_WRONG_PASSWORD = new Uint8Array([0xc1, 0x05, 0xf1, 0x01, 0x00]);
const LOGIN_ALREADY_CONNECTED = new Uint8Array([0xc1, 0x05, 0xf1, 0x01, 0x03]);

/** What a fresh page load produces: a login frame both ways, accepted. */
function loggedIn(connection: ConnectionPresence, name: string): void {
  connection.feed(loginFrame(clientEncryptor(), new Xor32Encryptor(), name));
  connection.feedFromServer(LOGIN_OKAY);
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
  it('reads the claimed name out of an encrypted login frame, and names nobody until the server agrees', () => {
    const connection = new ConnectionPresence();
    const frame = loginFrame(clientEncryptor(), new Xor32Encryptor(), 'testuser');

    expect(connection.feed(frame)).toBe('testuser');
    expect(connection.loginName).toBeNull();
    expect(lookup('testuser').online).toBe(false);

    expect(connection.feedFromServer(LOGIN_OKAY)).toBe('testuser');
    expect(connection.loginName).toBe('testuser');
    expect(lookup('testuser').online).toBe(true);

    connection.close();
  });

  it('does not modify the bytes it is handed', () => {
    const connection = new ConnectionPresence();
    const frame = loginFrame(clientEncryptor(), new Xor32Encryptor(), 'copytest');
    const untouched = frame.slice();
    const answer = LOGIN_OKAY.slice();

    connection.feed(frame);
    connection.feedFromServer(answer);

    expect(frame).toEqual(untouched);
    expect(answer).toEqual(LOGIN_OKAY);

    connection.close();
  });

  it('reassembles a login split across websocket messages, in both directions', () => {
    const connection = new ConnectionPresence();
    const frame = loginFrame(clientEncryptor(), new Xor32Encryptor(), 'splituser');

    let claimed: string | null = null;
    for (let i = 0; i < frame.length; i++) {
      claimed = connection.feed(frame.subarray(i, i + 1)) ?? claimed;
    }

    expect(claimed).toBe('splituser');

    let confirmed: string | null = null;
    for (let i = 0; i < LOGIN_OKAY.length; i++) {
      confirmed = connection.feedFromServer(LOGIN_OKAY.subarray(i, i + 1)) ?? confirmed;
    }

    expect(confirmed).toBe('splituser');
    expect(connection.loginName).toBe('splituser');

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

  it('finds the answer among other server frames, encrypted ones included', () => {
    const connection = new ConnectionPresence();
    connection.feed(loginFrame(clientEncryptor(), new Xor32Encryptor(), 'busyuser'));

    // A C3 the server sent first (its payload is opaque here; only the
    // header is read, to step over it), then the answer, then more.
    const encrypted = new Uint8Array([0xc3, 0x07, 0x11, 0x22, 0x33, 0x44, 0x55]);
    const later = new Uint8Array([0xc1, 0x04, 0xf3, 0x00]);

    expect(connection.feedFromServer(concat(encrypted, LOGIN_OKAY, later))).toBe('busyuser');

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
    expect(() => connection.feedFromServer(noise)).not.toThrow();
    expect(connection.loginName).toBeNull();

    connection.close();
  });
});

/**
 * The client's login frame is a claim. Anyone who can open a socket through
 * the proxy can put any account name in one, so what names a socket is the
 * game server's answer, never the frame.
 */
describe('the server has the last word', () => {
  it('names nobody when the server refuses the login', () => {
    const connection = new ConnectionPresence();

    connection.feed(loginFrame(clientEncryptor(), new Xor32Encryptor(), 'victim'));
    expect(connection.feedFromServer(LOGIN_WRONG_PASSWORD)).toBeNull();

    expect(connection.loginName).toBeNull();
    expect(lookup('victim').online).toBe(false);
    expect(onlineAccounts()).not.toContain('victim');

    connection.close();
  });

  it('names nobody on an Okay that no login frame preceded', () => {
    const connection = new ConnectionPresence();

    expect(connection.feedFromServer(LOGIN_OKAY)).toBeNull();
    expect(connection.loginName).toBeNull();

    connection.close();
  });

  it('does not let a refused claim ride on a later accepted one', () => {
    const encryptor = clientEncryptor();
    const xor32 = new Xor32Encryptor();
    const connection = new ConnectionPresence();

    connection.feed(loginFrame(encryptor, xor32, 'victim'));
    connection.feedFromServer(LOGIN_WRONG_PASSWORD);

    connection.feed(loginFrame(encryptor, xor32, 'ownacct'));
    expect(connection.feedFromServer(LOGIN_OKAY)).toBe('ownacct');

    expect(connection.loginName).toBe('ownacct');
    expect(lookup('victim').online).toBe(false);
    expect(lookup('ownacct').online).toBe(true);

    connection.close();
  });

  it('treats every non-Okay result as a refusal', () => {
    const connection = new ConnectionPresence();

    connection.feed(loginFrame(clientEncryptor(), new Xor32Encryptor(), 'elsewhere'));
    connection.feedFromServer(LOGIN_ALREADY_CONNECTED);

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

  it('keeps flagging a socket whose login the server has not answered', () => {
    const connection = new ConnectionPresence();

    connection.feed(loginFrame(clientEncryptor(), new Xor32Encryptor(), 'inflight'));

    expect(connection.unidentified).toBe(true);
    expect(unidentifiedConnections()).toBe(1);

    connection.feedFromServer(LOGIN_OKAY);

    expect(connection.unidentified).toBe(false);
    expect(unidentifiedConnections()).toBe(0);

    connection.close();
  });

  it('stops flagging a socket whose login the server refused: it is known to be nobody', () => {
    const connection = new ConnectionPresence();

    connection.feed(loginFrame(clientEncryptor(), new Xor32Encryptor(), 'refusedone'));
    connection.feedFromServer(LOGIN_WRONG_PASSWORD);

    expect(connection.unidentified).toBe(false);
    expect(unidentifiedConnections()).toBe(0);

    // Until it tries again.
    connection.feed(loginFrame(clientEncryptor(), new Xor32Encryptor(), 'refusedone'));
    expect(connection.unidentified).toBe(true);

    connection.close();
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
    connection.feedFromServer(LOGIN_OKAY);
    expect(unidentifiedConnections()).toBe(0);
    expect(lookup('namedlater').online).toBe(true);

    connection.close();
  });
});

describe('the registry', () => {
  it('reports an account online while its socket is open, offline after', () => {
    const connection = new ConnectionPresence();
    loggedIn(connection, 'regtest');

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

    loggedIn(first, 'twice');
    loggedIn(second, 'TWICE');

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

/**
 * The ticket route is what the cash shop asks to put an account to a page,
 * so it is exercised through `handlePresenceRequest` - the same function the
 * loopback server serves - rather than through the registry alone.
 */
describe('the session ticket', () => {
  /** Nonces are module-level keys shared by every test here, so each test gets its own. */
  const nonceOf = (letter: string) => letter.repeat(32);

  function ticket(nonce: string): Response {
    return handlePresenceRequest(new Request(`http://presence.local/ticket/${nonce}`));
  }

  /** What the connect server hears: a C1 frame, never a login. */
  const CONNECT_SERVER_FRAME = new Uint8Array([0xc1, 0x04, 0xf4, 0x06]);

  it('answers 404 for a nonce no socket carried', async () => {
    const response = ticket(nonceOf('0'));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Not found' });
  });

  it('names the account once the server accepts the login, and forgets it on close', async () => {
    const nonce = nonceOf('a');
    const connection = new ConnectionPresence(nonce);

    // Bound but nameless: the account is only resolved by the login.
    expect(ticket(nonce).status).toBe(404);
    expect(sessionAccount(nonce)).toBeNull();

    connection.feed(loginFrame(clientEncryptor(), new Xor32Encryptor(), 'ticketuser'));

    // The claim alone is not enough.
    expect(ticket(nonce).status).toBe(404);

    connection.feedFromServer(LOGIN_OKAY);

    const named = ticket(nonce);
    expect(named.status).toBe(200);
    expect(await named.json()).toEqual({ account: 'ticketuser' });

    connection.close();

    expect(ticket(nonce).status).toBe(404);
    expect(sessionAccount(nonce)).toBeNull();
  });

  it('mints nothing for a login the server refused - the attack this route must not allow', async () => {
    const nonce = nonceOf('b');
    const attacker = new ConnectionPresence(nonce);

    // Anyone can send a login frame naming anyone. Only the server's answer
    // counts, and a wrong password gets a refusal.
    attacker.feed(loginFrame(clientEncryptor(), new Xor32Encryptor(), 'victim'));
    attacker.feedFromServer(LOGIN_WRONG_PASSWORD);

    expect(ticket(nonce).status).toBe(404);
    expect(sessionAccount(nonce)).toBeNull();

    attacker.close();
  });

  it('binds nothing to a malformed nonce, and still counts the socket as present', () => {
    const uppercase = 'A'.repeat(32);
    const short = 'abc';
    const first = new ConnectionPresence(uppercase);
    const second = new ConnectionPresence(short);

    loggedIn(first, 'badnonce');
    loggedIn(second, 'shortnonce');

    expect(sessionAccount(uppercase)).toBeNull();
    expect(sessionAccount(short)).toBeNull();
    expect(ticket(uppercase).status).toBe(404);
    expect(ticket(short).status).toBe(404);

    // The game must work with a broken shop: the login still registers.
    expect(lookup('badnonce').online).toBe(true);
    expect(lookup('shortnonce').online).toBe(true);

    first.close();
    second.close();
  });

  it('is not shadowed by the connect-server socket sharing the nonce', async () => {
    const nonce = nonceOf('c');

    // The order a page load produces: the connect-server socket first, C1
    // throughout, then the game-server socket carrying the login.
    const connectServer = new ConnectionPresence(nonce);
    connectServer.feed(CONNECT_SERVER_FRAME);

    expect(ticket(nonce).status).toBe(404);

    const gameServer = new ConnectionPresence(nonce);
    loggedIn(gameServer, 'sharedcs');

    expect(await ticket(nonce).json()).toEqual({ account: 'sharedcs' });

    // A fallback retry socket joining later changes nothing either way.
    const retry = new ConnectionPresence(nonce);
    expect(await ticket(nonce).json()).toEqual({ account: 'sharedcs' });

    connectServer.close();
    retry.close();
    expect(await ticket(nonce).json()).toEqual({ account: 'sharedcs' });

    gameServer.close();
    expect(ticket(nonce).status).toBe(404);
  });

  it('accepts the nonce the client actually sends', () => {
    expect(sessionNonce()).toMatch(SESSION_NONCE_RE);
    // One per page load: a second read is the same value.
    expect(sessionNonce()).toBe(sessionNonce());
  });

  it('leaves the presence routes as they were', async () => {
    const overview = handlePresenceRequest(new Request('http://presence.local/presence'));
    expect(overview.status).toBe(200);
    expect(await overview.json()).toMatchObject({ online: expect.any(Array) });

    expect(handlePresenceRequest(new Request('http://presence.local/presence/routetest')).status).toBe(200);
    expect(handlePresenceRequest(new Request('http://presence.local/presence/not%20a%20name')).status).toBe(400);
    expect(handlePresenceRequest(new Request('http://presence.local/elsewhere')).status).toBe(404);
    expect(handlePresenceRequest(new Request('http://presence.local/presence', { method: 'POST' })).status).toBe(405);
  });
});
