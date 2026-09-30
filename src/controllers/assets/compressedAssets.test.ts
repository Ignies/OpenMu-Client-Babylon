import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { gzipSync } from 'node:zlib';

const GLB = new Uint8Array([0x67, 0x6c, 0x54, 0x46, 1, 2, 3, 4]);
const PACKED = new Uint8Array(gzipSync(GLB as unknown as Uint8Array&{buffer:ArrayBuffer}));

type Answer = { status?: number; type?: string; body?: Uint8Array };

/** A fetch whose answer per URL is scripted; records what was asked for. */
function stubFetch(answers: Record<string, Answer>) {
  const asked: string[] = [];

  const fetchMock = vi.fn(async (url: string) => {
    asked.push(url);
    const answer = answers[url] ?? { status: 404 };
    const status = answer.status ?? 200;

    return {
      ok: status >= 200 && status < 300,
      status,
      headers: { get: (name: string) => (name === 'content-type' ? (answer.type ?? '') : null) },
      arrayBuffer: async () => (answer.body ?? new Uint8Array()).buffer,
      body: { cancel: () => {} },
    };
  });

  vi.stubGlobal('fetch', fetchMock);

  return asked;
}

async function load() {
  vi.resetModules();
  return import('./compressedAssets');
}

describe('compressedAssets', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('only asks for a sidecar for the extensions the build writes one for', async () => {
    const { isCompressedAsset } = await load();

    expect(isCompressedAsset('Player/player.glb')).toBe(true);
    expect(isCompressedAsset('Data/Interface/deco.OZT')).toBe(true);
    expect(isCompressedAsset('Data/World1/EncTerrain1.att?v=2')).toBe(true);
    // Already compressed: a JPEG behind a header, and the icon pack.
    expect(isCompressedAsset('Data/Interface/back.OZJ')).toBe(false);
    expect(isCompressedAsset('items/item_0_0_0.png')).toBe(false);
  });

  it('unpacks the sidecar when the host serves it as-is', async () => {
    const asked = stubFetch({ 'a.glb.gz': { body: PACKED, type: 'model/gltf-binary' } });
    const { fetchAssetBytes } = await load();

    expect(await fetchAssetBytes('a.glb')).toEqual(GLB);
    expect(asked).toEqual(['a.glb.gz']);
  });

  it('takes the bytes as they are when the host unwrapped the sidecar itself', async () => {
    // vite's dev server answers `.gz` with `Content-Encoding: gzip`, so the
    // browser has already unpacked it by the time we see the body.
    const asked = stubFetch({ 'a.glb.gz': { body: GLB, type: 'model/gltf-binary' } });
    const { fetchAssetBytes } = await load();

    expect(await fetchAssetBytes('a.glb')).toEqual(GLB);
    expect(asked).toEqual(['a.glb.gz']);
  });

  it('falls back to the plain file, once, when the build ships no sidecars', async () => {
    const asked = stubFetch({
      'a.glb': { body: GLB, type: 'model/gltf-binary' },
      'b.glb': { body: GLB, type: 'model/gltf-binary' },
    });
    const { fetchAssetBytes } = await load();

    expect(await fetchAssetBytes('a.glb')).toEqual(GLB);
    // The 404 on the first sidecar settles it for the session: the second
    // asset must not pay a second probe.
    expect(await fetchAssetBytes('b.glb')).toEqual(GLB);

    expect(asked).toEqual(['a.glb.gz', 'a.glb', 'b.glb']);
  });

  it('falls back to the plain file when a sidecar is corrupt', async () => {
    const asked = stubFetch({
      'a.glb.gz': { body: new Uint8Array([0x1f, 0x8b, 0x08, 0x00, 0xff, 0xff]), type: 'model/gltf-binary' },
      'a.glb': { body: GLB, type: 'model/gltf-binary' },
    });
    const { fetchAssetBytes } = await load();

    expect(await fetchAssetBytes('a.glb')).toEqual(GLB);
    expect(asked).toEqual(['a.glb.gz', 'a.glb']);
  });

  it('gives up on sidecars entirely after a run of failures', async () => {
    const broken = new Uint8Array([0x1f, 0x8b, 0x08, 0x00, 0xff, 0xff]);
    const answers: Record<string, Answer> = {};
    for (const name of ['a', 'b', 'c', 'd']) {
      answers[`${name}.glb.gz`] = { body: broken, type: 'model/gltf-binary' };
      answers[`${name}.glb`] = { body: GLB, type: 'model/gltf-binary' };
    }

    const asked = stubFetch(answers);
    const { fetchAssetBytes } = await load();

    for (const name of ['a', 'b', 'c', 'd']) {
      expect(await fetchAssetBytes(`${name}.glb`)).toEqual(GLB);
    }

    // Three broken sidecars are enough; the fourth asset goes straight to the
    // plain file.
    expect(asked).toEqual([
      'a.glb.gz', 'a.glb',
      'b.glb.gz', 'b.glb',
      'c.glb.gz', 'c.glb',
      'd.glb',
    ]);
  });

  it('treats a dev server SPA fallback as a missing file, not as an asset', async () => {
    const html = new Uint8Array([0x3c, 0x21, 0x64, 0x6f]);
    const asked = stubFetch({
      'a.glb.gz': { body: html, type: 'text/html' },
      'a.glb': { body: GLB, type: 'model/gltf-binary' },
    });
    const { fetchAssetBytes } = await load();

    expect(await fetchAssetBytes('a.glb')).toEqual(GLB);
    expect(asked).toEqual(['a.glb.gz', 'a.glb']);
  });

  it('fails loudly when the plain file is missing too', async () => {
    stubFetch({});
    const { fetchAssetBytes } = await load();

    await expect(fetchAssetBytes('a.glb')).rejects.toThrow('Data file not found');
  });

  it('never asks for a sidecar for a file the build does not pack', async () => {
    const asked = stubFetch({ 'a.OZJ': { body: GLB, type: 'image/jpeg' } });
    const { fetchAssetBytes } = await load();

    expect(await fetchAssetBytes('a.OZJ')).toEqual(GLB);
    expect(asked).toEqual(['a.OZJ']);
  });
});
