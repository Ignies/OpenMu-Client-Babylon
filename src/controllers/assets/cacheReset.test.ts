import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearCacheAndReload } from './cacheReset';

const ORIGIN = 'https://mu.test';

describe('clearCacheAndReload (the Options button)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('drops the cached assets but the music, unregisters the worker and reloads from the server', async () => {
    const assets = new Set(['/Data/Item/Sword01.bmd', '/Music/main_theme.mp3', '/packs/hd/a.png']);
    const stores = new Map<string, unknown>([['mu-assets-v1', assets], ['mu-meta', new Set()]]);
    vi.stubGlobal('caches', {
      keys: async () => [...stores.keys()],
      delete: async (name: string) => stores.delete(name),
      open: async () => ({
        keys: async () => [...assets].map(path => ({ url: ORIGIN + path })),
        delete: async (r: { url: string }) => assets.delete(new URL(r.url).pathname),
      }),
    });
    const unregister = vi.fn(async () => true);
    vi.stubGlobal('navigator', { serviceWorker: { getRegistrations: async () => [{ unregister }] } });
    const replace = vi.fn();
    vi.stubGlobal('location', { href: `${ORIGIN}/?server=Mine`, replace });

    await clearCacheAndReload();

    expect([...assets]).toEqual(['/Music/main_theme.mp3']);
    expect([...stores.keys()]).toEqual(['mu-assets-v1']);
    expect(unregister).toHaveBeenCalled();
    const url = new URL(replace.mock.calls[0][0] as string);
    expect(url.searchParams.get('server')).toBe('Mine');
    expect(url.searchParams.get('r')).toBeTruthy();
  });

  it('still reloads when the browser has no cache storage', async () => {
    vi.stubGlobal('navigator', {});
    const replace = vi.fn();
    vi.stubGlobal('location', { href: `${ORIGIN}/`, replace });
    await clearCacheAndReload();
    expect(replace).toHaveBeenCalled();
  });
});
