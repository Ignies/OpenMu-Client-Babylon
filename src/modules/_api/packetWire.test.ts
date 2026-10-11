import { describe, expect, it } from 'vitest';
import { MAX_FRAME, MODULE_PACKET_CODE, decodeModuleFrame, encodeModuleFrame, maxPayload } from './packetWire';

const ID = 'example';
const ascii = (s: string) => [...s].map(c => c.charCodeAt(0));
const bytes = (n: number) => Uint8Array.from({ length: n }, (_, i) => i & 0xff);
/** A frame by hand: the header's length is `size`, whatever the bytes are. */
const c1 = (size: number, ...rest: number[]) => Uint8Array.from([0xc1, size, ...rest]);

describe('encodeModuleFrame', () => {
  it.each([
    // [payload length, header, frame size]
    [0, [0xc1, 11], 11],
    [244, [0xc1, 255], 255],
    [245, [0xc2, 0x01, 0x01], 257],
    [maxPayload(ID), [0xc2, 0xff, 0xff], MAX_FRAME],
  ])('a payload of %i bytes: header %j, %i bytes in all', (length, header, size) => {
    const payload = bytes(length);
    const frame = encodeModuleFrame(ID, payload);
    expect(frame.length).toBe(size);
    expect([...frame.subarray(0, header.length)]).toEqual(header);
    expect([...frame.subarray(header.length, header.length + 2 + ID.length)]).toEqual([MODULE_PACKET_CODE, ID.length, ...ascii(ID)]);
    expect(decodeModuleFrame(frame)).toEqual({ id: ID, payload });
  });

  it('writes the code, the id and nothing more for an empty payload', () => {
    expect([...encodeModuleFrame(ID, new Uint8Array(0))]).toEqual([0xc1, 11, 0xe8, 7, ...ascii(ID)]);
  });

  it.each([
    ['an id longer than a module id', 'x'.repeat(41), bytes(0), 'bad module id'],
    ['an id that is not a module id', 'Example', bytes(0), 'bad module id'],
    ['an empty id', '', bytes(0), 'bad module id'],
    ['a payload over the frame limit', ID, bytes(maxPayload(ID) + 1), 'over'],
  ])('refuses %s', (_, id, payload, why) => {
    expect(() => encodeModuleFrame(id, payload)).toThrow(why);
  });
});

describe('decodeModuleFrame', () => {
  const frame = encodeModuleFrame(ID, Uint8Array.from([1, 2, 3]));

  it('reads a C2 frame that would have fitted C1', () => {
    const size = 3 + 2 + ID.length + 1;
    expect(decodeModuleFrame(Uint8Array.from([0xc2, 0, size, 0xe8, ID.length, ...ascii(ID), 9]))).toEqual({ id: ID, payload: Uint8Array.from([9]) });
  });

  it('hands back a copy of the payload', () => {
    const mine = encodeModuleFrame(ID, Uint8Array.from([1, 2, 3]));
    const read = decodeModuleFrame(mine);
    mine.fill(0);
    expect(read).toEqual({ id: ID, payload: Uint8Array.from([1, 2, 3]) });
  });

  it.each([
    ['nothing', new Uint8Array(0), 'not a module packet'],
    ['an encrypted header', Uint8Array.from([0xc3, ...frame.subarray(1)]), 'not a module packet'],
    ['another code', c1(6, 0xe7, 1, 0x61, 0), 'not a module packet'],
    ['a frame without its id length', c1(3, 0xe8), 'cut short'],
    ['a frame cut short', frame.subarray(0, frame.length - 1), 'cut short'],
    ['a frame longer than its header says', Uint8Array.from([...frame, 0]), 'lengths disagree'],
    ['a header shorter than its own code', c1(2, 0xe8, 0), 'lengths disagree'],
    ['an id running past the end', c1(7, 0xe8, 4, 0x61, 0x62, 0x63), 'lengths disagree'],
    ['an empty id', c1(5, 0xe8, 0, 1), 'bad module id'],
    ['an id that is not a module id', c1(6, 0xe8, 2, 0x41, 0x21), 'bad module id'],
    ['an id longer than a module id', c1(4 + 41, 0xe8, 41, ...ascii('x'.repeat(41))), 'bad module id'],
  ])('answers why it cannot read %s', (_, bad, error) => {
    expect(decodeModuleFrame(bad)).toEqual({ error });
  });
});
