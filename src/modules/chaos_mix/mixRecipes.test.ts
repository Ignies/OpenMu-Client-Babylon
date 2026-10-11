import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Item } from '@/ecs/world';
import { loadMixRecipes, mixRecipes } from '@/controllers/assets';
import { checkMix, isMixSource, sourceStatus } from './mixRecipes';

const MIX = 'Data/Local/mix.bmd';

const chaos: Item = { group: 12, num: 15, durability: 1 };
const bless: Item = { group: 14, num: 13, durability: 1 };
const soul: Item = { group: 14, num: 14, durability: 1 };
const creation: Item = { group: 14, num: 22, durability: 1 };
const sword = (more: Partial<Item> = {}): Item => ({ group: 0, num: 0, lvl: 9, durability: 20, ...more });

// CMixRecipes::CheckRecipe / CheckRecipeSimilarity / IsMixSource (MixMgr.cpp:254-509) on the real Mix.bmd.
describe.skipIf(!existsSync(MIX))('the chaos machine recipes', () => {
  loadMixRecipes(new Uint8Array(readFileSync(MIX)));
  const [goblin, chaosWeapon] = mixRecipes() ?? [];

  it('makes a fruit from a Jewel of Creation and a Jewel of Chaos', () => {
    const check = checkMix(goblin, [creation, chaos]);
    expect(check.recipe?.mixId).toBe(6);
    expect(check.successRate).toBe(90);
    expect(check.requiredZen).toBe(3000000);
  });

  it('upgrades a +9 item, the plain recipe 60% and the excellent one 50%, luck adding 25', () => {
    expect(checkMix(goblin, [sword(), chaos, bless, soul])).toMatchObject({ recipe: { mixId: 3 }, successRate: 60, requiredZen: 2000000 });
    expect(checkMix(goblin, [sword({ luck: true }), chaos, bless, soul]).successRate).toBe(85);
    expect(checkMix(goblin, [sword({ isExcellent: true, excellentFlags: 1 }), chaos, bless, soul]).successRate).toBe(50);
  });

  it('names no recipe for an empty or wrong tray', () => {
    expect(checkMix(goblin, [])).toMatchObject({ recipe: null, empty: true });
    expect(checkMix(goblin, [chaos, chaos]).recipe).toBeNull();
  });

  it('points at the recipe a tray is short of, marking what is there', () => {
    const check = checkMix(goblin, [sword(), chaos]);
    expect(check.recipe).toBeNull();
    expect(check.similar?.mixId).toBe(3);
    expect([0, 1, 2, 3].map(i => sourceStatus(check, i))).toEqual(['yes', 'yes', 'no', 'no']);
  });

  it('prices the chaos weapon by the items put in', () => {
    const check = checkMix(chaosWeapon, [sword({ lvl: 4, optionLevel: 1 }), chaos]);
    expect(check.recipe?.mixId).toBe(1);
    expect(check.requiredZen).toBe(check.successRate * 10000);
  });

  it('takes only what some recipe can use', () => {
    const empty = checkMix(goblin, []);
    expect(isMixSource(goblin, chaos, empty)).toBe(true);
    expect(isMixSource(goblin, sword({ lvl: 0 }), empty)).toBe(false);
    expect(isMixSource(goblin, { group: 8, num: 62, lvl: 9 }, empty)).toBe(false);
  });
});

// CheckRecipeSub's 'H' / 'I' (MixMgr.cpp:370-371, :1063-1081): a weapon takes a fire, ice or lightning
// sphere, armour a water, wind or earth one.
describe.skipIf(!existsSync(MIX))('the seed sphere application recipes', () => {
  loadMixRecipes(new Uint8Array(readFileSync(MIX)));
  const attach = (mixRecipes() ?? [])[12] ?? [];
  const socketSword: Item = { group: 0, num: 26, lvl: 0, durability: 50, socketCount: 3, sockets: [0xfe, 0xfe, 0xfe] };
  const sphere = (num: number): Item => ({ group: 12, num, lvl: 0, durability: 1 });

  it('mounts a fire sphere on a socket weapon', () => {
    expect(checkMix(attach, [socketSword, sphere(100), chaos, creation]).recipe?.mixId).toBe(44);
  });

  it('refuses a water sphere on a weapon', () => {
    expect(checkMix(attach, [socketSword, sphere(101), chaos, creation]).recipe).toBeNull();
  });
});
