import { describe, expect, it } from 'vitest';
import {
  ESCROW_CODE,
  ESCROW_REQUEST_SUB,
  ESCROW_RESULT_SUB,
  buildEscrowRequest,
  bytesToGuid,
  guidToBytes,
  parseEscrowResult,
  readInt64LE,
  writeInt64LE,
} from './escrowWire';

const hex = (b: Uint8Array) => Array.from(b, x => x.toString(16).padStart(2, '0')).join('');

describe('guid bytes', () => {
  it('uses the .NET byte order (first three fields little endian)', () => {
    // new Guid("00112233-4455-6677-8899-aabbccddeeff").ToByteArray()
    expect(hex(guidToBytes('00112233-4455-6677-8899-aabbccddeeff'))).toBe(
      '33221100554477668899aabbccddeeff'
    );
  });

  it('round trips', () => {
    const id = '9682a001-0000-77f2-4586-50c1e016e2a6';
    expect(bytesToGuid(guidToBytes(id))).toBe(id);
  });

  it('refuses junk', () => {
    expect(() => guidToBytes('not-a-uuid')).toThrow();
    expect(() => bytesToGuid(new Uint8Array(3))).toThrow();
  });
});

describe('int64', () => {
  it('round trips and refuses unsafe values', () => {
    const buf = new Uint8Array(8);
    writeInt64LE(buf, 0, 2_000_000_000);
    expect(readInt64LE(buf, 0)).toBe(2_000_000_000);
    expect(() => writeInt64LE(buf, 0, 1.5)).toThrow();
  });
});

describe('packets', () => {
  it('wraps a token in C1 E7 01', () => {
    const packet = buildEscrowRequest(new Uint8Array([1, 2, 3]));
    expect(Array.from(packet)).toEqual([0xc1, 7, ESCROW_CODE, ESCROW_REQUEST_SUB, 1, 2, 3]);
  });

  it('parses a result with an item', () => {
    const packet = new Uint8Array(47 + 12);
    packet[0] = 0xc1;
    packet[1] = packet.length;
    packet[2] = ESCROW_CODE;
    packet[3] = ESCROW_RESULT_SUB;
    packet[4] = 3;
    packet[5] = 0;
    packet.set(guidToBytes('00112233-4455-6677-8899-aabbccddeeff'), 6);
    packet.set(guidToBytes('9682a001-0000-77f2-4586-50c1e016e2a6'), 22);
    writeInt64LE(packet, 38, 5000);
    packet[46] = 12;
    packet[47] = 0x0d;
    const result = parseEscrowResult(packet);
    expect(result).toEqual({
      op: 'buy',
      status: 'ok',
      listingId: '00112233-4455-6677-8899-aabbccddeeff',
      boxId: '9682a001-0000-77f2-4586-50c1e016e2a6',
      amount: 5000,
      item: expect.any(Uint8Array),
    });
    expect(result!.item![0]).toBe(0x0d);
  });

  it('parses a refusal without an item and rejects other packets', () => {
    const packet = new Uint8Array(47);
    packet[0] = 0xc1;
    packet[1] = 47;
    packet[2] = ESCROW_CODE;
    packet[3] = ESCROW_RESULT_SUB;
    packet[4] = 1;
    packet[5] = 7;
    packet.set(guidToBytes('00112233-4455-6677-8899-aabbccddeeff'), 6);
    packet.set(guidToBytes('00112233-4455-6677-8899-aabbccddeeff'), 22);
    const result = parseEscrowResult(packet);
    expect(result?.op).toBe('list');
    expect(result?.status).toBe('noRoom');
    expect(result?.item).toBeNull();
    packet[2] = 0x22;
    expect(parseEscrowResult(packet)).toBeNull();
  });
});
