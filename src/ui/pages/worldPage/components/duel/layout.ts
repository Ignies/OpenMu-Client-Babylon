/**
 * The duel UI on the original's art and 640x480 coordinates:
 *
 * - `CNewUIDuelWindow` (NewUIDuelWindow.cpp): `newui_Figure_ground` 131x70 at
 *   (509, 359) - NewUISystem.cpp:349 - score at x+31, name at x+55, hero line
 *   at y+33 in (0,150,255), enemy at y+56 in (255,25,25).
 * - `CNewUIDuelWatchWindow` (NewUIDuelWatchWindow.cpp): the 190x429
 *   item-window frame at (640-190, 0), four channel blocks 90 px apart from
 *   y+50, a 53x23 join button per block at the frame's centre.
 * - `CNewUIDuelWatchMainFrameWindow`: the 640x51 bottom bar (menu_pk_01/02/03),
 *   names centred at 320-80 / 320+25 (55 wide), score pips `menu_pk_bt02`
 *   16x17 at y 460, HP gauges 236 px at y 440, SD gauges 154 px at y 450,
 *   exit `newui_exit_00` at (640-36, 480-29).
 * - `CNewUIDuelWatchUserListWindow`: 57x17 name rows stacked upward from
 *   (640-57, 480-51).
 */

export const SCORE_SPRITE = 'newui_Figure_ground.OZT';
export const SCORE = { x: 509, y: 359, width: 131, height: 70 };
export const SCORE_VALUE_X = 24;
export const SCORE_VALUE_WIDTH = 28;
export const SCORE_NAME_X = 55;
export const SCORE_NAME_WIDTH = 72;
export const SCORE_HERO_Y = 31;
export const SCORE_ENEMY_Y = 54;
export const SCORE_HERO_COLOR = 'rgb(0,150,255)';
export const SCORE_ENEMY_COLOR = 'rgb(255,25,25)';

export const WATCH_TITLE_Y = 12;
export const WATCH_ROWS_Y = 50;
export const WATCH_ROW_STEP = 90;
export const WATCH_HEAD_OFFSET = 20;
export const WATCH_NAMES_OFFSET = 35;
export const WATCH_BUTTON_OFFSET = 50;
export const WATCH_HEAD_COLOR = 'rgb(255,255,128)';
export const WATCH_VS_COLOR = 'rgb(255,50,50)';
export const WATCH_BUTTON_SPRITE = 'newui_btn_empty_very_small.OZT';
export const WATCH_BUTTON = { width: 53, height: 23 };
/** `m_Pos.x + INVENTORY_WIDTH / 2 - 27`. */
export const WATCH_BUTTON_X = 190 / 2 - 27;
export const HEAD_CLOSE = { left: 169, top: 7, width: 13, height: 12 };

export const BAR_Y = 480 - 51;
export const BAR_BACK = [
  { sprite: 'menu_pk_01.OZJ', x: 0, width: 256 },
  { sprite: 'menu_pk_02.OZJ', x: 256, width: 128 },
  { sprite: 'menu_pk_03.OZJ', x: 384, width: 256 },
] as const;
export const BAR_NAME_Y = 36;
export const BAR_NAME_WIDTH = 55;
export const BAR_NAME1_X = 320 - 80;
export const BAR_NAME2_X = 320 + 25;
export const PIP_SPRITE = 'menu_pk_bt02.OZT';
export const PIP = { width: 16, height: 17, y: 460 - (480 - 51) };
export const PIP1_X = 57;
export const PIP_STEP = 17;
export const PIP2_X = 640 - 74;
/** HP gauge spans, in bar-local coordinates (the bar's top is y 429). */
export const HP1 = { right: 60 + 236, width: 236, y: 440 - (480 - 51), height: 7 };
export const HP2 = { left: 344, width: 236, y: 440 - (480 - 51), height: 7 };
export const SD1 = { right: 142 + 154, width: 154, y: 450 - (480 - 51), height: 4 };
export const SD2 = { left: 344, width: 154, y: 450 - (480 - 51), height: 4 };
export const HP_COLOR = 'rgb(196,32,32)';
export const SD_COLOR = 'rgb(64,160,220)';
export const BAR_EXIT_SPRITE = 'newui_exit_00.OZT';
export const BAR_EXIT = { x: 640 - 36, y: 480 - 29, width: 36, height: 29 };

export const SPECTATOR_ROW = { width: 57, height: 17 };
export const SPECTATOR_LIST_X = 640 - 57;
export const SPECTATOR_LIST_BOTTOM = 480 - 51;
