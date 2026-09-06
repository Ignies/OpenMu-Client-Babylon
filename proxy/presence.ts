import { SimpleModulusDecryptor } from "../src/common/encryption/simpleModulus";
import { Xor32Decryptor } from "../src/common/encryption/xor32";
import { Xor3Byte } from "../src/common/encryption/xor3";
import { getPacketSize, getSizeOfPacketType } from "../src/common/wireUtils";
import { SESSION_NONCE_RE } from "../src/common/sessionNonce";

/**
 * Who is connected right now, answered on loopback.
 *
 * OpenMU keeps login state in memory only (`LoginServer.cs` is a plain
 * `Dictionary<string, byte>`), so nothing in its database says who is playing.
 * The proxy is the one process that knows: every browser client reaches the
 * game server through it, so a live websocket *is* a live session.
 *
 * The cash shop's safety gate asks this before writing to an account, because
 * writing to one that is loaded in the game server's memory either dupes the
 * jewels it spends or corrupts the inventory slot it writes. This is only
 * authoritative while the game server's TCP port is unreachable from outside -
 * a player on the original .exe would bypass the proxy entirely - which is why
 * the gate probes that port itself rather than trusting the answer here alone.
 *
 * Keys are Season 6's. A version with different SimpleModulus keys would
 * decode nothing here and every account would read as offline, so the gate
 * treats "no login ever seen on a live socket" as a reason to refuse rather
 * than a reason to proceed.
 *
 * A socket is named by the game server, not by the client. The login frame
 * the client sends is a claim - anyone can put any name in one - so it is
 * only held as pending until the server's `LoginResponse` comes back the
 * other way, and only an Okay turns it into this connection's account. A
 * wrong password, an unknown account, a full server: the claim is dropped
 * and the socket stays nameless. That is the whole reason the sniffer reads
 * both directions.
 *
 * `/ticket/<nonce>` is strictly more sensitive than `/presence/<account>`.
 * Presence says whether a name is playing, which anyone standing next to the
 * player could tell. The ticket route turns a nonce the browser chose for
 * itself (src/common/sessionNonce.ts, sent on the socket URL by
 * `createSocket`) into the account that logged in over it, and the cash shop
 * signs that answer into a bearer ticket: whoever can reach this server with
 * a nonce in hand is that account in the shop. Loopback-only is not tidiness
 * for that route, it is the whole authentication.
 */

const PRESENCE_ENABLED = (process.env.PRESENCE ?? "on") !== "off";
/** Where the loopback server binds; exported so the relay can refuse to dial it. */
export const PRESENCE_PORT = Number(process.env.PRESENCE_PORT ?? 3001);
export const PRESENCE_HOST = process.env.PRESENCE_HOST ?? "127.0.0.1";

/**
 * How much client-to-server traffic to decrypt before giving up on finding a
 * login. The connect-server socket never carries one, and a game-server socket
 * sends it within the first few frames, so this only bounds the pathological
 * case.
 */
const MAX_SNIFF_BYTES = Number(process.env.PRESENCE_SNIFF_LIMIT ?? 65536);

/**
 * `LoginShortPassword` / `LoginLongPassword`: C3, code 0xF1, sub 0x01. The
 * server's `LoginResponse` answers with the same code and sub-code on a C1,
 * which is never encrypted in either direction, so reading it needs no key.
 */
const LOGIN_CODE = 0xf1;
const LOGIN_SUB_CODE = 0x01;
/** `LoginResponseLoginResultEnum.Okay`; every other value is a refusal. */
const LOGIN_OKAY = 0x01;
/** `[C1, 05, F1, 01, result]`. */
const LOGIN_RESPONSE_LENGTH = 5;
/** `setUsername` writes 10 bytes at offset 4, Xor3-encoded over the padding too. */
const NAME_OFFSET = 4;
const NAME_LENGTH = 10;

const HEADERS = new Set([0xc1, 0xc2, 0xc3, 0xc4]);

/** Matches register's rule for what a login name may contain. */
const ACCOUNT_RE = /^[A-Za-z0-9]{1,10}$/;

const startedAt = Date.now();

