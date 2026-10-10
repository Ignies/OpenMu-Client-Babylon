import type { Item } from '../../ecs/world';

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

/** The Jewel of Harmony option and its level, byte 6 of an item that is not a socket item. */
export function harmonyOf(item: Item): { option: number; level: number } | null {
  const byte = item.socketBonus ?? 0;
  if (isSocketItem(item.group, item.num) || (byte & 0xf0) === 0) return null;
  return { option: byte >> 4, level: byte & 0x0f };
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
