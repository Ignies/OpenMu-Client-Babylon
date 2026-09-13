import { afterEach, describe, expect, it } from 'vitest';
import { GameOptions, setGameOption } from '../common/gameOptions';
import { dropSound, dropSoundAllowed, type DropSoundInfo } from './drops';

/**
 * The case the whole screen was written around: "only excellent items and
 * jewels" has to be six boxes and nothing else.
 */

const JEWEL_GROUP = 14;
const BLESS = 13;
const GEMSTONE = 41;
const SWORD_GROUP = 0;

const zen: DropSoundInfo = { isMoney: true, group: JEWEL_GROUP, num: 15 };
const bless: DropSoundInfo = {
  isMoney: false,
  item: { group: JEWEL_GROUP, num: BLESS },
  group: JEWEL_GROUP,
  num: BLESS,
};
const gemstone: DropSoundInfo = {
  isMoney: false,
  item: { group: JEWEL_GROUP, num: GEMSTONE },
  group: JEWEL_GROUP,
  num: GEMSTONE,
};
const plainSword: DropSoundInfo = {
  isMoney: false,
  item: { group: SWORD_GROUP, num: 0, lvl: 0 },
  group: SWORD_GROUP,
  num: 0,
};
const excellentSword: DropSoundInfo = {
  isMoney: false,
  item: { group: SWORD_GROUP, num: 0, isExcellent: true },
  group: SWORD_GROUP,
  num: 0,
};
const highSword: DropSoundInfo = {
  isMoney: false,
  item: { group: SWORD_GROUP, num: 0, lvl: 9 },
  group: SWORD_GROUP,
  num: 0,
};

const saved = new Map<string, unknown>();

const set = <K extends keyof typeof GameOptions>(key: K, value: (typeof GameOptions)[K]) => {
  if (!saved.has(key)) saved.set(key, GameOptions[key]);
  setGameOption(key, value);
};

afterEach(() => {
  for (const [key, value] of saved) {
    setGameOption(key as keyof typeof GameOptions, value as never);
  }
  saved.clear();
});

describe('drop sounds', () => {
  it('keeps the original key per drop', () => {
    expect(dropSound(zen)).toBe('Sound/pDropMoney');
    expect(dropSound(bless)).toBe('Sound/eGem');
    expect(dropSound(gemstone)).toBe('Sound/Jewel_Sound');
    expect(dropSound(plainSword)).toBe('Sound/pDropItem');
  });

  it('sounds every drop while the filter is off', () => {
    for (const drop of [zen, bless, plainSword, excellentSword, highSword]) {
      expect(dropSoundAllowed(drop)).toBe(true);
    }
  });

  it('passes only excellent items and jewels when asked for those', () => {
    set('dropSoundFilter', true);
    set('dropSoundJewels', true);
    set('dropSoundExcellent', true);
    set('dropSoundAncient', false);
    set('dropSoundHighLevel', false);
    set('dropSoundOther', false);
    set('dropSoundZen', false);

    expect(dropSoundAllowed(bless)).toBe(true);
    expect(dropSoundAllowed(gemstone)).toBe(true);
    expect(dropSoundAllowed(excellentSword)).toBe(true);

    expect(dropSoundAllowed(zen)).toBe(false);
    expect(dropSoundAllowed(plainSword)).toBe(false);
    expect(dropSoundAllowed(highSword)).toBe(false);
  });

  it('lets zen through on its own row', () => {
    set('dropSoundFilter', true);
    set('dropSoundZen', true);
    set('dropSoundOther', false);

    expect(dropSoundAllowed(zen)).toBe(true);
    expect(dropSoundAllowed(plainSword)).toBe(false);
  });

  it('catches what no other row claims with "everything else"', () => {
    set('dropSoundFilter', true);
    set('dropSoundJewels', false);
    set('dropSoundExcellent', false);
    set('dropSoundAncient', false);
    set('dropSoundHighLevel', false);
    set('dropSoundOther', true);

    expect(dropSoundAllowed(plainSword)).toBe(true);
    expect(dropSoundAllowed(bless)).toBe(true);
    // Zen is its own row: "everything else" never speaks for it.
    expect(dropSoundAllowed(zen)).toBe(false);
  });
});