/** account (lowercased) -> the sockets currently logged in as it. */
const live = new Map<string, Set<ConnectionPresence>>();
/** account (lowercased) -> when its last socket went away. */
const lastSeen = new Map<string, number>();
/** Every open connection, named or not. */
const open = new Set<ConnectionPresence>();
/**
 * session nonce -> every socket that carried it. A Set, not one connection:
 * `createSocket` runs at least twice per page load (`src/store.ts`
 * `connectToConnectServer` and `connectToGameServer`, then again on the
 * fallback retry), every one of those sockets carries the same nonce, and
 * only the game-server socket ever sends a login. Keeping the last to arrive
 * would let the connect-server socket shadow it and answer 404 forever.
 */
const bySession = new Map<string, Set<ConnectionPresence>>();

export interface PresenceAnswer {
  account: string;
  online: boolean;
  connections: number;
  /** Now while online; when the last socket closed otherwise; null if never seen. */
  lastSeenAt: number | null;
  /**
   * When this proxy started. Every session it did not witness died with the
   * previous process, so an account unknown to it is genuinely logged out -
   * but the game server needs a moment to notice and finish saving, so the
   * gate applies its cooldown from this timestamp too.
   */
  startedAt: number;
  now: number;
  /**
   * Open sockets that have carried encrypted (C3/C4) traffic without ever
   * yielding a login name - a game-server session this process cannot put a
   * name to, because the stream desynced or the keys are not this version's.
   *
   * It is deliberately global rather than per account: an unreadable session
   * could belong to *anyone*, so while this is above zero the gate must refuse
   * every account. Otherwise a connection the sniffer failed on would read as
   * "offline", which is the one wrong answer that costs jewels.
   */
  unidentifiedConnections: number;
}

const EMPTY: Uint8Array = new Uint8Array(0);

function append(queue: Uint8Array, chunk: Uint8Array): Uint8Array {
  const merged = new Uint8Array(queue.length + chunk.length);
  merged.set(queue, 0);
  merged.set(chunk, queue.length);
  return merged;
}

/**
 * Hands every complete frame at the front of `queue` to `onFrame` and returns
 * what is left. A byte that is not a header is dropped and the scan resumes
 * after it, so one bad byte cannot jam the stream forever. Only the header
 * is read here, and the header is plain in both directions.
 */
function drain(queue: Uint8Array, onFrame: (wire: Uint8Array) => void): Uint8Array {
  while (queue.length > 0) {
    const type = queue[0];

    if (!HEADERS.has(type)) {
      queue = queue.subarray(1);
      continue;
    }

    const headerSize = getSizeOfPacketType(type);

    if (queue.length < headerSize + 1) break;

    const length = getPacketSize(queue);

    if (length < headerSize + 1) {
      queue = queue.subarray(1);
      continue;
    }

    if (queue.length < length) break;

    onFrame(queue.slice(0, length));
    queue = queue.subarray(length);
  }

  return queue;
}

/**
 * Reads the account name out of one connection's client-to-server stream,
 * and waits for the server-to-client stream to confirm it.
 *
 * The client sends Xor32 then SimpleModulus for headers >= 0xC3
 * (`src/store.ts` `sendToGS`), so this reverses both, in that order. The
 * decryptor's default keys are `DefaultServerKey` - the server side of the
 * client-to-server direction, which is exactly this - so it needs no
 * configuration. The server's answer is a C1, and C1 is plain.
 *
 * Every byte handled here is a copy. The proxy forwards the caller's buffer
 * untouched, and both decryptors work in place.
 */
export class ConnectionPresence {
  private readonly modulus = new SimpleModulusDecryptor();
  private readonly xor32 = new Xor32Decryptor();
  private queue = EMPTY;
  private serverQueue = EMPTY;
  private sniffed = 0;
  private serverSniffed = 0;
  private finished = false;
  /** The name the client put in its login frame, until the server rules on it. */
  private pending: string | null = null;
  /** The server refused the last claim, so a nameless socket here is a known logged-out one. */
  private refused = false;
  private account: string | null = null;
  private sawEncrypted = false;
  /** The page's nonce, when the socket URL carried a well-formed one. */
  private readonly session: string | null;

  constructor(session: string | null = null) {
    open.add(this);

    // The proxy screens the query string before it gets here, but the map
    // key's shape is this class's invariant, so it is enforced where the map
    // lives: a nonce that is not 32 lowercase hex binds nothing, and the
    // socket carries on as one that never named a session.
    this.session = session !== null && SESSION_NONCE_RE.test(session) ? session : null;

    if (this.session !== null) bind(this.session, this);
  }

