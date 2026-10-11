import { describe, expect, it } from 'vitest';
import {
  PING_LIMITS,
  PING_VERSION,
  PingSub,
  decodeClientFrame,
  decodeRelayFrame,
  encodeHello,
  encodePoint,
  isPingFrame,
  stampSender,
} from './pingProtocol';

describe('ping protocol', () => {
  it('rounds a point through the wire to within half a unit', () => {
    const plain = encodePoint({ x: 123.4567, z: 7.03125 });
    expect(plain.length).toBe(8);
    const msg = decodeClientFrame(plain);
    expect(msg?.point.x).toBeCloseTo(123.4567, 1);
    // An exact multiple of 1/64 survives untouched.
    expect(msg?.point.z).toBe(7.03125);
  });

  it('clamps a point to the map instead of wrapping the u16', () => {
    const msg = decodeClientFrame(encodePoint({ x: -5, z: 9999 }));
    expect(msg?.point.x).toBe(0);
    expect(msg?.point.z).toBeCloseTo(PING_LIMITS.maxTiles, 1);
    expect(msg?.point.z).toBeLessThan(PING_LIMITS.maxTiles);
  });

  it('survives a point that is not a number', () => {
    const msg = decodeClientFrame(encodePoint({ x: NaN, z: Infinity }));
    expect(msg?.point.x).toBe(0);
    expect(msg?.point.z).toBe(0);
  });

  it('stamps the sender id without touching the point', () => {
    const plain = encodePoint({ x: 10.5, z: 200.25 });
    const relayed = stampSender(plain, 0x1234);
    expect(relayed.length).toBe(10);
    expect(relayed[1]).toBe(10);
    const msg = decodeRelayFrame(relayed);
    expect(msg).toEqual({ sub: PingSub.Point, senderId: 0x1234, point: { x: 10.5, z: 200.25 } });
  });

  it('reads a hello', () => {
    expect(decodeRelayFrame(encodeHello())).toEqual({ sub: PingSub.Hello, version: PING_VERSION });
  });

  it('refuses frames that are not this protocol', () => {
    expect(isPingFrame(new Uint8Array([0xc1, 4, 0xfa, 1]))).toBe(false);
    expect(isPingFrame(new Uint8Array([0xc2, 0, 4, 0xf9]))).toBe(false);
    expect(isPingFrame(new Uint8Array([0xc1, 2]))).toBe(false);
  });

  it('drops a frame whose length byte lies, or whose body is the wrong size', () => {
    const plain = encodePoint({ x: 1, z: 1 });
    const lying = Uint8Array.from(plain);
    lying[1] = 9;
    expect(decodeClientFrame(lying)).toBeNull();
    expect(decodeClientFrame(plain.subarray(0, 6))).toBeNull();
    // A hello is the proxy's to send; a client sending one is not a point.
    expect(decodeClientFrame(encodeHello())).toBeNull();
    // A client frame is not a relay frame: it has no id and is two bytes short.
    expect(decodeRelayFrame(plain)).toBeNull();
  });
});
