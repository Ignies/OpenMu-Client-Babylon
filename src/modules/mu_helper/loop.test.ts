import { describe, expect, it, vi } from 'vitest';
import type { World } from '../../ecs/world';

const watched: string[] = [];
const on = vi.hoisted(() => ({ module: false, helper: { active: false } }));
vi.mock('../module', () => ({ moduleOn: (id: string) => id !== 'mu_helper' || on.module }));
vi.mock('./state', () => ({
  ensureMuHelperWatching: () => watched.push('watch'),
  MuHelperState: {},
  MuHelper: on.helper,
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

  it('lets go of the cast, the swing and the pickup it was on when switched off', () => {
    on.module = true;
    const hero = { transform: { pos: { x: 10, z: 10 } }, attributeSystem: { isAboveZero: () => false } };
    const world = {
      playerEntity: hero,
      mapIndex: 0,
      castRequest: { target: null, point: { x: 12, y: 12 } },
      attackTarget: {},
      pickupTarget: {},
    } as unknown as World;
    on.helper.active = true;
    updateMuHelperLoop(world, 0.1);
    on.helper.active = false;
    updateMuHelperLoop(world, 0.1);
    expect([world.castRequest, world.attackTarget, world.pickupTarget]).toEqual([null, null, null]);
  });
});
