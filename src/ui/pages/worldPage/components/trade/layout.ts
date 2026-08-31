import type { TextKey } from '../../../../../i18n';
import { TRADE_COLUMNS, TRADE_ROWS } from '../../../../../common/itemStorage';

/**
 * `CNewUITrade` (NewUITrade.cpp): the 190×429 item frame split in two - the
 * partner's 8×4 tray at (16, 68) over their name plate and money bar, the
 * hero's the same at (16, 274). The accept marks are `newui_Bt_accept.OZT`,
 * 36×29 with the checked state in the second frame.
 */

export const COLUMNS = TRADE_COLUMNS;
export const ROWS = TRADE_ROWS;

export const TITLE_Y = 11;
/** GlobalText[226]. */
export const TITLE: TextKey = 'trade.title';

export const YOUR_GRID_X = 16;
export const YOUR_GRID_Y = 68;
export const MY_GRID_X = 16;
export const MY_GRID_Y = 274;

export const LINE_SPRITE = 'newui_myquest_Line.OZT';
export const LINE_X = 1;
export const LINE_Y = 220;
export const LINE_WIDTH = 188;
export const LINE_HEIGHT = 21;

export const NAME_SPRITE = 'newui_Account_title.OZT';
export const NAME_WIDTH = 171;
export const NAME_HEIGHT = 26;
export const YOUR_NAME_X = 11;
export const YOUR_NAME_Y = 37;
export const MY_NAME_X = 11;
export const MY_NAME_Y = 243;

export const YOUR_NAME_TEXT_X = 32;
export const YOUR_NAME_TEXT_Y = 43;
export const MY_NAME_TEXT_X = 20;
export const MY_NAME_TEXT_Y = 253;

export const YOUR_LEVEL_X = 134;
export const YOUR_LEVEL_Y = 48;

export const MONEY_SPRITE = 'newui_item_money.OZT';
export const MONEY_WIDTH = 170;
export const MONEY_HEIGHT = 26;
export const YOUR_MONEY_X = 11;
export const YOUR_MONEY_Y = 150;
export const MY_MONEY_X = 11;
export const MY_MONEY_Y = 356;
export const MONEY_TEXT_RIGHT = 170;
export const MONEY_TEXT_OFFSET_Y = 8;

/**
 * GlobalText[370] / [365] / [366] / [367]: the scam warning block - the red
 * "Warning" label at (20, 185) with the first line beside it at x = 45, the
 * other two under it at 15px steps.
 */
export const WARN_X = 20;
export const WARN_Y = 185;
export const WARN_TITLE: TextKey = 'common.warning';
export const WARN_LINES: { textKey: TextKey; x: number; y: number }[] = [
  { textKey: 'trade.warnCheck', x: 45, y: 185 },
  { textKey: 'trade.warnAlike', x: 20, y: 200 },
  { textKey: 'trade.warnCancel', x: 20, y: 215 },
];

export const ACCEPT_SPRITE = 'newui_Bt_accept.OZT';
export const ACCEPT_WIDTH = 36;
export const ACCEPT_HEIGHT = 29;
export const ACCEPT_FRAMES = { up: 0, check: 1, down: 1 } as const;
export const YOUR_ACCEPT_X = 146;
export const YOUR_ACCEPT_Y = 186;
export const MY_ACCEPT_X = 144;
export const MY_ACCEPT_Y = 390;

export const BUTTON_WIDTH = 36;
export const BUTTON_HEIGHT = 29;
export const BUTTON_Y = 390;
export const BUTTON_FRAMES = { up: 0, down: 1, check: 1 } as const;

export const CLOSE_BUTTON_X = 13;
export const ZEN_BUTTON_X = 104;
export const CLOSE_SPRITE = 'newui_exit_00.OZT';
export const ZEN_SPRITE = 'newui_Bt_money01.OZT';
/** GlobalText[1002] / [227]. */
export const CLOSE_TOOLTIP: TextKey = 'trade.cancel';
export const ZEN_TOOLTIP: TextKey = 'trade.offerZen';
export const ACCEPT_TOOLTIP: TextKey = 'trade.accept';

export const HEAD_CLOSE_X = 169;
export const HEAD_CLOSE_Y = 7;
export const HEAD_CLOSE_WIDTH = 13;
export const HEAD_CLOSE_HEIGHT = 12;

/** `ConvertYourLevel`: the partner's level is shown in bands, not exactly. */
export function levelBand(level: number): { text: string; color: string } {
  if (level >= 400) return { text: '400', color: 'rgb(255, 153, 153)' };
  if (level >= 300) return { text: '300+', color: 'rgb(255, 153, 255)' };
  if (level >= 200) return { text: '200+', color: 'rgb(210, 230, 255)' };
  if (level >= 100) return { text: '100+', color: 'rgb(0, 201, 24)' };
  if (level >= 50) return { text: '50+', color: 'rgb(255, 150, 0)' };
  return { text: '10+', color: 'rgb(255, 0, 0)' };
}

export const TRADE_SPRITES = [
  LINE_SPRITE,
  NAME_SPRITE,
  MONEY_SPRITE,
  ACCEPT_SPRITE,
  CLOSE_SPRITE,
  ZEN_SPRITE,
];
