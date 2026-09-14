import { describe, expect, it } from 'vitest';
import { BandSub, decodeRelayFrame, encodeBatch, stampPerformer } from '../../../src/common/bandProtocol';
import { BandRelayPacket } from './bandRelay';

describe('BandRelayPacket', () => {
  it('reads the sub and the performer off a relayed frame', () => {
    const frame = stampPerformer(encodeBatch(3, 500, [{ dt: 0, status: 0x90, d1: 60, d2: 90 }]), 0x0123);
    const packet = new BandRelayPacket(new DataView(frame.buffer, frame.byteOffset, frame.byteLength));
    expect(packet.Sub).toBe(BandSub.Batch);
    expect(packet.PerformerId).toBe(0x0123);
    expect(decodeRelayFrame(packet.bytes)).toMatchObject({ sub: BandSub.Batch, performerId: 0x0123, seq: 3 });
  });

  it('keeps the shape the dispatcher resolves by', () => {
    expect(BandRelayPacket.Code).toBe(0xfa);
    expect(BandRelayPacket.HeaderCode).toBe(0xc1);
    expect(BandRelayPacket.Length).toBeUndefined();
    expect(BandRelayPacket.Name).toBe('BandRelay');
  });
});
