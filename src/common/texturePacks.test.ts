import { beforeEach, describe, expect, it, vi } from 'vitest';

const version = { data: { assets: './game-assets/' } };
vi.mock('../version', () => ({
  get gameVersion() {
    return version;
  },
}));

const store = new Map<string, string>();
vi.mock('../libs/localStorage', () => ({
  LocalStorage: {
    load: (k: string) => store.get(k) ?? null,
    save: (k: string, v: string) => void store.set(k, v),
    delete: (k: string) => void store.delete(k),
  },
}));

const INDEX = { packs: [{ id: 'hd-512', name: 'HD 512', textures: 2, bytes: 1024 }] };
const PACK = {
  id: 'hd-512',
  name: 'HD 512',
  textures: {
    'Object1/ston01|128x128': 'Object1/ston01.ozj.webp',
    // The colliding pair: same name, one an alpha cut-out, one opaque.
    'Object1/tree_01|32x32': 'Object1/tree_01.ozt.webp',
    'Object1/tree_01|128x64': 'Object1/tree_01.ozj.webp',
  },
};

/**
 * Stands in for a Babylon Texture the glTF loader made. The two details that
 * matter are modelled faithfully: the converter's name lives on the INTERNAL
 * texture, and `updateURL` replaces that object - which is how the real one
 * loses the name.
 */
function fakeTexture(label: string, width = 128, height = 128, hasAlpha = false) {
  let internal: { label?: string } | null = { label };
  const tex = {
    url: `data:Stone01.glb#image0`,
    _buffer: new Uint8Array([1, 2, 3]),
    hasAlpha,
    loads: [] as { url: string; buffer: unknown }[],
    getSize: () => ({ width, height }),
    getInternalTexture: () => internal,
    updateURL(url: string, buffer: unknown, onLoad?: () => void) {
      tex.loads.push({ url, buffer });
      tex.url = url;
      // What Babylon does: a fresh internal texture, labelled with the URL,
      // and the alpha flag re-derived from the image that just arrived.
      internal = { label: url };
      tex.hasAlpha = false;
      onLoad?.();
    },
  };
  return tex;
}

function serve(map: Record<string, unknown>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const hit = Object.entries(map).find(([k]) => url.endsWith(k));
      return hit
        ? ({ ok: true, status: 200, json: async () => hit[1] } as Response)
        : ({ ok: false, status: 404 } as Response);
    })
  );
}

async function fresh() {
  vi.resetModules();
  return import('./texturePacks');
}

