import { CharacterClassNumber } from './types';
import { GetByteValue } from './utils';

type Item = {
  num: number;
  group: number;
  lvl: number;
  isExcellent?: boolean;
  isAncient?: boolean;
  /** The Fenrir colour bits, mirrored from `c->Helper.ExcellentFlags`. */
  excellentFlags?: number;
};

const APPEARANCE_LENGTH = 18;

/**
 * Equipment slot order of the 18-byte preview's level field — the inventory's
 * own numbering (`InventoryConstants`), which `SetItemLevels` walks 0..6.
 */
const LEVEL_SLOTS = [
  'leftHand',
  'rightHand',
  'helm',
  'armor',
  'pants',
  'gloves',
  'boots',
] as const;

/**
 * The per-slot bit each armor piece owns in the three flag bytes: byte 9 is
 * bit 4 of its item number, byte 10 says excellent, byte 11 says ancient.
 */
const HELM_MASK = 0x80;
const ARMOR_MASK = 0x40;
const PANTS_MASK = 0x20;
const GLOVES_MASK = 0x10;
const BOOTS_MASK = 0x08;

export function isAppearanceBlank(app: DataView): boolean {
  for (let i = 0; i < app.byteLength; i++) {
    if (app.getUint8(i) !== 0) return false;
  }

  return true;
}

export function emptyAppearance(cls: CharacterClassNumber): DataView {
  const bytes = new Uint8Array(APPEARANCE_LENGTH);

  bytes[0] = (cls << 3) & 0xf8;
  // Both hands empty: index 0xFF and group nibble 0xF (`SetHand`).
  bytes[1] = 0xff;
  bytes[2] = 0xff;
  // Every armor index nibble set to 0xF, plus the five byte-9 bits, is what
  // `SetEmptyArmor` writes for an unequipped piece.
  bytes[3] = 0xff;
  bytes[4] = 0xff;
  // Boots nibble empty; the low two bits are the pet slot, and `AddPet` marks
  // "no pet" with 0b11 — leaving them at 0 would read back as a Guardian Angel.
  bytes[5] = 0xf3;
  bytes[9] = HELM_MASK | ARMOR_MASK | PANTS_MASK | GLOVES_MASK | BOOTS_MASK;
  bytes[12] = 0xf0;
  bytes[13] = 0xff;
  bytes[14] = 0xff;
  bytes[15] = 0xff;

  return new DataView(bytes.buffer);
}

export function withAppearanceClass(
  app: DataView,
  cls: CharacterClassNumber
): DataView {
  const bytes = new Uint8Array(app.byteLength);

  for (let i = 0; i < app.byteLength; i++) bytes[i] = app.getUint8(i);

  bytes[0] = ((cls << 3) & 0xf8) | (bytes[0] & 0x07);

  return new DataView(bytes.buffer);
}

export function classFromAppearance(app: DataView): CharacterClassNumber {
  return ClassFromAppearance(GetByteValue(app.getUint8(0), 5, 3));
}

/**
 * The classic 18-byte preview ("CharSet") every Season 6 client is sent for a
 * player in scope — the exact inverse of OpenMU's `AppearanceSerializer`:
 *
 *   0      class (bits 3-7) + pose (bits 0-2)
 *   1, 2   left / right hand item number, 0xFF = empty
 *   3, 4   helm / armor and pants / gloves index nibbles
 *   5      boots index nibble (high) + wing level (0x0C) + pet (0x03)
 *   6-8    seven 3-bit glow levels, slot 0 in the low bits of byte 8
 *   9      armor index bit 4 per slot (high 5 bits) + wing id (low 3 bits)
 *   10     excellent per armor slot (high 5 bits) + Dinorant (bit 0)
 *   11     ancient per armor slot (high 5 bits) + full ancient set (bit 0)
 *   12, 13 left / right hand group (bits 5-7); byte 12 bit 0/2 = horse/Fenrir
 *   13-15  armor index bits 5-8, one nibble per slot
 *   16     transform pet flags (high 3 bits) + black/blue Fenrir (bits 0/1)
 *   17     small-wing flags (high 3 bits) + gold Fenrir (bit 0)
 *
 * Everything the wearer's own gear can show — level glow, excellent and
 * ancient passes, wings, the pet — is in here; reading only the item numbers
 * is what left other players' effects and wings off in the first place.
 */
