import { describe, expect, it, vi } from 'vitest';
import type { World } from '../../ecs/world';

const watched: string[] = [];
const on = vi.hoisted(() => ({ module: false, helper: { active: false }, state: {} as Record<string, unknown> }));
vi.mock('../module', () => ({ moduleOn: (id: string) => id !== 'mu_helper' || on.module }));
vi.mock('./state', () => ({
  ensureMuHelperWatching: () => watched.push('watch'),
  MuHelperState: on.state,
  MuHelper: on.helper,
}));

// The setup file's maps already loaded the loop against the real modules: load
// it again, on a fresh version handle, so the two mocks above are what it sees.
vi.stubGlobal('location', { search: '', hostname: 'localhost', href: 'http://localhost/' });
vi.resetModules();
await (await import('../../version')).loadGameVersion('season6');
const { updateMuHelperLoop } = await import('./loop');
const { defaultMuHelperConfig } = await import('./config');
const { HeroSkills } = await import('../skills');

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

  /** One helper tick with `buff` in the first buff slot and the hero wearing `effects`: whether it cast. */
  function buffTick(buff: number, effects: number[]): boolean {
    on.module = true;
    on.state.config = { ...defaultMuHelperConfig(), buffs: [buff, 0, 0] };
    HeroSkills.setSkillList([{ index: 0, number: buff, level: 0 }]);
    const hero = {
      transform: { pos: { x: 10, z: 10 } },
      attributeSystem: { isAboveZero: () => false },
      buffs: new Set(effects),
    };
    const world = {
      playerEntity: hero,
      mapIndex: 0,
      castRequest: null,
      pickupTarget: null,
      netObjsQuery: { entities: [] },
      playersQuery: { entities: [] },
    } as unknown as World;
    on.helper.active = true;
    updateMuHelperLoop(world, 0.3);
    const cast = world.castRequest !== null;
    on.helper.active = false;
    updateMuHelperLoop(world, 0.3);
    return cast;
  }

  it('checks a buff by skill number, as BuffTarget does (MuHelper.cpp:490)', () => {
    // Attack Increase Strengthener shows as Greater Damage (eBuff_Attack, 1).
    expect(buffTick(420, [1])).toBe(false);
    expect(buffTick(420, [])).toBe(true);
    // Swell Life Proficiency shows as eBuff_Life (8).
    expect(buffTick(360, [8])).toBe(false);
  });

  it('never casts a skill BuffTarget does not list', () => {
    expect(buffTick(422, [])).toBe(false);
  });
});
