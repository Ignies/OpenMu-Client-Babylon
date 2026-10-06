import { describe, expect, it, vi } from 'vitest';
import type { World } from '../../ecs/world';

const watched: string[] = [];
vi.mock('../module', () => ({ moduleOn: (id: string) => id !== 'mu_helper' }));
vi.mock('./state', () => ({
  ensureMuHelperWatching: () => watched.push('watch'),
  MuHelperState: {},
  MuHelper: { active: false },
}));

// The setup file's maps already loaded the loop against the real modules: load
// it again, on a fresh version handle, so the two mocks above are what it sees.
vi.stubGlobal('location', { search: '', hostname: 'localhost', href: 'http://localhost/' });
vi.resetModules();
await (await import('../../version')).loadGameVersion('season6');
const { updateMuHelperLoop } = await import('./loop');

describe('updateMuHelperLoop', () => {
  it('does nothing while the mu_helper module is off', () => {
    updateMuHelperLoop({} as World, 1);
    expect(watched).toEqual([]);
  });
});
