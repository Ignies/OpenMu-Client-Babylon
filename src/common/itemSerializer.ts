import { Item } from '../ecs/world';
import { castToByte } from './utils';

const LuckFlag = 4;
const SkillFlag = 128;
const LevelMask = 0x78;
const OptionLevelLowMask = 0x03;
const OptionLevelHighFlag = 0x40;
const AncientBonusLevelMask = 0b1100;
const AncientDiscriminatorMask = 0b0011;
const AncientMask = AncientBonusLevelMask | AncientDiscriminatorMask;
const ExcellentOptionsMask = 0x3f;
const NoSocket = 0xff;

function IsTrainablePet(item: Item) {
  return false;
}
export class ItemSerializer {
  static readonly NeededSpace = 12;

  static SerializeItem(target: Uint8Array, item: Item): number {
    target[0] = item.num;

    const itemLevel = IsTrainablePet(item) ? 0 : item.lvl ?? 0;
    target[1] = castToByte((itemLevel << 3) & LevelMask);

if ((item.num & 0x100) === 0x100) {
      target[3] |= 0x80;
    }

target[5] = castToByte(item.group << 4);

return ItemSerializer.NeededSpace;
  }

  /**
   * OpenMU `ItemSerializer.DeserializeItem` (12-byte layout):
   *  0: item number (low byte) · 1: level (bits 3-6), luck (bit 2), skill
   *  (bit 7), option level low bits (0-1) · 2: durability · 3: excellent bits
   *  0-5, option level high bit (0x40), item number high bit (0x80) ·
   *  4: ancient discriminator (bits 0-1) + bonus level (bits 2-3) · 5: group
   *  (high nibble) · 6: socket bonus/380 option · 7-11: sockets (0xFF = none).
   */
  static DeserializeItem(array: Uint8Array): Item {
    const itemNumber = array[0] + ((array[0] & 0x80) << 1);
    const itemGroup = (array[5] & 0xf0) >> 4;

const item: Item = {
      group: itemGroup,
      num: itemNumber,
      raw: Array.from(array.slice(0, ItemSerializer.NeededSpace)),
    };

    item.lvl = castToByte((array[1] & LevelMask) >> 3);

    item.durability = array[2];

    ReadSkillFlag(array[1], item);
    ReadLuckOption(array[1], item);
    ReadNormalOption(array, item);
    ReadExcellentOption(array[3], item);
    ReadAncientOption(array[4], item);

    // Bytes 7–11: socket slots; 0xFF = the item has no slot there.
    let sockets = 0;
    for (let i = 7; i < ItemSerializer.NeededSpace && i < array.length; i++) {
      if (array[i] !== NoSocket) sockets++;
    }
    item.socketCount = sockets;

    return item;
  }
}

function ReadSkillFlag(optionByte: number, item: Item) {
  if ((optionByte & SkillFlag) == 0) {
    return;
  }

item.hasSkill = true;
}

function ReadLuckOption(optionByte: number, item: Item) {
  if ((optionByte & LuckFlag) == 0) {
    return;
  }

  item.luck = true;
}

function ReadExcellentOption(excByte: number, item: Item) {
  const excellentBits = excByte & ExcellentOptionsMask;
  item.excellentFlags = excellentBits;
  item.isExcellent = excellentBits !== 0;
}

function ReadNormalOption(array: Uint8Array, item: Item) {
  const optionLevel =
    (array[1] & OptionLevelLowMask) +
    ((array[3] & OptionLevelHighFlag) !== 0 ? 4 : 0);
  if (optionLevel == 0) {
    return;
  }

  item.optionLevel = optionLevel;
}

function ReadAncientOption(ancientByte: number, item: Item) {
  if ((ancientByte & AncientMask) == 0) {
    return;
  }

  item.isAncient = true;
  item.ancientBonusLevel = (ancientByte & AncientBonusLevelMask) >> 2;
  item.ancientDiscriminator = ancientByte & AncientDiscriminatorMask;
}
