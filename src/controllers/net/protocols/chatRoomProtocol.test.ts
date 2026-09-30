import { describe, expect, it } from 'vitest';
import {
  ChatFrameSplitter,
  decodeChatServerFrame,
  encodeAuthenticate,
  encodeChatMessage,
  encodeKeepAlive,
  encodeLeave,
} from './chatRoomProtocol';

function bytes(...values: number[]): Uint8Array {
  return new Uint8Array(values);
}

function nameBytes(name: string): number[] {
  const out = new Array<number>(10).fill(0);
  for (let i = 0; i < name.length; i++) out[i] = name.charCodeAt(i);
  return out;
}

describe('chat server framing', () => {
  it('encodes Authenticate with the token digits XOR3-encrypted from offset 6', () => {
    // Worked example from the reference: room 1, token 1234567890.
    expect(encodeAuthenticate(1, 1234567890)).toEqual(
      bytes(
        0xc1, 0x10, 0x00, 0x00,
        0x01, 0x00,
        0xcd, 0xfd, 0x98, 0xc8, 0xfa, 0x9d, 0xcb, 0xf7, 0x92, 0xcc
      )
    );
  });

  it('zero-fills a short token before the XOR', () => {
    const packet = encodeAuthenticate(0x0203, 42);
    expect(packet[4]).toBe(0x03);
    expect(packet[5]).toBe(0x02);
    // '4' '2' then zeros, each XOR'd with FC CF AB cycling from the field start.
    expect(Array.from(packet.subarray(6))).toEqual([
      0x34 ^ 0xfc, 0x32 ^ 0xcf, 0xab, 0xfc, 0xcf, 0xab, 0xfc, 0xcf, 0xab, 0xfc,
    ]);
  });

  it('encodes LeaveChatRoom and KeepAlive', () => {
    expect(encodeLeave()).toEqual(bytes(0xc1, 3, 0x01));
    expect(encodeKeepAlive()).toEqual(bytes(0xc1, 3, 0x05));
  });

  it('encodes a chat message with the body XOR3-encrypted from offset 5', () => {
    expect(encodeChatMessage(0, 'Hi')).toEqual(
      bytes(0xc1, 7, 0x04, 0x00, 2, 0x48 ^ 0xfc, 0x69 ^ 0xcf)
    );
  });

  it('round-trips a chat message', () => {
    const decoded = decodeChatServerFrame(encodeChatMessage(4, 'Hello room!'));
    expect(decoded).toEqual({ kind: 'message', senderIndex: 4, text: 'Hello room!' });
  });

  it('round-trips a multi-byte UTF-8 message', () => {
    const decoded = decodeChatServerFrame(encodeChatMessage(1, 'héllo ✓'));
    expect(decoded).toEqual({ kind: 'message', senderIndex: 1, text: 'héllo ✓' });
  });

  it('decodes ChatRoomClientJoined and ChatRoomClientLeft', () => {
    const joined = bytes(0xc1, 15, 0x01, 0x00, 3, ...nameBytes('Alice'));
    expect(decodeChatServerFrame(joined)).toEqual({ kind: 'joined', index: 3, name: 'Alice' });

    const left = bytes(0xc1, 15, 0x01, 0x01, 3, ...nameBytes('Alice'));
    expect(decodeChatServerFrame(left)).toEqual({ kind: 'left', index: 3, name: 'Alice' });
  });

  it('decodes the C2 client list with its 8-byte header and 11-byte rows', () => {
    const frame = bytes(
      0xc2, 0x00, 30, 0x02,
      0x07, 0x00, // room id (skipped)
      2, 0x00, // count, padding
      0, ...nameBytes('Bob'),
      1, ...nameBytes('Carol')
    );
    expect(decodeChatServerFrame(frame)).toEqual({
      kind: 'clients',
      clients: [
        { index: 0, name: 'Bob' },
        { index: 1, name: 'Carol' },
      ],
    });
  });

  it('ignores unknown frames, the proxy weather frame included', () => {
    expect(decodeChatServerFrame(bytes(0xc1, 4, 0x0f, 0x21))).toBeNull();
    expect(decodeChatServerFrame(bytes(0xc1, 3, 0x0d))).toBeNull();
  });

  it('reassembles frames split across pushes', () => {
    const splitter = new ChatFrameSplitter();
    const frame = bytes(0xc1, 15, 0x01, 0x00, 1, ...nameBytes('Dave'));

    expect(splitter.push(frame.subarray(0, 6))).toEqual([]);
    const frames = splitter.push(frame.subarray(6));
    expect(frames).toEqual([frame]);
  });

  it('splits several frames from one push and resyncs past garbage', () => {
    const a = encodeKeepAlive();
    const b = encodeChatMessage(0, 'x');
    const chunk = new Uint8Array([0x99, ...a, ...b]);

    const splitter = new ChatFrameSplitter();
    expect(splitter.push(chunk)).toEqual([a, b]);
  });

  it('waits for the full C2 length before emitting', () => {
    const frame = bytes(0xc2, 0x00, 19, 0x02, 0, 0, 1, 0, 5, ...nameBytes('Eve'));
    const splitter = new ChatFrameSplitter();
    expect(splitter.push(frame.subarray(0, 10))).toEqual([]);
    expect(splitter.push(frame.subarray(10))).toEqual([frame]);
  });
});
