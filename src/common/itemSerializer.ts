import { Item } from '../ecs/world';
import { castToByte } from './utils';
import { PET_GROUP, DARK_HORSE, DARK_RAVEN } from './petConstants';

const LuckFlag = 4;
const SkillFlag = 128;
const LevelMask = 0x78;
const OptionLevelLowMask = 0x03;
const OptionLevelHighFlag = 0x40;
const AncientBonusLevelMask = 0b1100;
const AncientDiscriminatorMask = 0b0011;
const AncientMask = AncientBonusLevelMask | AncientDiscriminatorMask;
const ExcellentOptionsMask = 0x3f;
const ItemNumberHighFlag = 0x80;
const NoSocket = 0xff;
const EmptySocket = 0xfe;

/** Dark Horse / Dark Raven: their level rides in byte 2, not the level bits. */
function IsTrainablePet(item: Item) {
  return (
    item.group === PET_GROUP &&
    (item.num === DARK_HORSE || item.num === DARK_RAVEN)
  );
}
export class ItemSerializer {
  static readonly NeededSpace = 12;

  static SerializeItem(target: Uint8Array, item: Item): number {
    target.fill(0, 0, ItemSerializer.NeededSpace);

    target[0] = castToByte(item.num);

    const trainablePet = IsTrainablePet(item);
    const itemLevel = trainablePet ? 0 : item.lvl ?? 0;
    target[1] = castToByte((itemLevel << 3) & LevelMask);
    if (item.hasSkill) target[1] |= SkillFlag;
    if (item.luck) target[1] |= LuckFlag;

    const optionLevel = item.optionLevel ?? 0;
    target[1] |= optionLevel & OptionLevelLowMask;
    if (optionLevel > 3) target[3] |= OptionLevelHighFlag;

    target[2] = castToByte(
      item.durability ?? (trainablePet ? item.lvl ?? 0 : 0)
    );

    target[3] |= (item.excellentFlags ?? 0) & ExcellentOptionsMask;

    if ((item.num & 0x100) === 0x100) {
      target[3] |= ItemNumberHighFlag;
    }

    if (item.isAncient) {
      target[4] = castToByte(
        (((item.ancientBonusLevel ?? 0) << 2) & AncientBonusLevelMask) |
          ((item.ancientDiscriminator ?? 0) & AncientDiscriminatorMask)
      );
    }

    target[5] = castToByte(item.group << 4);

    target[6] = castToByte(item.socketBonus ?? 0);

    const sockets = item.sockets ?? [];
    const socketCount = item.socketCount ?? sockets.length;
    for (let i = 0; i < 5; i++) {
      target[7 + i] =
        i < socketCount ? castToByte(sockets[i] ?? EmptySocket) : NoSocket;
    }

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
    const itemNumber = array[0] + ((array[3] & ItemNumberHighFlag) << 1);
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

    if (array[6] !== 0) item.socketBonus = array[6];

    // Bytes 7–11: socket slots; 0xFF = the item has no slot there.
    const sockets: number[] = [];
    for (let i = 7; i < ItemSerializer.NeededSpace && i < array.length; i++) {
      if (array[i] !== NoSocket) sockets.push(array[i]);
    }
    item.socketCount = sockets.length;
    if (sockets.length > 0) item.sockets = sockets;

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
