import { describe, expect, it, vi } from 'vitest';
import type { World } from '../../ecs/world';

const watched: string[] = [];
const on = vi.hoisted(() => ({ module: false, helper: { active: false }, state: {} as Record<string, unknown> }));
vi.mock('../module', () => ({ moduleOn: (id: string) => id !== 'mu_helper' || on.module }));
/** The item file row the pickup filter reads the drop's name from. */
vi.mock('@/controllers/item_rules', async importOriginal => {
  const real = await importOriginal<typeof import('@/controllers/item_rules')>();
  return { ...real, itemDef: (g: number, i: number) => (g === 6 && i === 4 ? { name: 'Guardian Shield' } : real.itemDef(g, i)) };
});
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
const { GameOptions } = await import('@/controllers/settings');

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

  /** One helper tick with a drop next to the hero: what it sends the hero to pick up. */
  function pickupTick(pickupAsked: boolean): unknown {
    on.module = true;
    on.state.config = { ...defaultMuHelperConfig(), pickAllItems: true };
    const drop = {
      netId: 5,
      worldIndex: 0,
      transform: { pos: { x: 11, z: 10 } },
      droppedItem: { isMoney: false, group: 14, num: 0, pickupAsked },
    };
    const world = {
      playerEntity: { transform: { pos: { x: 10, z: 10 } }, attributeSystem: { isAboveZero: () => false } },
      mapIndex: 0,
      castRequest: null,
      pickupTarget: null,
      netObjsQuery: { entities: [drop] },
      playersQuery: { entities: [] },
    } as unknown as World;
    on.helper.active = true;
    updateMuHelperLoop(world, 0.3);
    const target = world.pickupTarget === (drop as unknown) ? 'drop' : world.pickupTarget;
    on.helper.active = false;
    updateMuHelperLoop(world, 0.3);
    return target;
  }

  it('asks for a drop once: after its pickup request it is left alone (DeleteItem, MuHelper.cpp:1252)', () => {
    expect(pickupTick(false)).toBe('drop');
    expect(pickupTick(true)).toBeNull();
  });

  /** Whether one tick goes for a lucky or plain Guardian Shield listed as `entry`, filters on or off. */
  function extraItemTick(entry: string, luck: boolean, filters: boolean): boolean {
    GameOptions.helperItemFilters = filters;
    on.module = true;
    on.state.config = { ...defaultMuHelperConfig(), pickExtraItems: true, extraItems: [entry] };
    const drop = {
      worldIndex: 0,
      transform: { pos: { x: 11, z: 10 } },
      droppedItem: { isMoney: false, group: 6, num: 4, item: { group: 6, num: 4, luck } },
    };
    const world = {
      playerEntity: { transform: { pos: { x: 10, z: 10 } }, attributeSystem: { isAboveZero: () => false } },
      mapIndex: 0,
      castRequest: null,
      pickupTarget: null,
      netObjsQuery: { entities: [drop] },
      playersQuery: { entities: [] },
    } as unknown as World;
    on.helper.active = true;
    updateMuHelperLoop(world, 0.3);
    const picked = world.pickupTarget === (drop as unknown);
    on.helper.active = false;
    updateMuHelperLoop(world, 0.3);
    GameOptions.helperItemFilters = false;
    return picked;
  }

  it('matches extra items by name only, as the original, until the player turns the filters on', () => {
    expect(extraItemTick('Guardian', false, false)).toBe(true);
    expect(extraItemTick('Guardian Shield +Luck', true, false)).toBe(false);
    expect(extraItemTick('Guardian Shield +Luck', true, true)).toBe(true);
    expect(extraItemTick('Guardian Shield +Luck', false, true)).toBe(false);
  });
});