  /**
   * A live socket that has spoken the encrypted protocol but never named
   * itself. The connect-server socket is C1 throughout and never counts;
   * a game-server socket only looks like this if decryption went wrong - or
   * while a login is in flight and the server has not answered yet, which the
   * gate is right to treat the same way. A socket whose last login the server
   * refused is not unidentified: it is known to be nobody.
   */
  get unidentified(): boolean {
    return this.sawEncrypted && this.account === null && !this.refused;
  }

  /**
   * Feeds client-to-server bytes. Returns the name the client claimed, the
   * first time a login frame is read - a claim, not an identity. `loginName`
   * stays null until `feedFromServer` sees the game server accept it.
   */
  feed(chunk: Uint8Array): string | null {
    if (this.finished) return null;

    this.sniffed += chunk.length;

    if (this.sniffed > MAX_SNIFF_BYTES) return this.giveUp();

    this.queue = append(this.queue, chunk);

    return this.scan();
  }

  /**
   * Feeds server-to-client bytes, for the one frame that matters: the game
   * server's answer to the login. Only an Okay for a pending claim names the
   * socket; anything else drops the claim, and the client is free to try
   * again with another name, which starts the wait over. Returns the account
   * the moment it is confirmed.
   */
  feedFromServer(chunk: Uint8Array): string | null {
    if (this.finished) return null;

    this.serverSniffed += chunk.length;

    if (this.serverSniffed > MAX_SNIFF_BYTES) return this.giveUp();

    let confirmed: string | null = null;

    this.serverQueue = drain(append(this.serverQueue, chunk), wire => {
      if (confirmed !== null) return;
      if (wire[0] !== 0xc1 || wire.length < LOGIN_RESPONSE_LENGTH) return;
      if (wire[2] !== LOGIN_CODE || wire[3] !== LOGIN_SUB_CODE) return;

      if (wire[4] === LOGIN_OKAY && this.pending !== null) {
        confirmed = this.pending;
      } else {
        this.pending = null;
        this.refused = true;
      }
    });

    if (confirmed !== null) {
      this.account = confirmed;
      this.pending = null;
      this.finished = true;
      this.queue = EMPTY;
      this.serverQueue = EMPTY;
      register(confirmed, this);
    }

    return confirmed;
  }

  /** The account this connection logged in as, if the server ever accepted one. */
  get loginName(): string | null {
    return this.account;
  }

  /** The stream is too long to be a fresh session; stop reading both directions. */
  private giveUp(): null {
    this.finished = true;
    this.queue = EMPTY;
    this.serverQueue = EMPTY;
    return null;
  }

  private scan(): string | null {
    let claimed: string | null = null;

    this.queue = drain(this.queue, wire => {
      if (wire[0] >= 0xc3) this.sawEncrypted = true;

      const name = this.readLogin(wire);

      if (name) {
        this.pending = name;
        this.refused = false;
        claimed = name;
      }
    });

    return claimed;
  }

  /** One framed packet in, an account name out if it was the login. */
  private readLogin(wire: Uint8Array): string | null {
    let packet: Uint8Array;

    try {
      const [ok, decrypted] = this.modulus.Decrypt(wire);
      if (!ok) return null;
      packet = decrypted;
    } catch {
      // A malformed frame must never take the proxy down with it: this is a
      // side channel, and the bytes have already been forwarded.
      return null;
    }

    this.xor32.Decrypt(packet);

    const codeIndex = getSizeOfPacketType(packet[0]);

    if (packet.length < codeIndex + 2) return null;
    if (packet[codeIndex] !== LOGIN_CODE) return null;
    if (packet[codeIndex + 1] !== LOGIN_SUB_CODE) return null;
    if (packet.length < NAME_OFFSET + NAME_LENGTH) return null;

    const name = packet.slice(NAME_OFFSET, NAME_OFFSET + NAME_LENGTH);
    Xor3Byte(name);

    // `stringToBytes` zero-pads to 10 before the Xor3, so the padding decodes
    // back to zeros and the name is whatever precedes the first one.
    const end = name.indexOf(0);
    const text = new TextDecoder("ascii").decode(
      end === -1 ? name : name.subarray(0, end)
    );

    return ACCOUNT_RE.test(text) ? text : null;
  }

  /** The socket closed. */
  close(): void {
    this.finished = true;
    this.queue = EMPTY;
    this.serverQueue = EMPTY;
    open.delete(this);

    if (this.account) unregister(this.account, this);
    if (this.session !== null) unbind(this.session, this);
  }
}

