import { describe, expect, it } from 'vitest';
import { t } from '@/i18n';
import type { Item } from '@/ecs/world';
import { BaseClass } from '@/modules/hero/characterStats';
import { defenseText, fruitPoints, fullSet } from './lines';

// NewUICharacterInfoWindow.cpp:977-1017.
describe('the defense line', () => {
  const stats = { defense: 300, harmonyDefense: 20, defenseRate: 150, blockingBuff: 0 };

  it('prints the rate and, with the full set, a tenth of it', () => {
    expect(defenseText(stats, true)).toBe(t('charInfo.defenseRateFull', { defense: 300, rate: 150, bonus: 15 }));
    expect(defenseText(stats, false)).toBe(t('charInfo.defenseRate', { defense: 300, rate: 150 }));
  });

  it("adds the defense buff's share to the bonus, or prints it alone without the full set (:982-1006)", () => {
    const buffed = { ...stats, blockingBuff: 70 };
    expect(defenseText(buffed, true)).toBe(t('charInfo.defenseRateFull', { defense: 300, rate: 150, bonus: 85 }));
    expect(defenseText(buffed, false)).toBe(t('charInfo.defenseRateFull', { defense: 300, rate: 150, bonus: 70 }));
  });

  it('prints the defense alone without a rate, a tenth without harmony with the full set (:996-1016)', () => {
    const none = { ...stats, defenseRate: 0, blockingBuff: 0 };
    expect(defenseText(none, true)).toBe(t('charInfo.defenseFull', { defense: 300, bonus: 28 }));
    expect(defenseText(none, false)).toBe(t('charInfo.defense', { defense: 300 }));
  });
});

// bDexSuccess (NewUICharacterInfoWindow.cpp:830-901): five unbroken pieces of one set; the gladiator needs no helm and wears
// only his own armours, the fighter needs no gloves.
describe('the full set bonus', () => {
  const set = (num: number, more: Record<number, Partial<Item> | null> = {}) => {
    const items: (Item | null)[] = new Array(12).fill(null);
    for (let slot = 2; slot <= 6; slot++) items[slot] = { group: slot + 5, num, durability: 50 };
    for (const [slot, item] of Object.entries(more)) items[Number(slot)] = item ? { group: Number(slot) + 5, num, durability: 50, ...item } : null;
    return items;
  };

  it('needs five pieces of one set, none broken', () => {
    expect(fullSet(set(3), BaseClass.Knight)).toBe(true);
    expect(fullSet(set(3, { 4: { num: 4 } }), BaseClass.Knight)).toBe(false);
    expect(fullSet(set(3, { 2: null }), BaseClass.Knight)).toBe(false);
    expect(fullSet(set(3, { 6: { durability: 0 } }), BaseClass.Knight)).toBe(false);
  });

  it("lets the gladiator go without a helm in his own armours, and the fighter without gloves", () => {
    expect(fullSet(set(15, { 2: null }), BaseClass.MagicGladiator)).toBe(true);
    expect(fullSet(set(15, { 2: { num: 1 } }), BaseClass.MagicGladiator)).toBe(true);
    expect(fullSet(set(3, { 2: null }), BaseClass.MagicGladiator)).toBe(false);
    expect(fullSet(set(15, { 2: { durability: 0 } }), BaseClass.MagicGladiator)).toBe(false);
    expect(fullSet(set(59, { 5: null }), BaseClass.RageFighter)).toBe(true);
    expect(fullSet(set(59, { 5: { num: 1 } }), BaseClass.RageFighter)).toBe(true);
  });
});

// RenderTableTexts (NewUICharacterInfoWindow.cpp:333-352): the fruit counts, all 0 up to level 9.
describe('the fruit points line', () => {
  it('prints the used and the most fruit points, the decrease ones negative, from level 10', () => {
    expect(fruitPoints(10, { used: 3, max: 120, minusUsed: 2, minusMax: 120 })).toBe('Create 3/120 | Decrease -2/-120');
    expect(fruitPoints(10, { used: 0, max: 120, minusUsed: 0, minusMax: 120 })).toBe('Create 0/120 | Decrease 0/-120');
    expect(fruitPoints(9, { used: 3, max: 120, minusUsed: 2, minusMax: 120 })).toBe('Create 0/0 | Decrease 0/0');
  });
});
