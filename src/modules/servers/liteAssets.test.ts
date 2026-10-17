import { afterEach, describe, expect, it, vi } from 'vitest';

/** The world's `liteAssets`, set per test. */
const server = vi.hoisted(() => ({ liteAssets: true }));
vi.mock('./serverManifest', async importOriginal => ({
  ...(await importOriginal<typeof import('./serverManifest')>()),
  serverSetting: (key: string) => (key === 'liteAssets' ? server.liteAssets : false),
}));

const { FIDELITY_CLASSIC, FIDELITY_DEFAULT, setFidelityChoice } = await import('../../controllers/fidelity');
const { liteAssetsAllowed } = await import('./liteAssets');

afterEach(() => {
  setFidelityChoice(FIDELITY_DEFAULT, {});
  server.liteAssets = true;
});

describe('liteAssetsAllowed', () => {
  it('takes the copies on Enhanced where the world ships them', () => {
    setFidelityChoice(FIDELITY_DEFAULT, {});
    expect(liteAssetsAllowed()).toBe(true);
  });

  it('keeps the originals on Classic, for a player who turned it off, and on a world without copies', () => {
    setFidelityChoice(FIDELITY_CLASSIC, {});
    expect(liteAssetsAllowed()).toBe(false);

    setFidelityChoice(FIDELITY_DEFAULT, { liteAssets: false });
    expect(liteAssetsAllowed()).toBe(false);

    setFidelityChoice(FIDELITY_DEFAULT, {});
    server.liteAssets = false;
    expect(liteAssetsAllowed()).toBe(false);
  });
});

describe('liteAssetsReady', () => {
  it('waits for the world server.json, then answers like liteAssetsAllowed', async () => {
    const manifest = await import('./serverManifest');
    const load = vi.spyOn(manifest, 'loadServerManifest').mockResolvedValue(manifest.ORIGINAL_SETTINGS);
    const { liteAssetsReady } = await import('./liteAssets');
    expect(await liteAssetsReady()).toBe(true);
    expect(load).toHaveBeenCalledTimes(1);
    setFidelityChoice(FIDELITY_CLASSIC, {});
    expect(await liteAssetsReady()).toBe(false);
    load.mockRestore();
  });
});
