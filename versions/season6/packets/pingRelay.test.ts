import { describe, expect, it } from 'vitest';
import { PingSub, decodeRelayFrame, encodePoint, stampSender } from '../../../src/common/pingProtocol';
import { PingRelayPacket } from './pingRelay';

describe('PingRelayPacket', () => {
  it('reads the sub and the sender off a relayed frame', () => {
    const frame = stampSender(encodePoint({ x: 64.5, z: 128.25 }), 0x0123);
    const packet = new PingRelayPacket(new DataView(frame.buffer, frame.byteOffset, frame.byteLength));
    expect(packet.Sub).toBe(PingSub.Point);
    expect(packet.SenderId).toBe(0x0123);
    expect(decodeRelayFrame(packet.bytes)).toEqual({
      sub: PingSub.Point,
      senderId: 0x0123,
      point: { x: 64.5, z: 128.25 },
    });
  });

  it('keeps the shape the dispatcher resolves by', () => {
    expect(PingRelayPacket.Code).toBe(0xfb);
    expect(PingRelayPacket.HeaderCode).toBe(0xc1);
    expect(PingRelayPacket.Length).toBeUndefined();
    expect(PingRelayPacket.Name).toBe('PingRelay');
  });
});
