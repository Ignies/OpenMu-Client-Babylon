import { ItemsDatabase } from './itemsDatabase';
import { CharacterClassNumber } from './types';
import { GetByteValue } from './utils';

type Item = {
  num: number;
  group: number;
  lvl: number;
};

const APPEARANCE_LENGTH = 18;

export function isAppearanceBlank(app: DataView): boolean {
  for (let i = 0; i < app.byteLength; i++) {
    if (app.getUint8(i) !== 0) return false;
  }

  return true;
}

export function emptyAppearance(cls: CharacterClassNumber): DataView {
  const bytes = new Uint8Array(APPEARANCE_LENGTH);

  bytes[0] = (cls << 3) & 0xf8;
  bytes[1] = 0xff;
  bytes[2] = 0xff;
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

export function deserializeAppearance(app: DataView) {
  const cls = classFromAppearance(app);

  const leftHandIndex = app.getUint8(1);
  const rightHandIndex = app.getUint8(2);

  const leftHandGroup = GetByteValue(app.getUint8(12), 3, 5);
  const rightHandGroup = GetByteValue(app.getUint8(13), 3, 5);

  console.log(`Left Hand: ${leftHandIndex}, Group: ${leftHandGroup}`);
  console.log(`Right Hand: ${rightHandIndex}, Group: ${rightHandGroup}`);

  const leftHand: Item | null =
    leftHandIndex === 0xff && leftHandGroup === 0x07
      ? null
      : { num: leftHandIndex, group: leftHandGroup, lvl: 0 };

  const rightHand: Item | null =
    rightHandIndex === 0xff && rightHandGroup === 0x07
      ? null
      : { num: rightHandIndex, group: rightHandGroup, lvl: 0 };

const helmPiece = GetArmorPiece(app, 7, 3, true, 0x80, 13, false);
  const armorPiece = GetArmorPiece(app, 8, 3, false, 0x40, 14, true);
  const pantsPiece = GetArmorPiece(app, 9, 4, true, 0x20, 14, false);
  const glovesPiece = GetArmorPiece(app, 10, 4, false, 0x10, 15, true);
  const bootsPiece = GetArmorPiece(app, 11, 5, true, 0x08, 15, false);

  const helm: Item | null = helmPiece
    ? {
        ...helmPiece,
        lvl: 0,
      }
    : null;

  const armor: Item | null = armorPiece
    ? {
        ...armorPiece,
        lvl: 0,
      }
    : null;

  const pants: Item | null = pantsPiece
    ? {
        ...pantsPiece,
        lvl: 0,
      }
    : null;

  const gloves: Item | null = glovesPiece
    ? {
        ...glovesPiece,
        lvl: 0,
      }
    : null;

const boots: Item | null = bootsPiece
    ? {
        ...bootsPiece,
        lvl: 0,
      }
    : null;

return {
    cls,
    leftHand,
    rightHand,
    helm,
    armor,
    pants,
    gloves,
    boots,
    // The legacy 18-byte layout has no room for the wing or pet slot — only
    // AppearanceSerializerExtended carries them. Present as nulls so both
    // shapes are interchangeable at the call site.
    wings: null as Item | null,
    pet: null as Item | null,
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

function GetOrMaskForHighNibble(value: number) {
  return (value << 4) & 0xf0;
}

function GetOrMaskForLowNibble(value: number) {
  return value & 0x0f;
}

function GetArmorPiece(
  app: DataView,
  group: number,
  firstIndex: number,
  firstIndexHigh: boolean,
  secondIndexMask: number,
  thirdIndex: number,
  thirdIndexHigh: boolean
) {
  const index =
    GetByteValue(app.getUint8(firstIndex), 4, firstIndexHigh ? 4 : 0) |
    (((app.getUint8(9) & secondIndexMask) === secondIndexMask ? 1 : 0) << 5) |
    (GetByteValue(app.getUint8(thirdIndex), 4, thirdIndexHigh ? 4 : 0) << 6);

  const isEmpty = ((index >> 6) & 0xf) === 0xf;

  if (isEmpty) return null;

  return {
    num: index,
    group,
  };
}
