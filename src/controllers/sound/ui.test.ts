import { describe, expect, it } from 'vitest';
import { consumeSound, upgradedItemSound } from './ui';

const POTION_GROUP = 14;
const APPLE = 0;
const ALE = 9;
const TOWN_PORTAL = 10;
const SMALL_SHIELD = 35;
const LARGE_COMPLEX = 40;
const BLESS = 13;
const LOST_MAP = 28;

describe('consumeSound', () => {
  it('crunches the apple and gulps the potions', () => {
    expect(consumeSound(POTION_GROUP, APPLE)).toBe('eatApple');
    for (let num = 1; num <= ALE; num++) {
      expect(consumeSound(POTION_GROUP, num)).toBe('drink');
    }
    for (let num = SMALL_SHIELD; num <= LARGE_COMPLEX; num++) {
      expect(consumeSound(POTION_GROUP, num)).toBe('drink');
    }
  });

  it('uses everything else in silence', () => {
    expect(consumeSound(POTION_GROUP, TOWN_PORTAL)).toBeNull();
    expect(consumeSound(POTION_GROUP, BLESS)).toBeNull();
    expect(consumeSound(POTION_GROUP, SMALL_SHIELD - 1)).toBeNull();
    expect(consumeSound(POTION_GROUP, LARGE_COMPLEX + 1)).toBeNull();
    expect(consumeSound(15, APPLE)).toBeNull();
  });
});

describe('upgradedItemSound', () => {
  it('plays the Kundun chime for a Lost Map and 14/111 only', () => {
    expect(upgradedItemSound(POTION_GROUP, LOST_MAP)).toBe('kundunItem');
    expect(upgradedItemSound(POTION_GROUP, 111)).toBe('kundunItem');
    expect(upgradedItemSound(POTION_GROUP, BLESS)).toBe('jewel');
    expect(upgradedItemSound(0, LOST_MAP)).toBe('jewel');
  });
});