export function deserializeAppearance(app: DataView) {
  const cls = classFromAppearance(app);
  const levels = itemLevels(app);

  const leftHandIndex = app.getUint8(1);
  const rightHandIndex = app.getUint8(2);

  const leftHandGroup = GetByteValue(app.getUint8(12), 3, 5);
  const rightHandGroup = GetByteValue(app.getUint8(13), 3, 5);

  // Hands carry no excellent / ancient bit in this layout — only the five
  // armor slots do — so a remote weapon shows its level glow and nothing more.
  const leftHand: Item | null =
    leftHandIndex === 0xff && leftHandGroup === 0x07
      ? null
      : { num: leftHandIndex, group: leftHandGroup, lvl: levels.leftHand };

  const rightHand: Item | null =
    rightHandIndex === 0xff && rightHandGroup === 0x07
      ? null
      : { num: rightHandIndex, group: rightHandGroup, lvl: levels.rightHand };

  const helm = GetArmorPiece(app, 7, 3, true, HELM_MASK, 13, false, levels.helm);
  const armor = GetArmorPiece(app, 8, 3, false, ARMOR_MASK, 14, true, levels.armor);
  const pants = GetArmorPiece(app, 9, 4, true, PANTS_MASK, 14, false, levels.pants);
  const gloves = GetArmorPiece(app, 10, 4, false, GLOVES_MASK, 15, true, levels.gloves);
  const boots = GetArmorPiece(app, 11, 5, true, BOOTS_MASK, 15, false, levels.boots);

  return {
    cls,
    leftHand,
    rightHand,
    helm,
    armor,
    pants,
    gloves,
    boots,
    wings: wingFromAppearance(app),
    pet: petFromAppearance(app),
  } as const;
}

/**
 * Appearance layout of the "extended" protocol (OpenMU
 * AppearanceSerializerExtended, client version >= 106.3): byte 0 = class
 * number, byte 1 = pose/flags, then 3-byte "shiny" items (left hand, right
 * hand, helm, armor, pants, gloves, boots) and 2-byte wings / pet.
 * Item: group = high nibble of byte 0, number = low nibble << 8 | byte 1,
 * glow level = high nibble of byte 2, excellent = bit 3, ancient = bit 2.
 * Empty slot: group 0xF.
 */
export function deserializeAppearanceExtended(app: DataView) {
  const cls = ClassFromAppearance(app.getUint8(0));

  const shiny = (
    at: number
  ): (Item & { isExcellent: boolean; isAncient: boolean }) | null => {
    if (app.byteLength < at + 3) return null;
    const b0 = app.getUint8(at);
    const group = (b0 >> 4) & 0xf;
    if (group === 0xf) return null;
    const num = ((b0 & 0xf) << 8) | app.getUint8(at + 1);
    const b2 = app.getUint8(at + 2);
    return {
      num,
      group,
      lvl: (b2 >> 4) & 0xf,
      isExcellent: (b2 & 0x08) !== 0,
      isAncient: (b2 & 0x04) !== 0,
    };
  };
  const unshiny = (at: number): Item | null => {
    if (app.byteLength < at + 2) return null;
    const b0 = app.getUint8(at);
    const group = (b0 >> 4) & 0xf;
    if (group === 0xf) return null;
    return { num: ((b0 & 0xf) << 8) | app.getUint8(at + 1), group, lvl: 0 };
  };

  return {
    cls,
    leftHand: shiny(2),
    rightHand: shiny(5),
    helm: shiny(8),
    armor: shiny(11),
    pants: shiny(14),
    gloves: shiny(17),
    boots: shiny(20),
    wings: unshiny(23),
    pet: unshiny(25),
  } as const;
}

/** Bytes the extended appearance occupies in AddCharacterToScopeExtended. */
export const APPEARANCE_EXTENDED_LENGTH = 27;

const KNOWN_CLASSES: ReadonlySet<number> = new Set(
  Object.values(CharacterClassNumber).filter(v => typeof v === 'number')
);

function ClassFromAppearance(raw: number): CharacterClassNumber {
  return KNOWN_CLASSES.has(raw)
    ? (raw as CharacterClassNumber)
    : CharacterClassNumber.DarkWizard;
}

/**
 * The seven glow levels packed into bytes 6-8, three bits each, back as item
 * levels.
 *
 * The wire carries `(level - 1) / 2` (`ItemExtensions.GetGlowLevel`), so a
 * level cannot be recovered exactly: glow *g* was worn as +2g+1 or +2g+2. The
 * odd one is the answer, because every threshold the renderer steps on — +7
 * sheen, +9 aura, +11 sparks, +13 light — is odd, so the tier always comes
 * out right and only the shade between two levels of one tier is lost. That
 * loss is the protocol's, not ours: the original client cannot tell either.
 */
function itemLevels(app: DataView): Record<(typeof LEVEL_SLOTS)[number], number> {
  const packed =
    (app.getUint8(6) << 16) | (app.getUint8(7) << 8) | app.getUint8(8);

  const out = {} as Record<(typeof LEVEL_SLOTS)[number], number>;

  LEVEL_SLOTS.forEach((slot, i) => {
    out[slot] = itemLevelFromGlow((packed >> (i * 3)) & 0x07);
  });

  return out;
}

/**
 * One glow level back to the item level to render it at — see `itemLevels`
 * for why the odd one is the right answer. Shared with the `AppearanceChanged`
 * (0x25) path, whose byte 1 carries the same glow level in its low nibble.
 */
