import type { TextKey } from '../../../../../i18n';
import { SHOP_COLUMNS, SHOP_ROWS } from '../../../../../store';

/**
 * `CNewUINPCShop` (NewUINPCShop.cpp): the window is the 190×429 item frame,
 * the stock grid sits at (15, 50) in 8×15 squares, the repair bar at
 * (10, 355) and the two repair buttons on the bottom edge.
 */

export const GRID_X = 15;
export const GRID_Y = 50;

export const SQUARE = 20;

export const COLUMNS = SHOP_COLUMNS;
export const ROWS = SHOP_ROWS;
export const SQUARES = COLUMNS * ROWS;

export const SQUARE_SPRITE = 'newui_item_box.OZT';
export const SQUARE_SPRITE_SIZE = 21;

const WND_TOP_EDGE = 3;
const WND_LEFT_EDGE = 4;
const WND_BOTTOM_EDGE = 8;
const WND_RIGHT_EDGE = 9;
const TABLE_CORNER = 14;

export const GRID_FRAME_X = GRID_X - WND_LEFT_EDGE;
export const GRID_FRAME_Y = GRID_Y - WND_TOP_EDGE;
export const GRID_FRAME_WIDTH =
  COLUMNS * SQUARE - WND_RIGHT_EDGE + WND_LEFT_EDGE + TABLE_CORNER;
export const GRID_FRAME_HEIGHT =
  ROWS * SQUARE - WND_BOTTOM_EDGE + WND_TOP_EDGE + TABLE_CORNER;

export const TITLE_Y = 12;
/** GlobalText[230]. */
export const TITLE: TextKey = 'shop.title';
export const TAX_Y = 27;
/** GlobalText[1623]. */
export const TAX: TextKey = 'shop.tax';

export const REPAIR_MONEY_SPRITE = 'newui_item_money2.OZT';
export const REPAIR_MONEY_X = 10;
export const REPAIR_MONEY_Y = 355;
export const REPAIR_MONEY_WIDTH = 170;
export const REPAIR_MONEY_HEIGHT = 24;
export const REPAIR_LABEL_X = 20;
export const REPAIR_TEXT_X = 100;
export const REPAIR_TEXT_Y = 362;
/** GlobalText[239]. */
export const REPAIR_LABEL: TextKey = 'shop.repairAll';

export const BUTTON_Y = 390;
export const BUTTON_WIDTH = 36;
export const BUTTON_HEIGHT = 29;
export const BUTTON_FRAMES = { up: 0, down: 1, check: 1 } as const;

export const REPAIR_BUTTON_X = 54;
export const REPAIR_ALL_BUTTON_X = 98;
export const REPAIR_SPRITE = 'newui_repair_00.OZT';
/** GlobalText[233] / [237]. */
export const REPAIR_TOOLTIP: TextKey = 'shop.repair';
export const REPAIR_ALL_TOOLTIP: TextKey = 'shop.repairAll';

export const HEAD_CLOSE_X = 169;
export const HEAD_CLOSE_Y = 7;
export const HEAD_CLOSE_WIDTH = 13;
export const HEAD_CLOSE_HEIGHT = 12;

export const NPC_SHOP_SPRITES = [SQUARE_SPRITE, REPAIR_MONEY_SPRITE, REPAIR_SPRITE];
