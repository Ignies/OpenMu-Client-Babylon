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
