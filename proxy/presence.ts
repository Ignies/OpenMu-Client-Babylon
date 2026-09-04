import { SimpleModulusDecryptor } from "../src/common/encryption/simpleModulus";
import { Xor32Decryptor } from "../src/common/encryption/xor32";
import { Xor3Byte } from "../src/common/encryption/xor3";
import { getPacketSize, getSizeOfPacketType } from "../src/common/wireUtils";

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
 */

const PRESENCE_ENABLED = (process.env.PRESENCE ?? "on") !== "off";
const PRESENCE_PORT = Number(process.env.PRESENCE_PORT ?? 3001);
const PRESENCE_HOST = process.env.PRESENCE_HOST ?? "127.0.0.1";

/**
 * How much client-to-server traffic to decrypt before giving up on finding a
 * login. The connect-server socket never carries one, and a game-server socket
 * sends it within the first few frames, so this only bounds the pathological
 * case.
 */
const MAX_SNIFF_BYTES = Number(process.env.PRESENCE_SNIFF_LIMIT ?? 65536);

/** `LoginShortPassword` / `LoginLongPassword`: C3, code 0xF1, sub 0x01. */
const LOGIN_CODE = 0xf1;
const LOGIN_SUB_CODE = 0x01;
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

/**
 * Reads the account name out of one connection's client-to-server stream.
 *
 * The client sends Xor32 then SimpleModulus for headers >= 0xC3
 * (`src/store.ts` `sendToGS`), so this reverses both, in that order. The
 * decryptor's default keys are `DefaultServerKey` - the server side of the
 * client-to-server direction, which is exactly this - so it needs no
 * configuration.
 *
 * Every byte handled here is a copy. The proxy forwards the caller's buffer
 * untouched, and both decryptors work in place.
 */
export class ConnectionPresence {
  private readonly modulus = new SimpleModulusDecryptor();
  private readonly xor32 = new Xor32Decryptor();
  private queue = new Uint8Array(0);
  private sniffed = 0;
  private finished = false;
  private account: string | null = null;
  private sawEncrypted = false;

  constructor() {
    open.add(this);
  }

  /**
   * A live socket that has spoken the encrypted protocol but never named
   * itself. The connect-server socket is C1 throughout and never counts;
   * a game-server socket only looks like this if decryption went wrong.
   */
  get unidentified(): boolean {
    return this.sawEncrypted && this.account === null;
  }

  /** Feeds client-to-server bytes. Returns the account name the first time it is read. */
  feed(chunk: Uint8Array): string | null {
    if (this.finished) return null;

    this.sniffed += chunk.length;

    if (this.sniffed > MAX_SNIFF_BYTES) {
      this.finished = true;
      this.queue = new Uint8Array(0);
      return null;
    }

    const merged = new Uint8Array(this.queue.length + chunk.length);
    merged.set(this.queue, 0);
    merged.set(chunk, this.queue.length);
    this.queue = merged;

    return this.scan();
  }

  /** The account this connection logged in as, if it ever did. */
  get loginName(): string | null {
    return this.account;
  }

  private scan(): string | null {
    while (this.queue.length > 0) {
      const type = this.queue[0];

      if (!HEADERS.has(type)) {
        // Not a header byte. Drop it and rescan, so one bad byte cannot jam
        // the stream forever.
        this.queue = this.queue.subarray(1);
        continue;
      }

      const headerSize = getSizeOfPacketType(type);

      if (this.queue.length < headerSize + 1) return null;

      const length = getPacketSize(this.queue);

      if (length < headerSize + 1) {
        this.queue = this.queue.subarray(1);
        continue;
      }

      if (this.queue.length < length) return null;

      const wire = this.queue.slice(0, length);
      this.queue = this.queue.subarray(length);

      if (type >= 0xc3) this.sawEncrypted = true;

      const name = this.readLogin(wire);

      if (name) {
        this.account = name;
        this.finished = true;
        this.queue = new Uint8Array(0);
        register(name, this);
        return name;
      }
    }

    return null;
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
    this.queue = new Uint8Array(0);
    open.delete(this);

    if (this.account) unregister(this.account, this);
  }
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

/**
 * Loopback only, no auth. It answers "is this account playing", which is not
 * a secret to anyone who can already reach the box, but it must never be
 * published by Caddy: it would otherwise let anyone enumerate who is online.
 */
export function startPresenceServer(): void {
  if (!PRESENCE_ENABLED) {
    console.log("presence: off");
    return;
  }

  Bun.serve({
    port: PRESENCE_PORT,
    hostname: PRESENCE_HOST,
    fetch(req) {
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

      const match = url.pathname.match(/^\/presence\/([^/]+)$/);

      if (!match) return json({ error: "Not found" }, 404);

      const account = decodeURIComponent(match[1]);

      if (!ACCOUNT_RE.test(account)) {
        return json({ error: "Malformed account name" }, 400);
      }

      return json(lookup(account));
    },
  });

  console.log(`presence: listening on ${PRESENCE_HOST}:${PRESENCE_PORT}`);
}
