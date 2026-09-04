/**
 * `CNewUICashShop`: the 190x429 item frame, laid out the way
 * `CNewUINPCShop` lays out a merchant - title on the head, an 8-column grid of
 * 20px squares below it, and the money bar on the bottom edge.
 *
 * Same numbers as `npcShop/layout.ts` on purpose: a player who can read one
 * shop can read the other, and the squares have to line up with the inventory
 * they are compared against.
 */

export const GRID_X = 15;
export const GRID_Y = 74;

export const SQUARE = 20;
export const COLUMNS = 8;
export const ROWS = 12;
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

/** The tab strip, between the title and the grid. */
export const TAB_Y = 46;
export const TAB_X = 13;
export const TAB_WIDTH = 41;
export const TAB_HEIGHT = 22;
export const TAB_SPRITE = 'newui_guild_tab04.OZT';

/** The jewel bar on the bottom edge, where the NPC shop puts its repair cost. */
export const WALLET_SPRITE = 'newui_item_money2.OZT';
export const WALLET_X = 10;
export const WALLET_Y = 355;
export const WALLET_WIDTH = 170;
export const WALLET_HEIGHT = 24;

export const EXIT_SPRITE = 'newui_exit_00.OZT';
export const EXIT = { x: 77, y: 392, width: 36, height: 29 };

/** The gacha's own button, beside the exit. A plain OK plate, not the X. */
export const ROLL_SPRITE = 'newui_button_ok.OZT';
export const ROLL = { x: 24, y: 392, width: 54, height: 29 };

/** The gacha stage replaces the grid, in the same rectangle. */
export const STAGE_X = GRID_X;
export const STAGE_Y = GRID_Y;
export const STAGE_WIDTH = COLUMNS * SQUARE;
export const STAGE_HEIGHT = ROWS * SQUARE;
