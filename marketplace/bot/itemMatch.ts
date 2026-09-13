/**
 * Whether an item on the wire is the item a listing describes.
 *
 * A listing is created from what the seller's window sent: a description of
 * the item they picked. The handover is where the bot is actually handed
 * something, and until this existed the two were never compared - the bot
 * confirmed whatever single item was put on the table, so a seller who
 * listed gloves and handed over boots sold boots as gloves. The catalogue
 * showed the description; the buyer got the bytes.
 *
 * Twelve bytes describe an item on the wire (the layout
 * `src/common/itemSerializer.ts` reads in full). The client's own reading of
 * an inventory carries those bytes as `raw`, so when a listing has them the
 * comparison is byte for byte, durability aside - it wears down between the
 * listing and the handover. Without `raw` the fields a listing states are
 * compared one by one, with an absent field meaning none.
 */

export type DecodedItem = {
  group: number;
  num: number;
  lvl: number;
  hasSkill: boolean;
  luck: boolean;
  optionLevel: number;
  excellentFlags: number;
  ancientDiscriminator: number;
  durability: number;
};

/** What a listing says about its item. Sent by a browser, so nothing is trusted as typed. */
export type ListedItem = {
  group: number;
  num: number;
  [key: string]: unknown;
};

const DURABILITY_BYTE = 2;
const ITEM_BYTES = 12;

export function decodeItem(bytes: Uint8Array): DecodedItem | null {
  if (bytes.length < 6) return null;
  return {
    num: bytes[0] + ((bytes[3] & 0x80) << 1),
    group: (bytes[5] & 0xf0) >> 4,
    lvl: (bytes[1] & 0x78) >> 3,
    hasSkill: (bytes[1] & 0x80) !== 0,
    luck: (bytes[1] & 0x04) !== 0,
    optionLevel: (bytes[1] & 0x03) + ((bytes[3] & 0x40) !== 0 ? 4 : 0),
    excellentFlags: bytes[3] & 0x3f,
    ancientDiscriminator: bytes[4] & 0x03,
    durability: bytes[2],
  };
}

const num = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const bool = (value: unknown): boolean => value === true;

/** The listing's own wire bytes, when the window sent them and they look like bytes. */
function rawOf(listed: ListedItem): number[] | null {
  const raw = listed.raw;
  if (!Array.isArray(raw) || raw.length < ITEM_BYTES) return null;
  if (!raw.every(b => typeof b === 'number' && Number.isInteger(b) && b >= 0 && b <= 0xff)) return null;
  return raw as number[];
}

export function sameItem(bytes: Uint8Array, listed: ListedItem): boolean {
  const raw = rawOf(listed);
  if (raw) {
    if (bytes.length < ITEM_BYTES) return false;
    for (let i = 0; i < ITEM_BYTES; i++) {
      if (i === DURABILITY_BYTE) continue;
      if (raw[i] !== bytes[i]) return false;
    }
    return true;
  }

  const item = decodeItem(bytes);
  if (!item) return false;
  return (
    item.group === listed.group &&
    item.num === listed.num &&
    item.lvl === num(listed.lvl) &&
    item.excellentFlags === num(listed.excellentFlags) &&
    item.optionLevel === num(listed.optionLevel) &&
    item.luck === bool(listed.luck) &&
    item.hasSkill === bool(listed.hasSkill) &&
    item.ancientDiscriminator === num(listed.ancientDiscriminator)
  );
}
