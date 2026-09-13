import { describe, expect, it } from 'vitest';
import { decodeItem, sameItem } from './itemMatch';

/**
 * The check that stops a seller handing over something other than what they
 * listed. The one that let boots go out as gloves was "one item on the
 * table"; this is "the item on the table".
 */

/** Twelve wire bytes for an item, the way the server serialises one. */
function wire(o: {
  group: number;
  num: number;
  lvl?: number;
  luck?: boolean;
  skill?: boolean;
  option?: number;
  excellent?: number;
  ancient?: number;
  durability?: number;
}): Uint8Array {
  const b = new Uint8Array(12);
  b[0] = o.num & 0xff;
  b[1] = ((o.lvl ?? 0) << 3) | (o.skill ? 0x80 : 0) | (o.luck ? 0x04 : 0) | ((o.option ?? 0) & 0x03);
  b[2] = o.durability ?? 20;
  b[3] = ((o.num & 0x100) >> 1) | ((o.option ?? 0) >= 4 ? 0x40 : 0) | ((o.excellent ?? 0) & 0x3f);
  b[4] = o.ancient ?? 0;
  b[5] = (o.group & 0x0f) << 4;
  return b;
}

const gloves = { group: 10, num: 1, lvl: 7 };
const boots = { group: 11, num: 1, lvl: 7 };

describe('decodeItem', () => {
  it('reads the fields a listing is matched on', () => {
    const item = decodeItem(wire({ group: 10, num: 257, lvl: 9, luck: true, skill: true, option: 5, excellent: 0x21, ancient: 2 }));
    expect(item).toMatchObject({
      group: 10,
      num: 257,
      lvl: 9,
      luck: true,
      hasSkill: true,
      optionLevel: 5,
      excellentFlags: 0x21,
      ancientDiscriminator: 2,
    });
  });
});

describe('sameItem by fields', () => {
  it('accepts the listed item', () => {
    expect(sameItem(wire(gloves), gloves)).toBe(true);
  });

  it('refuses another item of the same level', () => {
    expect(sameItem(wire(boots), gloves)).toBe(false);
  });

  it('refuses the same item at another level', () => {
    expect(sameItem(wire({ ...gloves, lvl: 9 }), gloves)).toBe(false);
  });

  it('refuses a plain item against an excellent listing, and the other way round', () => {
    expect(sameItem(wire(gloves), { ...gloves, isExcellent: true, excellentFlags: 4 })).toBe(false);
    expect(sameItem(wire({ ...gloves, excellent: 4 }), gloves)).toBe(false);
  });

  it('refuses when luck, skill or option differ', () => {
    expect(sameItem(wire({ ...gloves, luck: true }), gloves)).toBe(false);
    expect(sameItem(wire(gloves), { ...gloves, hasSkill: true })).toBe(false);
    expect(sameItem(wire({ ...gloves, option: 4 }), { ...gloves, optionLevel: 3 })).toBe(false);
    expect(sameItem(wire({ ...gloves, option: 4 }), { ...gloves, optionLevel: 4 })).toBe(true);
  });

  it('ignores durability: it wears down between listing and handover', () => {
    expect(sameItem(wire({ ...gloves, durability: 3 }), gloves)).toBe(true);
  });
});

describe('sameItem by raw bytes', () => {
  it('compares the bytes the window sent, durability aside', () => {
    const listed = { ...gloves, raw: Array.from(wire({ ...gloves, luck: true, durability: 20 })) };
    expect(sameItem(wire({ ...gloves, luck: true, durability: 4 }), listed)).toBe(true);
    expect(sameItem(wire({ ...gloves, luck: false }), listed)).toBe(false);
    expect(sameItem(wire({ ...boots, luck: true }), listed)).toBe(false);
  });

  it('falls back to the fields when raw is not a byte array', () => {
    expect(sameItem(wire(gloves), { ...gloves, raw: 'nonsense' })).toBe(true);
    expect(sameItem(wire(gloves), { ...gloves, raw: [1, 2, 3] })).toBe(true);
    expect(sameItem(wire(gloves), { ...gloves, raw: Array(12).fill(999) })).toBe(true);
  });
});
