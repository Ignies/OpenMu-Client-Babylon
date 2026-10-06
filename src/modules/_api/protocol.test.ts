import { describe, expect, it } from 'vitest';
import { MAX_MESSAGE_SIZE, PROTOCOL_VERSION, fromBase64, readCall, toBase64 } from './protocol';

const call = (name: string, args: unknown[]) => ({ v: PROTOCOL_VERSION, id: 7, call: name, args });

describe('readCall', () => {
  it.each([
    ['registerText', ['en', { 'example.title': 'Example' }]],
    ['registerWindow', [{ id: 'main', title: 'example.title' }]],
    ['registerWindow', [{ id: 'main', title: 'example.title', hotKey: 'F7' }]],
    ['playSound', ['Sound/iButtonClick']],
    ['playEffect', ['levelUp', { x: 1, y: 2 }]],
    ['hero', []],
    ['onMapChange', []],
    ['offMapChange', []],
    ['sendPacket', ['AQID']],
    ['sendPacket', ['AQI=']],
    ['sendPacket', ['AQ==']],
    ['sendPacket', ['']],
    ['onPacket', []],
    ['offPacket', []],
  ])('reads %s with good arguments', (name, args) => {
    expect(readCall(call(name, args))).toEqual(call(name, args));
  });

  it.each([
    ['registerText', ['en']],
    ['registerText', ['en', { 'example.title': 3 }]],
    ['registerText', ['en', ['example.title']]],
    ['registerWindow', [{ id: 'main' }]],
    ['registerWindow', [{ id: 'main', title: 'example.title', hotKey: 7 }]],
    ['registerWindow', [{ id: 'main', title: 'example.title', draw: 'frame' }]],
    ['playSound', [42]],
    ['playSound', ['a', 'b']],
    ['playEffect', ['levelUp', { x: 1 }]],
    ['playEffect', ['levelUp', { x: 1, y: '2' }]],
    ['playEffect', ['levelUp', { x: 1, y: 2, z: 3 }]],
    ['hero', [1]],
    ['sendPacket', []],
    ['sendPacket', [[1, 2, 3]]],
    ['sendPacket', ['AQI']],
    ['sendPacket', ['AQ=I']],
    ['sendPacket', ['AQ I']],
    ['sendPacket', ['AQID', 'AQID']],
    ['onPacket', [() => {}]],
    ['offPacket', [1]],
  ])('refuses %s with %j', (name, args) => {
    expect(readCall(call(name, args))).toEqual({ id: 7, error: `bad arguments to ${name}` });
  });

  it('refuses what is not a v1 call, answering to its id when it has one', () => {
    expect(readCall('hello')).toEqual({ id: null, error: 'not a call' });
    expect(readCall({ ...call('hero', []), extra: 1 })).toEqual({ id: 7, error: 'not a call' });
    expect(readCall({ ...call('hero', []), id: -1 })).toEqual({ id: null, error: 'not a call' });
    expect(readCall({ ...call('hero', []), v: 2 })).toEqual({ id: 7, error: 'protocol 2 not served' });
    expect(readCall(call('readBag', []))).toEqual({ id: 7, error: 'no call readBag' });
    expect(readCall(call('toString', []))).toEqual({ id: 7, error: 'no call toString' });
    expect(readCall(call('playSound', ['x'.repeat(MAX_MESSAGE_SIZE)]))).toEqual({ id: 7, error: 'message too large' });
    expect(readCall({ ...call('hero', []), args: [10n] })).toEqual({ id: null, error: 'not JSON' });
  });

  it('takes a packet of up to three quarters of the message cap', () => {
    const fits = toBase64(new Uint8Array(((MAX_MESSAGE_SIZE - 100) / 4) * 3));
    expect(readCall(call('sendPacket', [fits]))).toEqual(call('sendPacket', [fits]));
    const big = toBase64(new Uint8Array((MAX_MESSAGE_SIZE / 4) * 3));
    expect(readCall(call('sendPacket', [big]))).toEqual({ id: 7, error: 'message too large' });
  });
});

describe('the payload in base64', () => {
  it.each([0, 1, 2, 3, 0x8000 + 5, 0xffff])('round-trips %i bytes', length => {
    const bytes = Uint8Array.from({ length }, (_, i) => (i * 7) & 0xff);
    const text = toBase64(bytes);
    expect(text.length).toBe(Math.ceil(length / 3) * 4);
    expect(fromBase64(text)).toEqual(bytes);
  });
});