export function itemLevelFromGlow(glow: number): number {
  return glow > 0 ? glow * 2 + 1 : 0;
}

/**
 * The wing slot, from the three bits `AddWing` spends on it: byte 5 carries
 * the wing's *level* (1st / 2nd / 3rd) and byte 9 which of that level it is.
 * Together they name one item; neither half means anything alone.
 */
function wingFromAppearance(app: DataView): Item | null {
  const level = app.getUint8(5) & 0x0c;
  if (level === 0) return null;

  const id = app.getUint8(9) & 0x07;
  const num = WING_NUMBERS[level]?.[id];

  // 3rd-level bits with no id: one of the "small" wings (WingIndex 130-135),
  // which byte 17 distinguishes. Season 6 has no model for any of them, and
  // neither do the 4th-level Cape of Fighter / Cape of Overrule (id 7).
  if (num === undefined) return null;

  // Cape of Lord is the one wing that lives in the helper group (13) — the
  // preview has no room for a group, so the table names it.
  return { num, group: num === CAPE_OF_LORD ? 13 : 12, lvl: 0 };
}

const CAPE_OF_LORD = 30;

/** `AddWing`'s two switches, read backwards: byte 5 level → byte 9 id → item. */
const WING_NUMBERS: Record<number, Record<number, number | undefined>> = {
  // 1st level.
  0x04: { 1: 0, 2: 1, 3: 2, 4: 41 },
  // 2nd level. 7 = Cape of Fighter (49), post-S6.
  0x08: { 1: 3, 2: 4, 3: 5, 4: 6, 5: CAPE_OF_LORD, 6: 42 },
  // 3rd level. 7 = Cape of Overrule (50), post-S6.
  0x0c: { 1: 36, 2: 37, 3: 38, 4: 39, 5: 40, 6: 43 },
};

/**
 * The pet slot (`AddPet`). The low two bits of byte 5 hold the three pets that
 * fit there; 0b11 means "one of the rest", and the rest are single bits spread
 * over bytes 10 and 12. A Dark Raven is written as plain 0b11 with no flag, so
 * it is indistinguishable from an empty slot here — the original client has
 * the same blind spot.
 *
 * Byte 16's transform pets (Demon, Spirit of Guardian, Skeleton, Rudolph, Pet
 * Unicorn, Panda) are left alone: none of them has a model in `pets.ts`, so
 * naming them would only produce an item the renderer drops again.
 */
function petFromAppearance(app: DataView): Item | null {
  const bits = app.getUint8(5) & 0x03;

  // 0 Guardian Angel, 1 Imp, 2 Horn of Uniria.
  if (bits !== 0x03) return { num: bits, group: 13, lvl: 0 };

  // Fenrir first: it clears the Dinorant and Dark Horse bits as it sets its
  // own. Its colour rides bytes 16/17 (the client reads Equipment[15] & 3 and
  // Equipment[16] & 1, ZzzCharacter.cpp:12455-12500) and is carried as the
  // item's excellent flags, exactly like `c->Helper.ExcellentFlags`.
  if (app.getUint8(12) & 0x04) {
    const flags =
      app.getUint8(17) & 0x01 ? 0x04 : app.getUint8(16) & 0x03;
    return { num: 37, group: 13, lvl: 0, excellentFlags: flags };
  }
  if (app.getUint8(12) & 0x01) return { num: 4, group: 13, lvl: 0 };
  if (app.getUint8(10) & 0x01) return { num: 3, group: 13, lvl: 0 };

  return null;
}

/**
 * One of the five armor slots. `SetArmorItemIndex` splits the item number
 * three ways — bits 0-3 into a nibble of `firstIndex`, bit 4 into the slot's
 * byte-9 bit, bits 5-8 into a nibble of `thirdIndex` — and an unequipped slot
 * is every one of those bits set (`SetEmptyArmor`).
 */
function GetArmorPiece(
  app: DataView,
  group: number,
  firstIndex: number,
  firstIndexHigh: boolean,
  slotMask: number,
  thirdIndex: number,
  thirdIndexHigh: boolean,
  lvl: number
): Item | null {
  const high = GetByteValue(app.getUint8(thirdIndex), 4, thirdIndexHigh ? 4 : 0);

  // `SetEmptyArmor` fills the top nibble with ones; no real item reaches it
  // (it would need number >= 480, and the S6 tables stop at 53).
  if (high === 0x0f) return null;

  const num =
    GetByteValue(app.getUint8(firstIndex), 4, firstIndexHigh ? 4 : 0) |
    (((app.getUint8(9) & slotMask) === slotMask ? 1 : 0) << 4) |
    (high << 5);

  return {
    num,
    group,
    lvl,
    isExcellent: (app.getUint8(10) & slotMask) === slotMask,
    isAncient: (app.getUint8(11) & slotMask) === slotMask,
  };
}
