/**
 * The map ping's wire format: `C1 len FB sub ...`, both ways. Modelled on
 * `bandProtocol.ts`, which solved the same problems first.
 *
 * Client -> proxy frames go through `Store.sendToGS`, which Xor32s bytes 3..
 * like every other C1; the proxy decrypts a copy, validates, and relays.
 * Proxy -> client frames are plain (a C1 never touches the SimpleModulus
 * counter) and carry the sender's object id at bytes 4-5, stamped by the
 * proxy from the socket's own session - a client cannot claim to be someone
 * else. A relayed ping is the client's frame with those two bytes inserted
 * (`stampSender`), never re-encoded.
 *
 * Engine-free: the proxy, the client and the tests all import this.
 */

export const PING_CODE = 0xfb;
export const PING_VERSION = 1;

export const PingSub = {
  Hello: 0x00,
  Point: 0x01,
} as const;

/**
 * The numbers both ends agree on. `lifetimeMs` is what the visual lives and
 * what the sending client gates itself on; `minIntervalMs` is what the proxy
 * enforces, a little under it so clock skew never eats an honest re-ping.
 */
export const PING_LIMITS = {
  lifetimeMs: 2000,
  minIntervalMs: 1900,
  maxReceivers: 48,
  /** Sub-tile precision of a point on the wire: 1/64 of a tile, ~1.5 cm. */
  unitsPerTile: 64,
  /** Widest map, in tiles; `255.98` is the largest point that fits a u16. */
  maxTiles: 256,
} as const;

/** A ping's target, in world tiles. */
export interface PingPoint {
  x: number;
  z: number;
}

export type PingClientMessage = { sub: typeof PingSub.Point; point: PingPoint };

export type PingRelayMessage =
  | { sub: typeof PingSub.Hello; version: number }
  | { sub: typeof PingSub.Point; senderId: number; point: PingPoint };

const MAX_UNITS = PING_LIMITS.maxTiles * PING_LIMITS.unitsPerTile - 1;

function toUnits(tiles: number): number {
  if (!Number.isFinite(tiles)) return 0;
  return Math.min(MAX_UNITS, Math.max(0, Math.round(tiles * PING_LIMITS.unitsPerTile)));
}

function toTiles(units: number): number {
  return units / PING_LIMITS.unitsPerTile;
}

function frame(sub: number, body: readonly number[]): Uint8Array {
  const out = new Uint8Array(4 + body.length);
  out[0] = 0xc1;
  out[1] = out.length;
  out[2] = PING_CODE;
  out[3] = sub;
  out.set(body, 4);
  return out;
}

function u16(value: number): [number, number] {
  return [(value >>> 8) & 0xff, value & 0xff];
}

/** Client -> proxy: "I am pointing here". The id is the proxy's to add. */
export function encodePoint(point: PingPoint): Uint8Array {
  return frame(PingSub.Point, [...u16(toUnits(point.x)), ...u16(toUnits(point.z))]);
}

/** Proxy -> client, once per socket: the relay is here and speaks this version. */
export function encodeHello(): Uint8Array {
  return frame(PingSub.Hello, [PING_VERSION]);
}

/** A relay frame from a client's (decrypted) frame: the sender id goes in after the sub. */
export function stampSender(plain: Uint8Array, senderId: number): Uint8Array {
  const out = new Uint8Array(plain.length + 2);
  out[0] = 0xc1;
  out[1] = plain.length + 2;
  out[2] = PING_CODE;
  out[3] = plain[3];
  out[4] = (senderId >>> 8) & 0xff;
  out[5] = senderId & 0xff;
  out.set(plain.subarray(4), 6);
  return out;
}

/** Is this a ping frame at all? The proxy's swallow test, before anything else. */
export function isPingFrame(bytes: Uint8Array): boolean {
  return bytes.length >= 4 && bytes[0] === 0xc1 && bytes[2] === PING_CODE;
}

/** The proxy's read of a client frame. Null is malformed, and a malformed frame is dropped. */
export function decodeClientFrame(plain: Uint8Array): PingClientMessage | null {
  if (!isPingFrame(plain) || plain[1] !== plain.length) return null;
  if (plain[3] !== PingSub.Point || plain.length !== 8) return null;
  return {
    sub: PingSub.Point,
    point: { x: toTiles((plain[4] << 8) | plain[5]), z: toTiles((plain[6] << 8) | plain[7]) },
  };
}

/** The client's read of a relayed frame. */
export function decodeRelayFrame(bytes: Uint8Array): PingRelayMessage | null {
  if (!isPingFrame(bytes) || bytes[1] !== bytes.length) return null;
  if (bytes[3] === PingSub.Hello && bytes.length === 5) {
    return { sub: PingSub.Hello, version: bytes[4] };
  }
  if (bytes[3] === PingSub.Point && bytes.length === 10) {
    return {
      sub: PingSub.Point,
      senderId: (bytes[4] << 8) | bytes[5],
      point: { x: toTiles((bytes[6] << 8) | bytes[7]), z: toTiles((bytes[8] << 8) | bytes[9]) },
    };
  }
  return null;
}
