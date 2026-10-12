import type { Item } from '../../ecs/world';
import type { ItemOptionTables } from '../assets/mu';

/** `MAX_SOCKET_OPTION`: a socket byte is `seed + (sphere level - 1) * 50`. */
const SOCKET_OPTIONS = 50;
/** A socket slot with nothing in it. */
const EMPTY_SOCKET = 0xfe;

/** The armour sets of `IsSocketItem` (SocketSystem.cpp:39-74), indexes 45-53 of groups 7-11. */
const SOCKET_SET_FIRST = 45;
const SOCKET_SET_LAST = 53;
/** The socket weapons and shields of `IsSocketItem`, by group. */
const SOCKET_ITEMS: Readonly<Record<number, readonly number[]>> = {
  0: [26, 27, 28],
  2: [16, 17],
  4: [23],
  5: [30, 31, 32],
  6: [17, 18, 19, 20],
};

/** `IsSocketItem`: by item type, not by the slots the item came with. */
export function isSocketItem(group: number, num: number): boolean {
  if (group >= 7 && group <= 11) return num >= SOCKET_SET_FIRST && num <= SOCKET_SET_LAST;
  return SOCKET_ITEMS[group]?.includes(num) ?? false;
}

/** The 380 option: bit 3 of byte 5, only in the bytes the server sent (NewUIItemMng.cpp:209-213). */
export function hasGuardianOption(item: Item): boolean {
  return ((item.raw?.[5] ?? 0) & 0x08) !== 0;
}

/** `bExpiredPeriod`: bit 2 of byte 5, a period item whose time ran out (NewUIItemMng.cpp:274-281). */
export function periodExpired(item: Item): boolean {
  return ((item.raw?.[5] ?? 0) & 0x04) !== 0;
}

/** The Jewel of Harmony option and its level, byte 6 of an item that is not a socket item. */
export function harmonyOf(item: Item): { option: number; level: number } | null {
  const byte = item.socketBonus ?? 0;
  if (isSocketItem(item.group, item.num) || (byte & 0xf0) === 0) return null;
  return { option: byte >> 4, level: byte & 0x0f };
}

/** `GetItemType` (UIJewelHarmony.cpp:133-152): 0 weapons, 1 staffs, 2 shields and armour, -1 none. */
export function harmonyKindOf(group: number): number {
  return group <= 4 ? 0 : group === 5 ? 1 : group <= 11 ? 2 : -1;
}

/**
 * `GetStrengthenCapability` (UIJewelHarmony.cpp:199-327) as its callers read it: the harmony option and its value once the
 * item's level reaches the option's (`IsHarmonyJewelOption`: weapons 1-10, staffs and armour 1-8), null otherwise.
 */
export function harmonyBonus(item: Item, tables: Pick<ItemOptionTables, 'harmony'> | null | undefined): { kind: number; option: number; value: number } | null {
  const harmony = harmonyOf(item);
  const kind = harmonyKindOf(item.group);
  if (!harmony || kind < 0 || harmony.option > (kind === 0 ? 10 : 8) || (item.lvl ?? 0) < harmony.level) return null;
  return { kind, option: harmony.option, value: tables?.harmony[kind]?.[harmony.option - 1]?.values[harmony.level] ?? 0 };
}

/** `SI_NB` (UIJewelHarmony.cpp:211-243): the strength and agility a harmony option takes off the item's needs. */
export function harmonyNeedCut(item: Item, tables: Pick<ItemOptionTables, 'harmony'> | null | undefined): { str: number; agi: number } {
  const bonus = harmonyBonus(item, tables);
  const str = bonus && ((bonus.kind === 0 && bonus.option === 3) || (bonus.kind === 1 && bonus.option === 2)) ? bonus.value : 0;
  const agi = bonus && ((bonus.kind === 0 && bonus.option === 4) || (bonus.kind === 1 && bonus.option === 3)) ? bonus.value : 0;
  return { str, agi };
}

/** Each socket's seed and sphere level, null for an empty one (`CreateItem`, NewUIItemMng.cpp:226-240). */
export function socketsOf(item: Item): ({ seed: number; level: number } | null)[] {
  return (item.sockets ?? []).slice(0, item.socketCount ?? 0).map(byte =>
    byte === EMPTY_SOCKET ? null : { seed: byte % SOCKET_OPTIONS, level: Math.trunc(byte / SOCKET_OPTIONS) + 1 }
  );
}

/** A socket item's bonus option (`SocketSeedSetOption`, byte 6), null for none. */
export function socketBonusOf(item: Item): number | null {
  const byte = item.socketBonus;
  return byte !== undefined && byte < SOCKET_OPTIONS && isSocketItem(item.group, item.num) ? byte : null;
}
