import { createHmac, randomUUID } from 'node:crypto';
import {
  EscrowOperation,
  guidToBytes,
  writeInt64LE,
  type EscrowOperationName,
} from '../../src/common/escrowWire';

/**
 * Tokens the game server's escrow plugin acts on. The service mints one per
 * commit (list, cancel, buy, collect); the client relays it untouched; the
 * plugin verifies the signature, the expiry and the player before it moves
 * anything. Layout, little endian, exactly as `EscrowToken.cs` reads it:
 *
 *   version(1) op(1) expiresAt(8) listingId(16) boxId(16) itemId(16)
 *   amount(8) fee(8) slot(1) accountLen(1) account(n) characterLen(1)
 *   character(n) hmac-sha256(32)
 */

export const TOKEN_VERSION = 1;
export const TOKEN_TTL_S = Number(process.env.MARKETPLACE_ESCROW_TOKEN_TTL_S ?? 120);
const MAX_NAME = 10;
const ASCII_NAME_RE = /^[A-Za-z0-9]{1,10}$/;
const NIL_UUID = '00000000-0000-0000-0000-000000000000';

export type EscrowClaims = {
  op: EscrowOperationName;
  listingId: string;
  boxId: string;
  /** Nil for a list, where the item does not have a box yet. */
  itemId?: string;
  /** Price on list and buy; the sum to collect on collect. */
  amount?: number;
  /** Listing fee on list; commission on buy. */
  fee?: number;
  /** Bag slot on list. */
  slot?: number;
  account: string;
  character: string;
  /** Unix seconds; defaults to now plus the TTL. */
  expiresAt?: number;
};

function name(value: string, what: string): Uint8Array {
  if (!ASCII_NAME_RE.test(value)) throw new Error(`escrow token: bad ${what} '${value}'`);
  return new TextEncoder().encode(value);
}

export function mintEscrowToken(claims: EscrowClaims, secret: Uint8Array): Uint8Array {
  const account = name(claims.account, 'account');
  const character = name(claims.character, 'character');
  const expiresAt = claims.expiresAt ?? Math.floor(Date.now() / 1000) + TOKEN_TTL_S;
  const fixed = 1 + 1 + 8 + 16 + 16 + 16 + 8 + 8 + 1;
  const body = new Uint8Array(fixed + 1 + account.length + 1 + character.length);
  let o = 0;
  body[o++] = TOKEN_VERSION;
  body[o++] = EscrowOperation[claims.op];
  writeInt64LE(body, o, expiresAt);
  o += 8;
  body.set(guidToBytes(claims.listingId), o);
  o += 16;
  body.set(guidToBytes(claims.boxId), o);
  o += 16;
  body.set(guidToBytes(claims.itemId ?? NIL_UUID), o);
  o += 16;
  writeInt64LE(body, o, claims.amount ?? 0);
  o += 8;
  writeInt64LE(body, o, claims.fee ?? 0);
  o += 8;
  body[o++] = claims.slot ?? 0;
  body[o++] = account.length;
  body.set(account, o);
  o += account.length;
  body[o++] = character.length;
  body.set(character, o);
  o += character.length;

  const mac = createHmac('sha256', secret).update(body).digest();
  const token = new Uint8Array(body.length + mac.length);
  token.set(body, 0);
  token.set(mac, body.length);
  return token;
}

/** A box id the service mints before the move, so no box can exist unknown to it. */
export function newBoxId(): string {
  return randomUUID();
}

export { MAX_NAME };
