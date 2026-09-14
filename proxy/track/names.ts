import monsters from '../../src/common/monsters.json';
import items from '../../src/common/items.json';
import { mapName as gmMapName } from '../../src/common/gmMaps';

/**
 * The names a journal line needs, from the tables the client already ships.
 * Read straight off the JSON rather than through `ItemsDatabase` /
 * `MonstersDatabase`: those reach for the language packs, and the proxy has
 * no Data folder to read them from.
 */

const MONSTER_NAMES = new Map<number, string>();
for (const monster of monsters) MONSTER_NAMES.set(monster.Numb, monster.Name);

const ITEM_NAMES = new Map<number, string>();
for (const item of items) ITEM_NAMES.set(item.Group * 512 + item.Index, item.ItemName);

export function monsterName(type: number): string {
  return MONSTER_NAMES.get(type) ?? `Monster ${type}`;
}

export function mapName(map: number): string {
  return gmMapName(map);
}

/**
 * An item's name from its 12 wire bytes (`ItemSerializer.DeserializeItem`'s
 * layout): number in byte 0 plus bit 7 of byte 3, level in bits 3-6 of byte
 * 1, the excellent bits in byte 3, the group in the high nibble of byte 5.
 */
export function itemName(data: Uint8Array): string {
  if (data.length < 6) return 'an item';

  const number = data[0] + ((data[3] & 0x80) << 1);
  const group = (data[5] & 0xf0) >> 4;
  const level = (data[1] & 0x78) >> 3;
  const excellent = (data[3] & 0x3f) !== 0;
  const luck = (data[1] & 0x04) !== 0;
  const skill = (data[1] & 0x80) !== 0;

  // Zen travels as an item too (group 14, number 15) with the amount in the
  // durability and option bytes.
  if (group === 14 && number === 15) {
    const amount = data[2] + (data[4] << 8) + (data[1] << 16);
    return `${amount} zen`;
  }

  const base = ITEM_NAMES.get(group * 512 + number) ?? `item ${group}/${number}`;
  const marks = [
    level > 0 ? `+${level}` : '',
    excellent ? 'exc' : '',
    luck ? 'luck' : '',
    skill ? 'skill' : '',
  ].filter(Boolean);

  return marks.length ? `${base} ${marks.join(' ')}` : base;
}

/** `ItemMoveRequest` storage kinds, as the inventory windows name them. */
const STORAGES: Readonly<Record<number, string>> = {
  0: 'inventory',
  2: 'vault',
  3: 'chaos machine',
  4: 'trade',
  5: 'store',
  7: 'pet trainer',
  8: 'refinery',
  9: 'smelting',
  10: 'item restore',
  11: 'chaos card',
  12: 'cherry blossom',
  13: 'seed crafting',
  14: 'seed sphere',
  15: 'seed apply',
  16: 'seed remove',
};

export function storageName(kind: number): string {
  return STORAGES[kind] ?? `storage ${kind}`;
}
