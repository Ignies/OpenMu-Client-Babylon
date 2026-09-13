import { describe, expect, it } from 'vitest';
import {
  buyRunStop,
  inventoryTarget,
  isValuableItem,
  type BuyRunState,
} from './quickItemRules';
import { StorageKind } from './itemStorage';
import { ItemGroup } from './itemStats';
import type { Item } from '../ecs/world';

const item = (over: Partial<Item> = {}): Item => ({
  group: ItemGroup.Sword,
  num: 0,
  lvl: 0,
  ...over,
});

describe('inventoryTarget', () => {
  it('sends nothing anywhere with no window open', () => {
    expect(inventoryTarget({ storage: null, shop: false })).toBeNull();
  });

  it('sells with only the merchant open', () => {
    expect(inventoryTarget({ storage: null, shop: true })).toEqual({ kind: 'sell' });
  });

  it('moves into the storage window that is open', () => {
    for (const to of [
      StorageKind.Vault,
      StorageKind.Trade,
      StorageKind.ChaosMachine,
      StorageKind.PersonalShop,
    ] as const) {
      expect(inventoryTarget({ storage: to, shop: false })).toEqual({
        kind: 'move',
        to,
      });
    }
  });

  it('prefers the storage window over the merchant', () => {
    expect(inventoryTarget({ storage: StorageKind.Vault, shop: true })).toEqual({
      kind: 'move',
      to: StorageKind.Vault,
    });
  });
});

describe('isValuableItem', () => {
  it('takes excellent and ancient', () => {
    expect(isValuableItem(item({ isExcellent: true }))).toBe(true);
    expect(isValuableItem(item({ isAncient: true }))).toBe(true);
  });

  it('takes +7 and up, not +6', () => {
    expect(isValuableItem(item({ lvl: 6 }))).toBe(false);
    expect(isValuableItem(item({ lvl: 7 }))).toBe(true);
    expect(isValuableItem(item({ lvl: 9 }))).toBe(true);
  });

  it('takes a jewel whatever its level', () => {
    // Bless, Soul, and the Chaos jewel that lives in the wing group.
    expect(isValuableItem(item({ group: ItemGroup.Potion, num: 13 }))).toBe(true);
    expect(isValuableItem(item({ group: ItemGroup.Potion, num: 14 }))).toBe(true);
    expect(isValuableItem(item({ group: ItemGroup.Wing, num: 15 }))).toBe(true);
  });

  it('leaves a plain item and a potion alone', () => {
    expect(isValuableItem(item())).toBe(false);
    expect(isValuableItem(item({ group: ItemGroup.Potion, num: 0 }))).toBe(false);
  });
});

describe('buyRunStop', () => {
  const state = (over: Partial<BuyRunState> = {}): BuyRunState => ({
    bought: 0,
    wanted: 20,
    item: item({ group: ItemGroup.Potion, num: 0 }),
    price: 100,
    money: 100000,
    freeSquare: 12,
    refused: false,
    ...over,
  });

  it('carries on while there is room, zen and count left', () => {
    expect(buyRunStop(state())).toBeNull();
    expect(buyRunStop(state({ bought: 19 }))).toBeNull();
  });

  it('stops on the count', () => {
    expect(buyRunStop(state({ bought: 20 }))).toBe('done');
    expect(buyRunStop(state({ bought: 21 }))).toBe('done');
  });

  it('stops when the stock slot empties', () => {
    expect(buyRunStop(state({ item: null }))).toBe('gone');
  });

  it('stops when the zen runs out', () => {
    expect(buyRunStop(state({ money: 99 }))).toBe('noZen');
    expect(buyRunStop(state({ money: 100 }))).toBeNull();
  });

  it('stops when the grid is full', () => {
    expect(buyRunStop(state({ freeSquare: -1 }))).toBe('noRoom');
  });

  it('stops on a refusal before anything else', () => {
    expect(buyRunStop(state({ refused: true, bought: 5 }))).toBe('refused');
  });
});
