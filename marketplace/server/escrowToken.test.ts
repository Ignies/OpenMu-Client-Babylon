import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'bun:test';
import { bytesToGuid, readInt64LE } from '../../src/common/escrowWire';
import { mintEscrowToken } from './escrowToken';

const secret = new TextEncoder().encode('s3cret');
const claims = {
  op: 'buy' as const,
  listingId: '00112233-4455-6677-8899-aabbccddeeff',
  boxId: '9682a001-0000-77f2-4586-50c1e016e2a6',
  itemId: '9982a001-0000-7933-a308-65d9ae468f68',
  amount: 5000,
  fee: 500,
  account: 'MKT003',
  character: 'MKT003',
  expiresAt: 1_800_000_000,
};

describe('mintEscrowToken', () => {
  it('lays the fields out the way EscrowToken.cs reads them', () => {
    const token = mintEscrowToken(claims, secret);
    expect(token.length).toBe(75 + 1 + 6 + 1 + 6 + 32);
    expect(token[0]).toBe(1);
    expect(token[1]).toBe(3);
    expect(readInt64LE(token, 2)).toBe(1_800_000_000);
    expect(bytesToGuid(token.subarray(10, 26))).toBe(claims.listingId);
    expect(bytesToGuid(token.subarray(26, 42))).toBe(claims.boxId);
    expect(bytesToGuid(token.subarray(42, 58))).toBe(claims.itemId);
    expect(readInt64LE(token, 58)).toBe(5000);
    expect(readInt64LE(token, 66)).toBe(500);
    expect(token[74]).toBe(0);
    expect(token[75]).toBe(6);
    expect(new TextDecoder().decode(token.subarray(76, 82))).toBe('MKT003');
    expect(token[82]).toBe(6);
    expect(new TextDecoder().decode(token.subarray(83, 89))).toBe('MKT003');
    const mac = createHmac('sha256', secret).update(token.subarray(0, 89)).digest();
    expect(Buffer.from(token.subarray(89)).equals(new Uint8Array(mac))).toBe(true);
  });

  it('writes a nil item id for a list and the slot', () => {
    const token = mintEscrowToken({ ...claims, op: 'list', itemId: undefined, slot: 14 }, secret);
    expect(token[1]).toBe(1);
    expect(bytesToGuid(token.subarray(42, 58))).toBe('00000000-0000-0000-0000-000000000000');
    expect(token[74]).toBe(14);
  });

  it('refuses names the game would not accept', () => {
    expect(() => mintEscrowToken({ ...claims, account: 'too-long-name' }, secret)).toThrow();
    expect(() => mintEscrowToken({ ...claims, character: '' }, secret)).toThrow();
  });
});
