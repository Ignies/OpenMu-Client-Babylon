import { describe, expect, it } from 'vitest';
import type { Item } from '../ecs/world';
import { ItemSerializer } from './itemSerializer';
import { DARK_HORSE, PET_GROUP } from './petConstants';

function serialize(item: Item): Uint8Array {
  const bytes = new Uint8Array(ItemSerializer.NeededSpace);
  ItemSerializer.SerializeItem(bytes, item);
  return bytes;
}

function roundTrip(item: Item): Item {
  return ItemSerializer.DeserializeItem(serialize(item));
}

describe('ItemSerializer round-trip', () => {
  it('plain item', () => {
    const back = roundTrip({ group: 0, num: 5, lvl: 0, durability: 20 });
    expect(back.group).toBe(0);
    expect(back.num).toBe(5);
    expect(back.lvl).toBe(0);
    expect(back.durability).toBe(20);
    expect(back.hasSkill).toBeUndefined();
    expect(back.luck).toBeUndefined();
    expect(back.optionLevel).toBeUndefined();
    expect(back.isExcellent).toBe(false);
    expect(back.isAncient).toBeUndefined();
    expect(back.socketCount).toBe(0);
  });

  it('+13 lucky skill item with option level 7', () => {
    const item: Item = {
      group: 0,
      num: 5,
      lvl: 13,
      luck: true,
      hasSkill: true,
      optionLevel: 7,
      durability: 255,
    };
    const bytes = serialize(item);
    expect(bytes[1]).toBe(((13 << 3) & 0x78) | 0x80 | 0x04 | 0x03);
    expect(bytes[3] & 0x40).toBe(0x40);

    const back = roundTrip(item);
    expect(back.lvl).toBe(13);
    expect(back.luck).toBe(true);
    expect(back.hasSkill).toBe(true);
    expect(back.optionLevel).toBe(7);
    expect(back.durability).toBe(255);
  });

  it('excellent item', () => {
    const back = roundTrip({ group: 5, num: 11, lvl: 9, excellentFlags: 0x21 });
    expect(back.isExcellent).toBe(true);
    expect(back.excellentFlags).toBe(0x21);
    expect(back.lvl).toBe(9);
  });

  it('ancient item', () => {
    const back = roundTrip({
      group: 8,
      num: 5,
      lvl: 7,
      isAncient: true,
      ancientDiscriminator: 2,
      ancientBonusLevel: 1,
    });
    expect(back.isAncient).toBe(true);
    expect(back.ancientDiscriminator).toBe(2);
    expect(back.ancientBonusLevel).toBe(1);
  });

  it('socketed item', () => {
    const item: Item = {
      group: 5,
      num: 30,
      lvl: 4,
      socketCount: 3,
      sockets: [5, 0xfe, 10],
      socketBonus: 1,
    };
    const bytes = serialize(item);
    expect(Array.from(bytes.slice(7, 12))).toEqual([5, 0xfe, 10, 0xff, 0xff]);

    const back = roundTrip(item);
    expect(back.socketCount).toBe(3);
    expect(back.sockets).toEqual([5, 0xfe, 10]);
    expect(back.socketBonus).toBe(1);
  });

  it('trainable pet keeps level out of the level bits', () => {
    const item: Item = { group: PET_GROUP, num: DARK_HORSE, lvl: 30 };
    const bytes = serialize(item);
    expect(bytes[1] & 0x78).toBe(0);
    expect(bytes[2]).toBe(30);

    const back = roundTrip(item);
    expect(back.lvl).toBe(0);
    expect(back.durability).toBe(30);
  });

  it('item number above 255', () => {
    const item: Item = { group: 13, num: 300, lvl: 0 };
    const bytes = serialize(item);
    expect(bytes[0]).toBe(300 & 0xff);
    expect(bytes[3] & 0x80).toBe(0x80);

    const back = roundTrip(item);
    expect(back.num).toBe(300);
    expect(back.group).toBe(13);
  });

  it('number 128-255 does not gain a phantom high bit', () => {
    const back = roundTrip({ group: 12, num: 200 });
    expect(back.num).toBe(200);
  });

  it('raw bytes survive a full serialize of the deserialized item', () => {
    const wire = new Uint8Array([
      0x2c, 0xef, 0x80, 0x61, 0x06, 0xd0, 0x02, 0x05, 0xfe, 0xff, 0xff, 0xff,
    ]);
    const item = ItemSerializer.DeserializeItem(wire);
    expect(Array.from(serialize(item))).toEqual(Array.from(wire));
  });
});
