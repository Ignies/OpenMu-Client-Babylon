import { textTable, type TextKey } from '../../../i18n';

import { CharacterClassNumber } from '../../../common';
import { CharacterCreationUnlockFlagsEnum } from '../../../common/packets/ServerToClientPackets';

export const WIN_WIDTH = 454;
export const WIN_HEIGHT = 406;

export const PREVIEW_WIDTH = 410;
export const PREVIEW_HEIGHT = 335;

export const COLUMN_X = 346;

export const JOB_BTN_WIDTH = 108;
export const JOB_BTN_HEIGHT = 26;

export const JOB_BTN_FRAMES = { up: 0, active: 1, down: 2, check: 3 } as const;

export const STAT_X = COLUMN_X;
export const STAT_Y = 24;
export const STAT_WIDTH = 108;
export const STAT_HEIGHT = 80;
export const STAT_HEIGHT_DARK_LORD = 96;

export const STAT_TEXT_X = 22;
export const STAT_VALUE_X = STAT_TEXT_X + 54;
export const STAT_TEXT_Y = 10;
export const STAT_LINE_SPACING = 17;

export const ACTION_BTN_WIDTH = 54;
export const ACTION_BTN_HEIGHT = 30;
export const ACTION_BTN_Y = 325;
export const OK_BTN_X = COLUMN_X;
export const CANCEL_BTN_X = 400;

export const ACTION_BTN_FRAMES = { up: 0, active: 1, down: 2 } as const;

export const INPUT_X = 0;
export const INPUT_Y = 317;
export const INPUT_WIDTH = 346;
export const INPUT_HEIGHT = 38;
export const INPUT_TEXT_X = 78;
export const INPUT_TEXT_Y = 21;
export const INPUT_TEXT_WIDTH = 200;
export const INPUT_TEXT_HEIGHT = 20;

export const DESC_X = 0;
export const DESC_Y = 355;
export const DESC_WIDTH = 454;
export const DESC_HEIGHT = 51;
export const DESC_TEXT_X = 10;
export const DESC_TEXT_Y = 12;
export const DESC_LINE_SPACING = 19;
export const DESC_LINE_MAX = 2;
export const DESC_ROW_MAX = 75;

export const PANEL_ALPHA = 143 / 255;

export const NAME_MAX_LENGTH = 10;
export const NAME_MIN_LENGTH = 4;

export const CLASS_TYPE = {
  WIZARD: 0,
  KNIGHT: 1,
  ELF: 2,
  DARK: 3,
  DARK_LORD: 4,
  SUMMONER: 5,
  RAGEFIGHTER: 6,
} as const;

export function previewModelFile(classType: number): string {
  return `Logo/NewFace${(classType + 1).toString().padStart(2, '0')}.glb`;
}

export const PREVIEW_INTRO_ACTION = 1;
export const PREVIEW_IDLE_ACTION = 0;

export const PREVIEW_PLAY_SPEED = 0.3;

export const PREVIEW_CAMERA_OFFSET = { x: 10, y: -500, z: 48 } as const;

export const PREVIEW_CAMERA_FOV = 10;

export type ClassRenderParameters = {
  overrideAngle: boolean;
  angleX: number;
  angleY: number;
  angleZ: number;
  scale: number;
  positionOffsetX: number;
  positionOffsetZ: number;
};

export const CLASS_RENDER_PARAMETERS: readonly ClassRenderParameters[] = [
  { overrideAngle: true, angleX: 0, angleY: 0, angleZ: -40, scale: 5.9, positionOffsetX: 0, positionOffsetZ: 0 },
  { overrideAngle: true, angleX: 0, angleY: 0, angleZ: -12, scale: 6.05, positionOffsetX: 0, positionOffsetZ: 0 },
  { overrideAngle: true, angleX: 8, angleY: 0, angleZ: 5, scale: 9.1, positionOffsetX: 4.8, positionOffsetZ: 0 },
  { overrideAngle: true, angleX: 8, angleY: 0, angleZ: -13, scale: 6.0, positionOffsetX: 0, positionOffsetZ: 1.8 },
  { overrideAngle: true, angleX: 8, angleY: 0, angleZ: -18, scale: 6.0, positionOffsetX: 0, positionOffsetZ: 0 },
  { overrideAngle: true, angleX: 2, angleY: 0, angleZ: 2, scale: 9.1, positionOffsetX: 4.8, positionOffsetZ: 4.0 },
  { overrideAngle: false, angleX: 0, angleY: 0, angleZ: 0, scale: 6.0, positionOffsetX: 9.8, positionOffsetZ: -7.5 },
] as const;

export const DEFAULT_RENDER_PARAMETERS: ClassRenderParameters = {
  overrideAngle: false,
  angleX: 0,
  angleY: 0,
  angleZ: 0,
  scale: 6.0,
  positionOffsetX: 0,
  positionOffsetZ: 0,
};

export type CreatableClass = {
  classType: number;
  netClass: CharacterClassNumber;
  nameTextId: number;
  nameKey: TextKey;
  descTextId: number;
  descriptionKey: TextKey;
  stats: readonly [string, string, string, string];
  unlock: CharacterCreationUnlockFlagsEnum | null;
  y: number;
};

