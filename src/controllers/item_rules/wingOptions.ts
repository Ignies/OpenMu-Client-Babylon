import type { Item } from '../../ecs/world';

/** What a wing's additional option raises: `AT_LIFE_REGENERATION` (option level) or one of the +4 kinds. */
export type WingOptionKind = 'life' | 'damage' | 'wizardry' | 'curse' | 'defense';
export type WingOption = 'maxHp' | 'maxMana' | 'ignoreDefense' | 'maxAg' | 'command' | 'returnDamage' | 'fullLife' | 'fullMana';

const key = (group: number, num: number) => `${group}/${num}`;

/** Wings with one kind whatever `OptionType` says (ZzzInfomation.cpp:1236-1251, :1302-1306). */
const ONE_KIND: Readonly<Record<string, WingOptionKind>> = {
  [key(12, 0)]: 'life', // Wings of Elf
  [key(12, 1)]: 'wizardry', // Wings of Heaven
  [key(12, 41)]: 'wizardry', // Wing of Curse
  [key(12, 2)]: 'damage', // Wings of Satan
  [key(13, 30)]: 'damage', // Cape of Lord
};

/** The kind by `OptionType` (ZzzInfomation.cpp:1252-1442). */
const BY_OPTION_TYPE: Readonly<Record<string, Partial<Record<number, WingOptionKind>>>> = {
  [key(12, 3)]: { 0: 'damage', 2: 'life' }, // Wings of Spirits
  [key(12, 4)]: { 0: 'life', 2: 'wizardry' }, // Wings of Soul
  [key(12, 5)]: { 0: 'life', 2: 'damage' }, // Wings of Dragon
  [key(12, 6)]: { 0: 'wizardry', 2: 'damage' }, // Wings of Darkness
  [key(12, 49)]: { 0: 'life', 2: 'damage' }, // Cape of Fighter
  [key(12, 42)]: { 0: 'curse', 2: 'wizardry' }, // Wings of Despair
  [key(12, 36)]: { 0: 'life', 2: 'defense', 3: 'damage' }, // Wing of Storm
  [key(12, 37)]: { 0: 'life', 2: 'defense', 3: 'wizardry' }, // Wing of Eternal
  [key(12, 38)]: { 0: 'life', 2: 'defense', 3: 'damage' }, // Wing of Illusion
  [key(12, 39)]: { 0: 'life', 2: 'wizardry', 3: 'damage' }, // Wing of Ruin
  [key(12, 40)]: { 0: 'life', 2: 'defense', 3: 'damage' }, // Cape of Emperor
  [key(12, 50)]: { 0: 'life', 2: 'defense', 3: 'damage' }, // Cape of Overrule
  [key(12, 43)]: { 0: 'life', 2: 'curse', 3: 'wizardry' }, // Wing of Dimension
};

const SECOND = new Set([key(12, 3), key(12, 4), key(12, 5), key(12, 6), key(12, 42)]);
const CAPES = new Set([key(13, 30), key(12, 49)]);
const THIRD = new Set([key(12, 36), key(12, 37), key(12, 38), key(12, 39), key(12, 40), key(12, 43), key(12, 50)]);

/** Wings and capes: their excellent byte holds wing options and the option's kind, never excellent options. */
export function isOptionWing(group: number, num: number): boolean {
  const id = key(group, num);
  return id in ONE_KIND || id in BY_OPTION_TYPE;
}

/** The kind of the item's additional option, or null when its `OptionType` names none. */
export function wingOptionKind(item: Item): WingOptionKind | null {
  const id = key(item.group, item.num);
  return ONE_KIND[id] ?? BY_OPTION_TYPE[id]?.[item.wingOptionKind ?? 0] ?? null;
}

/**
 * `CalcWingOptions` (ZzzInfomation.cpp:855-940) in bit order. The second wings' attack speed bit
 * is left out: in the 12-byte item it is the option kind's.
 */
export function wingOptions(item: Item): { option: WingOption; value: number }[] {
  const id = key(item.group, item.num);
  const flags = item.wingOptions ?? 0;
  const level = item.lvl ?? 0;
  const out: { option: WingOption; value: number }[] = [];
  const add = (bit: number, option: WingOption, value: number) => {
    if (flags & bit) out.push({ option, value });
  };
  if (SECOND.has(id) || CAPES.has(id)) {
    add(0x01, 'maxHp', 50 + level * 5);
    add(0x02, 'maxMana', 50 + level * 5);
    add(0x04, 'ignoreDefense', 3);
    if (SECOND.has(id)) add(0x08, 'maxAg', 50);
    else if (id === key(13, 30)) add(0x08, 'command', 10 + level * 5);
  } else if (THIRD.has(id)) {
    add(0x01, 'ignoreDefense', 5);
    add(0x02, 'returnDamage', 5);
    add(0x04, 'fullLife', 5);
    add(0x08, 'fullMana', 5);
  }
  return out;
}