function bind(session: string, connection: ConnectionPresence): void {
  let set = bySession.get(session);

  if (!set) {
    set = new Set();
    bySession.set(session, set);
  }

  set.add(connection);
}

function unbind(session: string, connection: ConnectionPresence): void {
  const set = bySession.get(session);

  if (!set) return;

  set.delete(connection);

  if (set.size === 0) bySession.delete(session);
}

/**
 * The account that logged in over a socket carrying this nonce, or null while
 * none has. A name only lands once the game server has accepted the login
 * (`feedFromServer`), so a fresh page load answers null through the login
 * screen and the first frames of its game-server connection; and a nonce
 * whose sockets have all closed answers null again. That does not recall a
 * ticket the shop already signed - it expires on its own clock - which is why
 * the shop asks here again before it lets a ticket spend anything.
 */
export function sessionAccount(session: string): string | null {
  const set = bySession.get(session);

  if (!set) return null;

  for (const connection of set) {
    if (connection.loginName !== null) return connection.loginName;
  }

  return null;
}

function register(account: string, connection: ConnectionPresence): void {
  const key = account.toLowerCase();
  let set = live.get(key);

  if (!set) {
    set = new Set();
    live.set(key, set);
  }

  set.add(connection);
  console.log(`presence: ${account} online (${set.size} connection(s))`);
}

function unregister(account: string, connection: ConnectionPresence): void {
  const key = account.toLowerCase();
  const set = live.get(key);

  if (!set) return;

  set.delete(connection);

  if (set.size === 0) {
    live.delete(key);
    lastSeen.set(key, Date.now());
    console.log(`presence: ${account} offline`);
  }
}

export function lookup(account: string): PresenceAnswer {
  const key = account.toLowerCase();
  const set = live.get(key);
  const connections = set ? set.size : 0;
  const now = Date.now();

  return {
    account,
    online: connections > 0,
    connections,
    lastSeenAt: connections > 0 ? now : (lastSeen.get(key) ?? null),
    startedAt,
    now,
    unidentifiedConnections: unidentifiedConnections(),
  };
}

/** Every account with a live socket, for the ops view. */
export function onlineAccounts(): string[] {
  return [...live.keys()].sort();
}

/** Open sockets that spoke the encrypted protocol without ever naming themselves. */
export function unidentifiedConnections(): number {
  let count = 0;
  for (const connection of open) if (connection.unidentified) count++;
  return count;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** One request against the presence server. Separate from the port so the routes can be tested without one. */
export function handlePresenceRequest(req: Request): Response {
  const url = new URL(req.url);

  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);

  if (url.pathname === "/presence") {
    return json({
      startedAt,
      now: Date.now(),
      online: onlineAccounts(),
      openConnections: open.size,
      unidentifiedConnections: unidentifiedConnections(),
    });
  }

  // Before the presence routes' 404, which swallows every other path. A
  // malformed nonce is answered exactly like an unknown one: this route
  // never says which of the two it saw.
  const ticket = url.pathname.match(/^[/]ticket[/]([^/]+)$/);

  if (ticket) {
    const account = SESSION_NONCE_RE.test(ticket[1]) ? sessionAccount(ticket[1]) : null;
    return account === null ? json({ error: "Not found" }, 404) : json({ account });
  }

  const match = url.pathname.match(/^\/presence\/([^/]+)$/);

  if (!match) return json({ error: "Not found" }, 404);

  const account = decodeURIComponent(match[1]);

  if (!ACCOUNT_RE.test(account)) {
    return json({ error: "Malformed account name" }, 400);
  }

  return json(lookup(account));
}

/**
 * Loopback only, no auth. It answers "is this account playing", which is not
 * a secret to anyone who can already reach the box, but it must never be
 * published by Caddy: it would otherwise let anyone enumerate who is online -
 * and, through `/ticket/<nonce>`, mint a cash-shop ticket for anyone whose
 * nonce they hold.
 */
export function startPresenceServer(): void {
  if (!PRESENCE_ENABLED) {
    console.log("presence: off");
    return;
  }

  Bun.serve({
    port: PRESENCE_PORT,
    hostname: PRESENCE_HOST,
    fetch: handlePresenceRequest,
  });

  console.log(`presence: listening on ${PRESENCE_HOST}:${PRESENCE_PORT}`);
}