const JOB_BTN_START_Y = 131;
const JOB_BTN_SUMMONER_ROW = 3;
const JOB_BTN_RAGE_FIGHTER_Y = 246;

export const CREATABLE_CLASSES: readonly CreatableClass[] = [
  {
    classType: CLASS_TYPE.WIZARD,
    netClass: CharacterClassNumber.DarkWizard,
    nameTextId: 20,
    nameKey: 'class.darkWizard',
    descTextId: 1705,
    descriptionKey: 'class.desc.darkWizard',
    stats: ['18', '18', '15', '30'],
    unlock: null,
    y: JOB_BTN_START_Y,
  },
  {
    classType: CLASS_TYPE.KNIGHT,
    netClass: CharacterClassNumber.DarkKnight,
    nameTextId: 21,
    nameKey: 'class.darkKnight',
    descTextId: 1706,
    descriptionKey: 'class.desc.darkKnight',
    stats: ['28', '20', '25', '10'],
    unlock: null,
    y: JOB_BTN_START_Y + JOB_BTN_HEIGHT,
  },
  {
    classType: CLASS_TYPE.ELF,
    netClass: CharacterClassNumber.FairyElf,
    nameTextId: 22,
    nameKey: 'class.elf',
    descTextId: 1707,
    descriptionKey: 'class.desc.elf',
    stats: ['22', '25', '20', '15'],
    unlock: null,
    y: JOB_BTN_START_Y + JOB_BTN_HEIGHT * 2,
  },
  {
    classType: CLASS_TYPE.SUMMONER,
    netClass: CharacterClassNumber.Summoner,
    nameTextId: 1687,
    nameKey: 'class.summoner',
    descTextId: 1690,
    descriptionKey: 'class.desc.summoner',
    stats: ['21', '21', '18', '23'],
    unlock: CharacterCreationUnlockFlagsEnum.Summoner,
    y: JOB_BTN_START_Y + JOB_BTN_HEIGHT * JOB_BTN_SUMMONER_ROW,
  },
  {
    classType: CLASS_TYPE.RAGEFIGHTER,
    netClass: CharacterClassNumber.RageFighter,
    nameTextId: 3150,
    nameKey: 'class.rageFighter',
    descTextId: 3152,
    descriptionKey: 'class.desc.rageFighter',
    stats: ['32', '27', '25', '20'],
    unlock: CharacterCreationUnlockFlagsEnum.RageFighter,
    y: JOB_BTN_RAGE_FIGHTER_Y,
  },
  {
    classType: CLASS_TYPE.DARK,
    netClass: CharacterClassNumber.MagicGladiator,
    nameTextId: 23,
    nameKey: 'class.magicGladiator',
    descTextId: 1708,
    descriptionKey: 'class.desc.magicGladiator',
    stats: ['26', '26', '26', '26'],
    unlock: CharacterCreationUnlockFlagsEnum.MagicGladiator,
    y: JOB_BTN_RAGE_FIGHTER_Y + JOB_BTN_HEIGHT,
  },
  {
    classType: CLASS_TYPE.DARK_LORD,
    netClass: CharacterClassNumber.DarkLord,
    nameTextId: 24,
    nameKey: 'class.darkLord',
    descTextId: 1709,
    descriptionKey: 'class.desc.darkLord',
    stats: ['26', '20', '20', '15'],
    unlock: CharacterCreationUnlockFlagsEnum.DarkLord,
    y: JOB_BTN_RAGE_FIGHTER_Y + JOB_BTN_HEIGHT * 2,
  },
] as const;

export const STAT_LABEL_KEYS: readonly TextKey[] = [
  'stat.strength',
  'stat.agility',
  'stat.vitality',
  'stat.energy',
];

export const COMMAND_LABEL_KEY: TextKey = 'stat.command';
export const COMMAND_VALUE = '25';

/** Live, so the messages follow the Options → Language selector. */
export const CREATE_MESSAGES = textTable({
  minLength: 'characters.create.minLength',
  specialName: 'characters.create.specialName',
  failed: 'characters.create.failed',
});

export function hasSpecialCharacters(name: string): boolean {
  return !/^[0-9A-Za-z]*$/.test(name);
}

export function separateTextIntoLines(
  text: string,
  maxLines: number,
  lineSize: number
): string[] {
  const lines: string[] = [];
  let line = '';
  let lastSpace = -1;

  for (let i = 0; i < text.length; i++) {
    if (1 + line.length >= lineSize) {
      if (lastSpace >= 0 && line.length - lastSpace - 1 < Math.min(10, lineSize / 2)) {
        i -= line.length - lastSpace - 1;
        line = line.slice(0, lastSpace);
      }

      lines.push(line);
      if (lines.length >= maxLines) return lines;

      line = '';
      lastSpace = -1;
    }

    if (text[i] === ' ') lastSpace = line.length;
    line += text[i];
  }

  lines.push(line);

  return lines;
}
