import { beforeAll, describe, expect, it } from 'vitest';
import { i18n } from '../i18n';
import type { Item } from '../ecs/world';
import { comparedItem } from './itemCompare';
import { buildItemTooltip, type TooltipLine } from './itemTooltip';
import type { HeroStats } from './itemStats';

/**
 * Items the table actually carries, so the numbers below are the client's own:
 * Kris (6-11, speed 50, 40 str), Blade (36-47, speed 30, 80 str), Bill of
 * Balrog (two-handed, Dark Knight only), Small and Horn Shield, Skull Staff
 * (Dark Wizard only) and two rings.
 */
const KRIS: Item = { group: 0, num: 0 };
const BLADE: Item = { group: 0, num: 5 };
const BILL_OF_BALROG: Item = { group: 3, num: 9 };
const SMALL_SHIELD: Item = { group: 6, num: 0 };
const HORN_SHIELD: Item = { group: 6, num: 1 };
const SKULL_STAFF: Item = { group: 5, num: 0 };
const RING_OF_ICE: Item = { group: 13, num: 8 };
const RING_OF_POISON: Item = { group: 13, num: 9 };
const BRONZE_HELM: Item = { group: 7, num: 0 };

/** A Blade Knight with the stats for anything in the list. */
const KNIGHT: HeroStats = {
  level: 200,
  str: 500,
  agi: 500,
  vit: 500,
  ene: 500,
  cmd: 0,
  baseClass: 1,
  stepClass: 2,
};

const LEFT_HAND = 0;
const RIGHT_HAND = 1;
const HELM = 2;
const RING_1 = 10;
const RING_2 = 11;

function worn(items: Record<number, Item>): (Item | null)[] {
  const slots: (Item | null)[] = new Array(12).fill(null);
  for (const [slot, item] of Object.entries(items)) slots[Number(slot)] = item;
  return slots;
}

describe('which worn item a tooltip compares with', () => {
  it('takes the weapon in the hand the hovered one would fill', () => {
    const slots = worn({ [LEFT_HAND]: KRIS });
    expect(comparedItem(BLADE, slots, KNIGHT)).toBe(KRIS);
  });

  it('measures a two-hander against the worn weapon, not the shield', () => {
    const slots = worn({ [LEFT_HAND]: BLADE, [RIGHT_HAND]: SMALL_SHIELD });
    expect(comparedItem(BILL_OF_BALROG, slots, KNIGHT)).toBe(BLADE);
  });

  it('never measures a weapon against a shield in the off hand', () => {
    const slots = worn({ [RIGHT_HAND]: SMALL_SHIELD });
    expect(comparedItem(BLADE, slots, KNIGHT)).toBeNull();
  });

  it('measures a shield against the shield hand', () => {
    const slots = worn({ [RIGHT_HAND]: SMALL_SHIELD });
    expect(comparedItem(HORN_SHIELD, slots, KNIGHT)).toBe(SMALL_SHIELD);
  });

  it('never measures a shield against a worn weapon', () => {
    const slots = worn({ [LEFT_HAND]: BLADE });
    expect(comparedItem(SMALL_SHIELD, slots, KNIGHT)).toBeNull();
  });

  it('matches armour slot for slot', () => {
    const other: Item = { group: 7, num: 5 };
    const slots = worn({ [HELM]: BRONZE_HELM });
    expect(comparedItem(other, slots, KNIGHT)).toBe(BRONZE_HELM);
  });

  it('takes the first worn ring of the pair', () => {
    const both = worn({ [RING_1]: RING_OF_ICE, [RING_2]: RING_OF_POISON });
    expect(comparedItem({ group: 13, num: 21 }, both, KNIGHT)).toBe(RING_OF_ICE);

    const second = worn({ [RING_2]: RING_OF_POISON });
    expect(comparedItem({ group: 13, num: 21 }, second, KNIGHT)).toBe(
      RING_OF_POISON
    );
  });

  it('shows one box for the worn item itself', () => {
    const slots = worn({ [LEFT_HAND]: BLADE });
    expect(comparedItem(BLADE, slots, KNIGHT)).toBeNull();
  });

  it('shows one box for gear the class can never wear', () => {
    const slots = worn({ [LEFT_HAND]: BLADE });
    expect(comparedItem(SKULL_STAFF, slots, KNIGHT)).toBeNull();
  });

  it('shows one box when the slot is empty', () => {
    expect(comparedItem(BLADE, worn({}), KNIGHT)).toBeNull();
  });

  it('shows one box for something that is not gear', () => {
    const potion: Item = { group: 14, num: 0, durability: 3 };
    expect(comparedItem(potion, worn({ [LEFT_HAND]: BLADE }), KNIGHT)).toBeNull();
  });
});

function lineStarting(lines: TooltipLine[], prefix: string): TooltipLine {
  const line = lines.find(entry => entry.text.startsWith(prefix));
  if (!line) throw new Error(`no tooltip line starting with "${prefix}"`);
  return line;
}

describe('the deltas on a compared tooltip', () => {
  beforeAll(() => i18n.setLanguage('en'));

  const build = (item: Item, against?: Item) => {
    const data = buildItemTooltip(item, KNIGHT, against);
    if (!data) throw new Error('no tooltip');
    return data.lines;
  };

  it('leaves every line bare without a comparison', () => {
    expect(build(BLADE).every(line => line.delta === undefined)).toBe(true);
  });

  it('marks the better damage green and the worse red', () => {
    const up = lineStarting(build(BLADE, KRIS), 'One-handed Attack Power');
    expect(up.delta).toEqual({ text: '(+30 / +36)', color: 'green' });

    const down = lineStarting(build(KRIS, BLADE), 'One-handed Attack Power');
    expect(down.delta).toEqual({ text: '(-30 / -36)', color: 'red' });
  });

  it('folds a range that moved by the same amount into one number', () => {
    const kris9: Item = { group: 0, num: 0, lvl: 9 };
    const line = lineStarting(build(kris9, KRIS), 'One-handed Attack Power');
    expect(line.delta).toEqual({ text: '(+27)', color: 'green' });
  });

  it('marks attack speed and durability', () => {
    const lines = build(BLADE, KRIS);
    expect(lineStarting(lines, 'Attack Speed').delta).toEqual({
      text: '(-20)',
      color: 'red',
    });
    expect(lineStarting(lines, 'Durability').delta).toEqual({
      text: '(+19)',
      color: 'green',
    });
  });

  it('marks defence and defence rate', () => {
    const lines = build(HORN_SHIELD, SMALL_SHIELD);
    expect(lineStarting(lines, 'Defense:').delta).toEqual({
      text: '(+2)',
      color: 'green',
    });
    expect(lineStarting(lines, 'Defense Success Rate').delta).toEqual({
      text: '(+24)',
      color: 'green',
    });
  });

  it('reads a bigger requirement as the worse number', () => {
    const harder = lineStarting(build(BLADE, KRIS), 'Required Strength');
    expect(harder.delta?.color).toBe('red');
    expect(harder.delta?.text.startsWith('(+')).toBe(true);

    const easier = lineStarting(build(KRIS, BLADE), 'Required Strength');
    expect(easier.delta?.color).toBe('green');
    expect(easier.delta?.text.startsWith('(-')).toBe(true);
  });

  it('leaves a line alone when the two items match', () => {
    const lines = build(BLADE, { group: 0, num: 5 });
    expect(lines.every(line => line.delta === undefined)).toBe(true);
  });
});
