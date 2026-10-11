import { describe, expect, it } from 'vitest';
import { createModuleHost } from './host';
import { encodeModuleFrame } from './packetWire';
import { createModuleRouter } from './router';
import { testGame } from './testGame';

function setUp() {
  const host = createModuleHost(testGame().game);
  return { host, router: createModuleRouter(host) };
}

describe('the module packet router', () => {
  it('hands each frame to the module whose id it names, and to no other', () => {
    const { host, router } = setUp();
    const heard: string[] = [];
    host.api('alpha').onPacket(p => heard.push(`alpha ${p.join()}`));
    host.api('beta').onPacket(p => heard.push(`beta ${p.join()}`));
    router.route(encodeModuleFrame('beta', Uint8Array.from([1, 2])));
    // A C2 frame, seen through a view that does not start its buffer.
    const c2 = encodeModuleFrame('alpha', new Uint8Array(300).fill(7));
    const buffer = new Uint8Array(c2.length + 4);
    buffer.set(c2, 4);
    router.route(buffer.subarray(4));
    expect(heard).toEqual(['beta 1,2', `alpha ${new Array(300).fill(7).join()}`]);
    expect(router.dropped).toEqual({ noListener: 0, malformed: 0 });
  });

  it('drops and counts a frame for a module that is not loaded or not listening, without throwing', () => {
    const { host, router } = setUp();
    host.api('quiet');
    router.route(encodeModuleFrame('nobody', Uint8Array.from([1])));
    router.route(encodeModuleFrame('quiet', Uint8Array.from([1])));
    expect(router.dropped).toEqual({ noListener: 2, malformed: 0 });
  });

  it('drops and counts a frame it cannot read, without throwing', () => {
    const { router } = setUp();
    const frame = encodeModuleFrame('alpha', Uint8Array.from([1, 2]));
    router.route(frame.subarray(0, frame.length - 1));
    router.route(Uint8Array.from([0xc1, 4, 0xe8, 0]));
    expect(router.dropped).toEqual({ noListener: 0, malformed: 2 });
  });
});
