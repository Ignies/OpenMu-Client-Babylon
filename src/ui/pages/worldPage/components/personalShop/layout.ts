import type { TextKey } from '../../../../../i18n';
import {
  PERSONAL_SHOP_COLUMNS,
  PERSONAL_SHOP_ROWS,
} from '../../../../../common/itemStorage';

/**
 * `CNewUIMyShopInventory` / `CNewUIPurchaseShopInventory`
 * (NewUIMyShopInventory.cpp:495, NewUIPurchaseShopInventory.cpp:230): the
 * same 190×429 frame for both - the title plate at (12, 49), the 8×4 grid at
 * (16, 90) and the three buttons on the bottom edge at x = 13 / 53 / 93.
 */

export const COLUMNS = PERSONAL_SHOP_COLUMNS;
export const ROWS = PERSONAL_SHOP_ROWS;

export const GRID_X = 16;
export const GRID_Y = 90;

export const TITLE_Y = 15;
/** GlobalText[1102]. */
export const TITLE: TextKey = 'personalShop.title';

export const NAME_SPRITE = 'newui_Box_openTitle.OZT';
export const NAME_X = 12;
export const NAME_Y = 49;
export const NAME_WIDTH = 169;
export const NAME_HEIGHT = 26;
/**
 * `m_EditBox->SetPosition(m_Pos.x + 50, m_Pos.y + 55)`
 * (NewUIMyShopInventory.cpp:86): the caret starts at 50, clear of the plate's
 * own left-hand ornament - at 20 the name was typed over it. The right edge
 * stays inside the plate (12 + 169 = 181).
 */
export const NAME_INPUT_X = 50;
export const NAME_INPUT_Y = 55;
export const NAME_INPUT_WIDTH = 126;

/** GlobalText[1103]: shown while the stall is up. */
export const SELLING_Y = 200;
export const SELLING_TEXT: TextKey = 'personalShop.selling';

/**
 * GlobalText[370] + [1109]…[1135]: the personal-shop rules block.
 *
 * The original draws each line at a fixed `m_Pos.y + …` with no width, so a
 * line simply runs off the 190-wide frame; its own English strings are short
 * enough to get away with it, ours (and every translation) are not. The
 * block flows instead, inside the frame's own inner width (21 px of border
 * on each side), between the title and the buttons.
 */
export const INFO_X = 22;
export const INFO_WIDTH = 146;
export const INFO_TITLE_Y = 230;
/** The buttons start at 391: the block may not grow past this. */
export const INFO_BOTTOM = 386;
export const INFO_TITLE: TextKey = 'common.warning';
export const INFO_LINES: { textKey: TextKey; warn?: boolean }[] = [
  { textKey: 'personalShop.info1' },
  { textKey: 'personalShop.info2' },
  { textKey: 'personalShop.info3' },
  { textKey: 'personalShop.info4' },
  { textKey: 'personalShop.info5' },
  { textKey: 'personalShop.warn1', warn: true },
  { textKey: 'personalShop.warn2', warn: true },
];

export const BUTTON_Y = 391;
export const BUTTON_WIDTH = 36;
export const BUTTON_HEIGHT = 29;
export const BUTTON_FRAMES = { up: 0, down: 1, check: 1 } as const;

export const EXIT_BUTTON_X = 13;
export const OPEN_BUTTON_X = 53;
export const CLOSE_BUTTON_X = 93;

export const EXIT_SPRITE = 'newui_exit_00.OZT';
export const OPEN_SPRITE = 'newui_Bt_openshop.OZT';
export const CLOSE_SPRITE = 'newui_Bt_closeshop.OZT';

/** GlobalText[1002] / [1106] / [1107] / [1108]. */
export const EXIT_TOOLTIP: TextKey = 'common.close';
export const OPEN_TOOLTIP: TextKey = 'personalShop.openTip';
export const CLOSE_TOOLTIP: TextKey = 'personalShop.closeTip';

export const HEAD_CLOSE_X = 169;
export const HEAD_CLOSE_Y = 7;
export const HEAD_CLOSE_WIDTH = 13;
export const HEAD_CLOSE_HEIGHT = 12;

/** The browsed stall names its owner where the edit box sits. */
export const BROWSE_TITLE_Y = 58;

export const PERSONAL_SHOP_SPRITES = [
  NAME_SPRITE,
  EXIT_SPRITE,
  OPEN_SPRITE,
  CLOSE_SPRITE,
];
