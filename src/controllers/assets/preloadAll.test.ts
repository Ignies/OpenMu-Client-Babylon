import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = vi.hoisted(() => ({ done: false, blocking: false, everything: false, index: true, start: vi.fn() }));

vi.mock('./assetDownload', () => ({
  FIRST_RUN_DONE_KEY: 'mu_auto_download_build',
  assetDownload: {
    get done() {
      return store.done;
    },
    get blocking() {
      return store.blocking;
    },
    set blocking(v: boolean) {
      store.blocking = v;
    },
    chooseOnly: (fn: (g: unknown) => boolean) => {
      store.everything = fn({ id: 'map:38', kind: 'map' });
    },
  },
  loadAssetsIndex: async () => (store.index ? {} : null),
  startDownload: () => store.start(),
}));

const saved = new Map<string, string>();
vi.mock('../../core/localStorage', () => ({
  LocalStorage: { save: (k: string, v: string) => void saved.set(k, v), load: (k: string) => saved.get(k) ?? null },
}));

const { preloadAll } = await import('./preloadAll');

beforeEach(() => {
  Object.assign(store, { done: false, blocking: false, everything: false, index: true });
  store.start.mockReset();
  saved.clear();
});

describe('preloadAll', () => {
  it('skips without an assets index', async () => {
    store.index = false;
    expect(await preloadAll()).toBe('skipped');
    expect(store.start).not.toHaveBeenCalled();
  });

  it('downloads every group with the game paused, then marks the build done', async () => {
    store.start.mockImplementation(async () => {
      expect(store.blocking).toBe(true);
      store.done = true;
    });
    expect(await preloadAll()).toBe('done');
    expect(store.everything).toBe(true);
    expect(store.blocking).toBe(false);
    expect(saved.get('mu_auto_download_build')).toBe(typeof BUILD_ID === 'string' ? BUILD_ID : 'dev');
  });

  it('reports a run that stopped short, and leaves the build to run again', async () => {
    store.start.mockResolvedValue(undefined);
    expect(await preloadAll()).toBe('failed');
    expect(store.blocking).toBe(false);
    expect(saved.size).toBe(0);
  });
});
