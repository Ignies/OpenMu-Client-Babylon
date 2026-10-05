import { describe, expect, it } from 'vitest';
import { MAX_MESSAGE_SIZE, PROTOCOL_VERSION, readCall } from './protocol';

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
  ])('refuses %s with %j', (name, args) => {
    expect(readCall(call(name, args))).toEqual({ id: 7, error: `bad arguments to ${name}` });
  });

  it('refuses what is not a v1 call, answering to its id when it has one', () => {
    expect(readCall('hello')).toEqual({ id: null, error: 'not a call' });
    expect(readCall({ ...call('hero', []), extra: 1 })).toEqual({ id: 7, error: 'not a call' });
    expect(readCall({ ...call('hero', []), id: -1 })).toEqual({ id: null, error: 'not a call' });
    expect(readCall({ ...call('hero', []), v: 2 })).toEqual({ id: 7, error: 'protocol 2 not served' });
    expect(readCall(call('sendPacket', []))).toEqual({ id: 7, error: 'no call sendPacket' });
    expect(readCall(call('toString', []))).toEqual({ id: 7, error: 'no call toString' });
    expect(readCall(call('playSound', ['x'.repeat(MAX_MESSAGE_SIZE)]))).toEqual({ id: 7, error: 'message too large' });
    expect(readCall({ ...call('hero', []), args: [10n] })).toEqual({ id: null, error: 'not JSON' });
  });
});