beforeEach(() => {
  store.clear();
  version.data.assets = './game-assets/';
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('packsBase', () => {
  it('pairs with the active version', async () => {
    serve({});
    const m = await fresh();
    expect(m.packsBase()).toBe('./packs/');

    version.data.assets = './game-assets-v097d/';
    expect(m.packsBase()).toBe('./packs-v097d/');
  });
});

describe('loadPackIndex', () => {
  it('lists the packs the deployment ships', async () => {
    serve({ 'packs/index.json': INDEX });
    const m = await fresh();
    expect(await m.loadPackIndex()).toHaveLength(1);
    expect(m.texturePacks.available[0].name).toBe('HD 512');
  });

  it('offers Original only when nothing is installed', async () => {
    serve({});
    const m = await fresh();
    expect(await m.loadPackIndex()).toEqual([]);
    expect(m.texturePacks.activeId).toBe(m.ORIGINAL_PACK);
  });

  it('drops a remembered pack that is no longer installed', async () => {
    store.set('mu_texture_pack', 'gone');
    serve({ 'packs/index.json': INDEX });
    const m = await fresh();
    await m.loadPackIndex();
    expect(m.texturePacks.activeId).toBe(m.ORIGINAL_PACK);
  });
});

describe('applyPackToTexture', () => {
  it('leaves textures alone while Original is selected', async () => {
    serve({ 'packs/index.json': INDEX });
    const m = await fresh();
    const tex = fakeTexture('Object1/ston01', 128, 128);
    await m.applyPackToTexture(tex as never);
    expect(tex.loads).toHaveLength(0);
  });

  it('points a texture the pack carries at the pack', async () => {
    serve({ 'packs/index.json': INDEX, 'packs/hd-512/pack.json': PACK });
    const m = await fresh();
    await m.loadPackIndex();
    await m.setActivePack('hd-512');

    const tex = fakeTexture('Object1/ston01', 128, 128);
    await m.applyPackToTexture(tex as never);

    expect(tex.loads).toHaveLength(1);
    expect(tex.loads[0].url).toBe('./packs/hd-512/Object1/ston01.ozj.webp');
  });

  it('leaves a texture the pack does not carry on the model', async () => {
    serve({ 'packs/index.json': INDEX, 'packs/hd-512/pack.json': PACK });
    const m = await fresh();
    await m.loadPackIndex();
    await m.setActivePack('hd-512');

    const tex = fakeTexture('Monster/p_d', 64, 64);
    await m.applyPackToTexture(tex as never);
    expect(tex.loads).toHaveLength(0);
  });

  it('re-stamps the converter name, which updateURL destroys', async () => {
    // Without this, pbrMaps.textureSourceName() reads the swap URL and the
    // PBR-map lookup and the hide/bright rules silently stop matching.
    serve({ 'packs/index.json': INDEX, 'packs/hd-512/pack.json': PACK });
    const m = await fresh();
    await m.loadPackIndex();
    await m.setActivePack('hd-512');

    const tex = fakeTexture('Object1/ston01', 128, 128);
    await m.applyPackToTexture(tex as never);

    expect(tex.getInternalTexture()?.label).toBe('Object1/ston01');
  });

  it('restores the model texture from the loader buffer', async () => {
    serve({ 'packs/index.json': INDEX, 'packs/hd-512/pack.json': PACK });
    const m = await fresh();
    await m.loadPackIndex();
    await m.setActivePack('hd-512');

    const tex = fakeTexture('Object1/ston01', 128, 128);
    const originalBuffer = tex._buffer;
    await m.applyPackToTexture(tex as never);

    await m.setActivePack(m.ORIGINAL_PACK);
    await m.applyPackToTexture(tex as never);

    expect(tex.loads).toHaveLength(2);
    expect(tex.loads[1].url).toBe('data:Stone01.glb#image0');
    expect(tex.loads[1].buffer).toBe(originalBuffer);
    expect(tex.getInternalTexture()?.label).toBe('Object1/ston01');
  });

  it('does not reload a texture that is already showing the right image', async () => {
    serve({ 'packs/index.json': INDEX, 'packs/hd-512/pack.json': PACK });
    const m = await fresh();
    await m.loadPackIndex();
    await m.setActivePack('hd-512');

    const tex = fakeTexture('Object1/ston01', 128, 128);
    await m.applyPackToTexture(tex as never);
    await m.applyPackToTexture(tex as never);
    await m.applyPackToTexture(tex as never);

    expect(tex.loads).toHaveLength(1);
  });

  it('tells apart two textures that share a name, by size', async () => {
    // `Object1/tree_01` is a 32x32 alpha cut-out (the planter bushes) AND a
    // 128x64 opaque image. Keyed on the name alone the opaque one won, the
    // bushes lost their alpha and drew as solid grey slabs. 56 names collide
    // like this and every one mixes an OZT with an OZJ.
    serve({ 'packs/index.json': INDEX, 'packs/hd-512/pack.json': PACK });
    const m = await fresh();
    await m.loadPackIndex();
    await m.setActivePack('hd-512');

    const cutout = fakeTexture('Object1/tree_01', 32, 32, true);
    const opaque = fakeTexture('Object1/tree_01', 128, 64, false);
    await m.applyPackToTexture(cutout as never);
    await m.applyPackToTexture(opaque as never);

    expect(cutout.loads[0].url).toBe('./packs/hd-512/Object1/tree_01.ozt.webp');
    expect(opaque.loads[0].url).toBe('./packs/hd-512/Object1/tree_01.ozj.webp');
  });

  it('never lets a swap change whether a texture has alpha', async () => {
    // The material is resolved from this flag; a cut-out whose replacement
    // arrives opaque is re-resolved as a solid, single-sided card.
    serve({ 'packs/index.json': INDEX, 'packs/hd-512/pack.json': PACK });
    const m = await fresh();
    await m.loadPackIndex();
    await m.setActivePack('hd-512');

    const cutout = fakeTexture('Object1/tree_01', 32, 32, true);
    await m.applyPackToTexture(cutout as never);

    expect(cutout.hasAlpha).toBe(true);
  });

  it('swaps a texture too small for the upscaler, if a pack carries one', async () => {
    // The build skips sources under 16px because the model invents detail
    // rather than recovering it at that size. That is a decision the
    // generator makes, not a rule here: a pack with a hand-drawn replacement
    // for a 8x8 card must still be honoured, and nothing in the lookup may
    // start filtering by size.
    serve({
      'packs/index.json': INDEX,
      'packs/hd-512/pack.json': {
        textures: { 'Object1/doorknob|8x8': 'Object1/doorknob.ozt.webp' },
      },
    });
    const m = await fresh();
    await m.loadPackIndex();
    await m.setActivePack('hd-512');

    const tiny = fakeTexture('Object1/doorknob', 8, 8, true);
    await m.applyPackToTexture(tiny as never);

    expect(tiny.loads).toHaveLength(1);
    expect(tiny.loads[0].url).toBe('./packs/hd-512/Object1/doorknob.ozt.webp');
    expect(tiny.hasAlpha).toBe(true);
  });

  it('survives a pack whose manifest will not load', async () => {
    serve({ 'packs/index.json': INDEX });
    const m = await fresh();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    await m.loadPackIndex();
    await m.setActivePack('hd-512');

    const tex = fakeTexture('Object1/ston01', 128, 128);
    await m.applyPackToTexture(tex as never);
    expect(tex.loads).toHaveLength(0);
  });
});

describe('setActivePack', () => {
  it('remembers the choice and tells its listeners', async () => {
    serve({ 'packs/index.json': INDEX, 'packs/hd-512/pack.json': PACK });
    const m = await fresh();
    await m.loadPackIndex();

    const seen: string[] = [];
    m.onTexturePackChanged(() => void seen.push(m.texturePacks.activeId));

    await m.setActivePack('hd-512');
    expect(seen).toEqual(['hd-512']);
    expect(store.get('mu_texture_pack')).toBe('hd-512');

    // Selecting what is already selected is not a change.
    await m.setActivePack('hd-512');
    expect(seen).toHaveLength(1);
  });
});
