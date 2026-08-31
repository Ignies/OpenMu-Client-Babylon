import type { TextKey } from '../../../../../i18n';

export const WIN_WIDTH = 190;
export const WIN_HEIGHT = 429;

export const TABLE_X = 12;
export const TABLE_Y = 48;
export const TABLE_WIDTH = 165;
export const TABLE_HEIGHT = 119 - 48;
export const TABLE_FILL_WIDTH = 160;
export const TABLE_FILL_HEIGHT = 66;

export const TABLE_RULE_X = 14;
export const TABLE_RULE_Y = TABLE_Y + 12;
export const TABLE_RULE_WIDTH = TABLE_X + TABLE_WIDTH - 4 - TABLE_RULE_X;

export const NAME_Y = 12;
export const CLASS_Y = 27;

export const TABLE_TEXT_X = 18;
export const POINTS_X = 110;

export const LEVEL_FIELD_Y = TABLE_Y + 3;
export const LEVEL_FIELD_HEIGHT = 67 - LEVEL_FIELD_Y;
export const EXP_Y = 75;
export const PROBABILITY_Y = 88;
export const POINT_Y = 101;

export const ROW_Y = {
  strength: 120,
  agility: 175,
  vitality: 240,
  energy: 295,
  leadership: 350,
} as const;

export const ROW_SPRITE = 'newui_cha_textbox02.OZT';
export const ROW_X = 11;
export const ROW_WIDTH = 170;
export const ROW_HEIGHT = 21;

export const LABEL_X = 12;
export const LABEL_WIDTH = 74;
export const VALUE_X = 86;
export const VALUE_WIDTH = 86;

export const ROW_FIELD_HEIGHT = 19;

export const STAT_BUTTON_SPRITE = 'newui_chainfo_btn_level.OZT';
export const STAT_BUTTON_X = 160;
export const STAT_BUTTON_DY = 2;
export const STAT_BUTTON_WIDTH = 16;
export const STAT_BUTTON_HEIGHT = 15;

export const DETAIL_X = 20;
export const DETAIL_X_ENERGY = 18;
export const DETAIL_FIRST_DY = 24;
export const DETAIL_FIRST_DY_STRENGTH = 25;
export const DETAIL_LINE_HEIGHT = 13;

export const BUTTON_Y = 392;
export const BUTTON_WIDTH = 36;
export const BUTTON_HEIGHT = 29;
export const BUTTON_FRAMES = { up: 0, down: 1 } as const;

export const EXIT_BUTTON_X = 13;
export const QUEST_BUTTON_X = 50;
export const PET_BUTTON_X = 87;
export const MASTER_BUTTON_X = 124;

export const EXIT_SPRITE = 'newui_exit_00.OZT';
export const QUEST_SPRITE = 'newui_chainfo_btn_quest.OZT';
export const PET_SPRITE = 'newui_chainfo_btn_pet.OZT';
export const MASTER_SPRITE = 'newui_chainfo_btn_master.OZT';

export const EXIT_TOOLTIP: TextKey = 'characterInfo.close';
export const QUEST_TOOLTIP: TextKey = 'characterInfo.quest';
export const PET_TOOLTIP: TextKey = 'characterInfo.pet';
export const MASTER_TOOLTIP: TextKey = 'characterInfo.masterTree';

export const HEAD_CLOSE_X = 169;
export const HEAD_CLOSE_Y = 7;
export const HEAD_CLOSE_WIDTH = 13;
export const HEAD_CLOSE_HEIGHT = 12;

export const TEXT_COLOR = {
  stat: '#e6e600',
  points: '#ff8a00',
  buffed: '#6496ff',
  cyan: '#4cc5fe',
  white: '#ffffff',
} as const;

export const CHARACTER_INFO_SPRITES = [
  ROW_SPRITE,
  STAT_BUTTON_SPRITE,
  EXIT_SPRITE,
  QUEST_SPRITE,
  PET_SPRITE,
  MASTER_SPRITE,
];
