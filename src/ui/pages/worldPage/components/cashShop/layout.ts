/**
 * `CNewUICashShop`: the 190x429 item frame, laid out the way
 * `CNewUINPCShop` lays out a merchant - title on the head, an 8-column grid of
 * 20px squares below it, and the money bar on the bottom edge.
 *
 * Same numbers as `npcShop/layout.ts` on purpose: a player who can read one
 * shop can read the other, and the squares have to line up with the inventory
 * they are compared against.
 *
 * Every pixel the window and the gacha stage use is here. The stylesheet
 * says how a piece behaves, never where it is.
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

/** The X in the frame art (`CheckMouseIn(x + 169, y + 7, 13, 12)`). */
export const HEAD_CLOSE = { left: 169, top: 7, width: 13, height: 12 };

/**
 * The tab strip, between the title and the grid. Five tabs - the four
 * product lines and the delivery queue - across the 167px between the frame
 * edges, so each is a 33px crop of `newui_guild_tab04.OZT`'s 56px art. The
 * sheet is two 22px frames, off and on; MuButton picks the second for the
 * checked tab.
 */
export const TAB_Y = 46;
export const TAB_X = 13;
export const TAB_WIDTH = 33;
export const TAB_HEIGHT = 22;
export const TAB_SPRITE = 'newui_guild_tab04.OZT';
export const TAB_FRAMES = { up: 0, down: 1, check: 1 } as const;

/**
 * The band between the grid and the money bar: what is selected, what it
 * costs, and why it cannot be bought when it cannot.
 */
export const SELECTION_X = GRID_X;
export const SELECTION_Y = 322;
export const SELECTION_WIDTH = COLUMNS * SQUARE;
export const SELECTION_HEIGHT = 31;

/** The jewel bar on the bottom edge, where the NPC shop puts its repair cost. */
export const WALLET_SPRITE = 'newui_item_money2.OZT';
export const WALLET_X = 10;
export const WALLET_Y = 355;
export const WALLET_WIDTH = 170;
export const WALLET_HEIGHT = 24;

/** `newui_exit_00.OZT` is 36x58: two 29px frames, up and down. */
export const EXIT_SPRITE = 'newui_exit_00.OZT';
export const EXIT = { x: 77, y: 392, width: 36, height: 29 };
export const EXIT_FRAMES = { up: 0, down: 1 } as const;
/** Where the exit moves when the plate beside it is up: 77 would overlap it by a pixel. */
export const EXIT_BESIDE_X = 100;

/**
 * The left plate: Buy on a stock tab, Roll on the gacha. A plain OK plate,
 * not the X. `newui_button_ok.OZT` is 54x90, three 30px frames.
 */
export const ROLL_SPRITE = 'newui_button_ok.OZT';
export const ROLL = { x: 24, y: 391, width: 54, height: 30 };
export const ROLL_FRAMES = { up: 0, active: 1, down: 2 } as const;
export const BUY = ROLL;

/** The gacha stage replaces the grid, in the same rectangle. */
export const STAGE_X = GRID_X;
export const STAGE_Y = GRID_Y;
export const STAGE_WIDTH = COLUMNS * SQUARE;
export const STAGE_HEIGHT = ROWS * SQUARE;

/**
 * The box: a real Box of Kundun. The icon pack has all sixteen tints for it
 * (`ITEM_ICON_MANIFEST['14_11'] === 255`), which is why the box itself can
 * carry the tier instead of only its glow.
 */
export const BOX_GROUP = 14;
export const BOX_NUM = 11;
export const BOX_SIZE = 76;
export const BOX_X = (STAGE_WIDTH - BOX_SIZE) / 2;
/** left/top placement, never a transform: reduced motion sets `transform: none`. */
export const BOX_REST_Y = 84;
/** px above the rest mark the fall starts from; clipped by the stage. */
export const BOX_FALL_FROM = -100;
/** The fall ends this far off the floor until the order answers. */
export const BOX_HANG = 4;
/** px into the box (38%) where the lid meets the body in the icon. */
export const SEAM_Y = 29;

/**
 * The fee starts on the wallet bar and ends on the seam. Window space,
 * because the stage clips anything below y 240.
 */
export const FEE_X = WALLET_X + WALLET_WIDTH / 2 - 10;
export const FEE_Y = WALLET_Y + WALLET_HEIGHT / 2 - 10;
/** The arc's total lift, from the bar to the seam. */
export const FEE_RISE = FEE_Y - (STAGE_Y + BOX_REST_Y + SEAM_Y - 10);

/** The reveal draws the item at twice the grid pitch. */
export const PRIZE_ZOOM = 2;

/**
 * Above the HUD sheets (500) so the light reads over the minimap and emote
 * menu, below modal prompts (600), tooltips (1200) and the cursor (2000).
 */
export const DROP_LIGHT_Z = 520;

/** Folded into the world preload so the plates stop popping in on first open. */
export const CASH_SHOP_SPRITES = [
  TAB_SPRITE,
  WALLET_SPRITE,
  ROLL_SPRITE,
  EXIT_SPRITE,
  SQUARE_SPRITE,
] as const;
