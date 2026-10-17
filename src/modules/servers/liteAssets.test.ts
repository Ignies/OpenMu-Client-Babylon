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
