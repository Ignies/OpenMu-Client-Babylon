/**
 * The marketplace escrow protocol, as bytes. Shared by the client (which sends
 * a token and reads the result) and the service (which mints tokens and reads
 * results the client relays). No imports from the store or the item database:
 * this has to load in a browser, in bun, and in a vitest without booting the
 * game.
 *
 * Packet group 0xE7 is unused by the original protocol in both directions.
 *
 *   request  C1 len E7 01 <token>
 *   result   C1 len E7 02 op(1) status(1) listingId(16) boxId(16) amount(8) itemLen(1) item(itemLen)
 *
 * Guids cross the wire in .NET's byte order (the first three fields little
 * endian), because the server reads them with `new Guid(ReadOnlySpan<byte>)`.
 */

export const ESCROW_CODE = 0xe7;
export const ESCROW_REQUEST_SUB = 0x01;
export const ESCROW_RESULT_SUB = 0x02;

export const EscrowOperation = {
  list: 1,
  cancel: 2,
  buy: 3,
  collect: 4,
} as const;
export type EscrowOperationName = keyof typeof EscrowOperation;

/** One byte in the result; the names are the plugin's `EscrowStatus`. */
export const EscrowStatus = {
  ok: 0,
  badToken: 1,
  expired: 2,
  wrongPlayer: 3,
  notInWorld: 4,
  noSuchItem: 5,
  notTradable: 6,
  noRoom: 7,
  notEnoughMoney: 8,
  boxGone: 9,
  moneyCap: 10,
  failed: 11,
  notSold: 12,
} as const;
export type EscrowStatusName = keyof typeof EscrowStatus;

const STATUS_NAMES = Object.fromEntries(
  Object.entries(EscrowStatus).map(([name, code]) => [code, name])
) as Record<number, EscrowStatusName>;

export function escrowStatusName(code: number): EscrowStatusName {
  return STATUS_NAMES[code] ?? 'failed';
}

const OPERATION_NAMES = Object.fromEntries(
  Object.entries(EscrowOperation).map(([name, code]) => [code, name])
) as Record<number, EscrowOperationName>;

export type EscrowResult = {
  op: EscrowOperationName;
  status: EscrowStatusName;
  listingId: string;
  boxId: string;
  /** Zen that moved: the fee taken, the price paid, the sum collected. */
  amount: number;
  /** The item in the server's own serializer bytes, when one moved. */
  item: Uint8Array | null;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A uuid string to the 16 bytes .NET's `Guid` reads and writes. */
export function guidToBytes(uuid: string): Uint8Array {
  if (!UUID_RE.test(uuid)) throw new Error(`not a uuid: ${uuid}`);
  const hex = uuid.replace(/-/g, '');
  const raw = new Uint8Array(16);
  for (let i = 0; i < 16; i++) raw[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  const out = new Uint8Array(16);
  out[0] = raw[3]; out[1] = raw[2]; out[2] = raw[1]; out[3] = raw[0];
  out[4] = raw[5]; out[5] = raw[4];
  out[6] = raw[7]; out[7] = raw[6];
  out.set(raw.subarray(8), 8);
  return out;
}

/** The inverse of `guidToBytes`. */
export function bytesToGuid(bytes: Uint8Array): string {
  if (bytes.length !== 16) throw new Error('a guid is 16 bytes');
  const raw = new Uint8Array(16);
  raw[0] = bytes[3]; raw[1] = bytes[2]; raw[2] = bytes[1]; raw[3] = bytes[0];
  raw[4] = bytes[5]; raw[5] = bytes[4];
  raw[6] = bytes[7]; raw[7] = bytes[6];
  raw.set(bytes.subarray(8), 8);
  const hex = Array.from(raw, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function writeInt64LE(target: Uint8Array, offset: number, value: number): void {
  if (!Number.isSafeInteger(value)) throw new Error(`not a safe integer: ${value}`);
  const view = new DataView(target.buffer, target.byteOffset, target.byteLength);
  view.setBigInt64(offset, BigInt(value), true);
}

export function readInt64LE(source: Uint8Array, offset: number): number {
  const view = new DataView(source.buffer, source.byteOffset, source.byteLength);
  return Number(view.getBigInt64(offset, true));
}

/** Wraps a token in the request packet. */
export function buildEscrowRequest(token: Uint8Array): Uint8Array {
  const size = 4 + token.length;
  if (size > 0xff) throw new Error('escrow token does not fit a C1 packet');
  const packet = new Uint8Array(size);
  packet[0] = 0xc1;
  packet[1] = size;
  packet[2] = ESCROW_CODE;
  packet[3] = ESCROW_REQUEST_SUB;
  packet.set(token, 4);
  return packet;
}

const RESULT_FIXED = 4 + 1 + 1 + 16 + 16 + 8 + 1;

/** Reads a result packet, header included. Returns null when it is not one. */
export function parseEscrowResult(packet: Uint8Array): EscrowResult | null {
  if (packet.length < RESULT_FIXED || packet[2] !== ESCROW_CODE || packet[3] !== ESCROW_RESULT_SUB) {
    return null;
  }
  const itemLength = packet[46];
  if (packet.length < RESULT_FIXED + itemLength) return null;
  return {
    op: OPERATION_NAMES[packet[4]] ?? 'list',
    status: escrowStatusName(packet[5]),
    listingId: bytesToGuid(packet.subarray(6, 22)),
    boxId: bytesToGuid(packet.subarray(22, 38)),
    amount: readInt64LE(packet, 38),
    item: itemLength ? packet.slice(RESULT_FIXED, RESULT_FIXED + itemLength) : null,
  };
}
