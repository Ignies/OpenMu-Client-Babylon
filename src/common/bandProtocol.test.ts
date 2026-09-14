import { describe, expect, it } from 'vitest';
import { Xor32Decryptor, Xor32Encryptor } from './encryption/xor32';
import {
  BAND_LIMITS,
  BandSub,
  RefuseCause,
  RefuseWhat,
  StopReason,
  decodeClientFrame,
  decodeRelayFrame,
  encodeBandState,
  encodeBatch,
  encodeChannelNames,
  encodeHello,
  encodeJoin,
  encodeLeave,
  encodeLeaveNotice,
  encodeRefused,
  encodeStart,
  encodeStop,
  encodeStopNotice,
  isBandFrame,
  stampPerformer,
  type BandMidiEvent,
} from './bandProtocol';

const on = (note: number, dt = 0): BandMidiEvent => ({ dt, status: 0x90, d1: note, d2: 100 });

describe('band protocol', () => {
  it('round-trips every client frame', () => {
    expect(decodeClientFrame(encodeStart(2))).toEqual({ sub: BandSub.Start, version: 1, instrument: 2 });
    expect(decodeClientFrame(encodeStop())).toEqual({ sub: BandSub.Stop });
    expect(decodeClientFrame(encodeJoin(0x1234, 1, 0b1010))).toEqual({ sub: BandSub.Join, masterId: 0x1234, instrument: 1, mask: 0b1010 });
    expect(decodeClientFrame(encodeLeave())).toEqual({ sub: BandSub.Leave });

    const batch = encodeBatch(65535, 123456789, [on(60), on(62, 100), { dt: 1000, status: 0xb0, d1: 123, d2: 0 }]);
    expect(decodeClientFrame(batch)).toEqual({
      sub: BandSub.Batch,
      seq: 65535,
      baseMs: 123456789,
      events: [on(60), on(62, 100), { dt: 1000, status: 0xb0, d1: 123, d2: 0 }],
    });

    const members = [
      { id: 5, instrument: 0, mask: 0b11 },
      { id: 6, instrument: 2, mask: 0b100 },
    ];
    expect(decodeClientFrame(encodeBandState(0xfff8, members))).toEqual({ sub: BandSub.BandState, masterMask: 0xfff8, members });

    const names = [
      { channel: 0, name: 'Lead' },
      { channel: 9, name: 'Drums' },
    ];
    expect(decodeClientFrame(encodeChannelNames(names))).toEqual({ sub: BandSub.ChannelNames, names });
  });

  it('keeps every frame inside a C1', () => {
    const full = Array.from({ length: BAND_LIMITS.maxEventsPerBatch }, (_, i) => on(40 + i, i * 10));
    const batch = encodeBatch(1, 0, full);
    expect(batch.length).toBe(11 + 5 * 48);
    expect(batch[1]).toBe(batch.length);
    expect(stampPerformer(batch, 1).length).toBe(253);
    expect(() => encodeBatch(1, 0, [...full, on(99)])).toThrow();
    expect(() => encodeBatch(1, 0, [])).toThrow();

    const longNames = Array.from({ length: 16 }, (_, c) => ({ channel: c, name: 'x'.repeat(40) }));
    const framed = encodeChannelNames(longNames);
    expect(framed.length).toBeLessThanOrEqual(4 + BAND_LIMITS.maxChannelNamesBytes);
    expect(decodeClientFrame(framed)).not.toBeNull();
  });

  it('rejects what a proxy should drop', () => {
    const batch = encodeBatch(1, 0, [on(60)]);
    const wrongLen = new Uint8Array(batch);
    wrongLen[1] = batch.length - 1;
    expect(decodeClientFrame(wrongLen)).toBeNull();

    const badStatus = new Uint8Array(batch);
    badStatus[13] = 0x7f;
    expect(decodeClientFrame(badStatus)).toBeNull();
    badStatus[13] = 0xf0;
    expect(decodeClientFrame(badStatus)).toBeNull();

    const badData = new Uint8Array(batch);
    badData[14] = 0x80;
    expect(decodeClientFrame(badData)).toBeNull();

    const badDt = new Uint8Array(batch);
    badDt[11] = 0x04;
    badDt[12] = 0x00;
    expect(decodeClientFrame(badDt)).toBeNull();

    expect(decodeClientFrame(new Uint8Array([0xc1, 4, 0xfa, 0x42]))).toBeNull();
    expect(decodeClientFrame(new Uint8Array([0xc2, 0, 5, 0xfa, 0x02]))).toBeNull();
    expect(decodeClientFrame(new Uint8Array([0xc1, 5, 0xfa, 0x02, 0]))).toBeNull();

    const eight = Array.from({ length: 8 }, (_, i) => ({ id: i, instrument: 0, mask: 1 }));
    expect(() => encodeBandState(0, eight)).toThrow();
  });

  it('stamps the performer in and reads it back', () => {
    const batch = encodeBatch(7, 4200, [on(64, 30)]);
    const relayed = stampPerformer(batch, 0x8123 & 0x7fff);
    expect(relayed[1]).toBe(batch.length + 2);
    expect(decodeRelayFrame(relayed)).toEqual({
      sub: BandSub.Batch,
      performerId: 0x0123,
      seq: 7,
      baseMs: 4200,
      events: [on(64, 30)],
    });
    expect(decodeRelayFrame(stampPerformer(encodeStart(1), 9))).toEqual({ sub: BandSub.Start, performerId: 9, version: 1, instrument: 1 });
    expect(decodeRelayFrame(stampPerformer(encodeJoin(3, 2, 1), 9))).toEqual({ sub: BandSub.Join, performerId: 9, masterId: 3, instrument: 2, mask: 1 });
  });

  it('round-trips the proxy-originated frames', () => {
    expect(decodeRelayFrame(encodeHello())).toEqual({ sub: BandSub.Hello, performerId: 0, version: 1 });
    expect(decodeRelayFrame(encodeStopNotice(12, StopReason.Flood))).toEqual({ sub: BandSub.Stop, performerId: 12, reason: 1, arg: 0 });
    expect(decodeRelayFrame(encodeRefused(12, RefuseWhat.Start, RefuseCause.Cooldown, 9))).toEqual({
      sub: BandSub.Refused,
      performerId: 12,
      what: 1,
      cause: 1,
      arg: 9,
    });
    expect(decodeRelayFrame(encodeLeaveNotice(12))).toEqual({ sub: BandSub.Leave, performerId: 12 });
  });

  it('is recognised on the wire before decryption, and decodes after it', () => {
    const plain = encodeBatch(1, 0, [on(60)]);
    const wire = new Uint8Array(plain);
    new Xor32Encryptor().Encrypt(wire);
    expect(isBandFrame(wire)).toBe(true);
    expect(wire[3]).not.toBe(plain[3]);

    const copy = new Uint8Array(wire);
    new Xor32Decryptor().Decrypt(copy);
    expect(decodeClientFrame(copy)).toEqual(decodeClientFrame(plain));
  });
});
