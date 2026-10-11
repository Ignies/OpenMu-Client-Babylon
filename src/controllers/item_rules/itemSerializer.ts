import { Item } from '../../ecs/world';
import { castToByte } from '../../core/binaryUtils';
import { PET_GROUP, DARK_HORSE, DARK_RAVEN } from '@versions/shared/items/petItems';
import { isOptionWing } from './wingOptions';
import { isSocketItem } from './itemOptions';

const LuckFlag = 4;
const SkillFlag = 128;
const LevelMask = 0x78;
const OptionLevelLowMask = 0x03;
const OptionLevelHighFlag = 0x40;
const AncientBonusLevelMask = 0b1100;
const AncientDiscriminatorMask = 0b0011;
const AncientMask = AncientBonusLevelMask | AncientDiscriminatorMask;
const ExcellentOptionsMask = 0x3f;
const WingOptionsMask = 0x0f;
/** `ITEM_HORN_OF_FENRIR`: its variant rides the excellent bits (`GetFenrirType`). */
const FENRIR = { group: 13, num: 37 } as const;
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
    target[3] |= ((item.wingOptions ?? 0) & WingOptionsMask) | (((item.wingOptionKind ?? 0) & 0x03) << 4);

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
   *  (high nibble), 380 option (0x08) · 6: harmony option and level, or a socket item's
   *  bonus · 7-11: sockets (0xFF = none).
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
    // Wings and capes carry wing options and the option's kind there; the Horn of Fenrir its
    // variant. Neither is an excellent item (ZzzInfomation.cpp:855-940, ZzzInventory.cpp:2526).
    if (isOptionWing(itemGroup, itemNumber)) {
      item.wingOptions = array[3] & WingOptionsMask;
      item.wingOptionKind = (array[3] >> 4) & 0x03;
      item.excellentFlags = 0;
      item.isExcellent = false;
    } else if (itemGroup === FENRIR.group && itemNumber === FENRIR.num) {
      item.isExcellent = false;
    }
    ReadAncientOption(array[4], item);

    // A socket item's byte 6 is its bonus option even at 0; OpenMU sends 0xFF for none (NewUIItemMng.cpp:249).
    if (array[6] !== 0 || isSocketItem(itemGroup, itemNumber)) item.socketBonus = array[6];

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
