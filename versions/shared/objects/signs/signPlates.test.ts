import { describe, expect, it, vi } from 'vitest';
import type { Scene } from '@/controllers/render/babylon/exports';
import { disposeSignPlates, labelledPlate } from './signPlates';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// No canvas in node: every 2D call is a no-op and the texture only records its dispose.
const fakes = vi.hoisted(() => {
  const ctx: unknown = new Proxy({}, { get: () => () => ({ width: 0 }), set: () => true });
  class FakeTexture {
    disposed = false;
    getContext = () => ctx;
    update() {}
    dispose() {
      this.disposed = true;
    }
  }
  class FakeCanvas {
    getContext = () => ctx;
  }
  return { FakeTexture, FakeCanvas };
});
vi.mock('@/controllers/render/babylon/exports', async orig => ({ ...(await orig<object>()), DynamicTexture: fakes.FakeTexture }));
vi.mock('@/controllers/assets/mu', async orig => ({ ...(await orig<object>()), downloadDataFile: async () => new Uint8Array(32) }));
vi.stubGlobal('createImageBitmap', async () => ({ width: 64, height: 64 }));
vi.stubGlobal('OffscreenCanvas', fakes.FakeCanvas);

describe('sign plates', () => {
  it('a map change frees the drawn plates, and the next map draws its own', async () => {
    const scene = {} as Scene;
    const first = (await labelledPlate(scene, 'Object1/notice', 'Lorencia')) as unknown as { disposed: boolean };
    expect(await labelledPlate(scene, 'Object1/notice', 'Lorencia')).toBe(first);
    disposeSignPlates();
    expect(first.disposed).toBe(true);
    expect(await labelledPlate(scene, 'Object1/notice', 'Lorencia')).not.toBe(first);
  });
});
