import { describe, expect, it, vi } from 'vitest';
import { runInAction } from 'mobx';

vi.stubGlobal('location', { search: '', hostname: 'localhost', href: 'http://localhost/offline' });
const { MuHelper } = await import('./state');
const { Session } = await import('../session');

describe('MuHelper.toggleMuHelper', () => {
  it('starts nothing while the mu_helper module is off', () => {
    // No test installs the modules, so mu_helper is off here, as on a 0.97d client.
    runInAction(() => {
      Session.isOffline = true;
    });

    MuHelper.toggleMuHelper();

    expect(MuHelper.active).toBe(false);
  });
});

describe('extra items past the 14 characters the blob keeps', () => {
  it('keeps the whole text, per character, only while the player has the item filters on', async () => {
    const { MuHelperState, saveMuHelperConfig } = await import('./state');
    const { GameOptions } = await import('@/controllers/settings');
    const { Hero } = await import('../hero');
    const saved = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => saved.get(k) ?? null,
      setItem: (k: string, v: string) => void saved.set(k, v),
      removeItem: (k: string) => void saved.delete(k),
    });
    runInAction(() => {
      Session.isOffline = true;
      Hero.name = 'Hero';
    });
    const entry = 'Guardian Shield +Luck +Opt 12';

    for (const filters of [false, true]) {
      GameOptions.helperItemFilters = filters;
      runInAction(() => {
        MuHelperState.draft.extraItems = [entry];
      });
      saveMuHelperConfig();
      expect(MuHelperState.config.extraItems).toEqual([filters ? entry : entry.slice(0, 14)]);
    }

    GameOptions.helperItemFilters = false;
    vi.unstubAllGlobals();
  });
});
