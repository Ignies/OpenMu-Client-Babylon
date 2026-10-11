import type { TextKey } from '@/i18n';
import { MIX_COLUMNS, MIX_ROWS } from '@/modules/inventory/itemStorage';

/**
 * `CNewUIMixInventory` (NewUIMixInventory.cpp): the 190×429 item frame, the 8×4 tray at (15, 110),
 * the recipe text of `RenderFrame` (:344-640) and the 44×35 mix button centred on the bottom edge at
 * y = 380. `CChaosMixMenuMsgBox` (NewUICustomMessageBox.cpp:2751-2966) is the goblin's opening menu.
 */

export const COLUMNS = MIX_COLUMNS;
export const ROWS = MIX_ROWS;

export const GRID_X = 15;
export const GRID_Y = 110;

/** The text block's left edge and width (`fPos_x = x + 15`, 160 wide). */
export const TEXT_X = 15;
export const TEXT_WIDTH = 160;
export const TITLE_Y = 13;
/** Every tray but the goblin's has its title 5 lower and no tax line. */
export const CARD_TITLE_Y = 18;
export const TAX_Y = 25;
/** Recipe name lines 1 and 2, the success rate and the zen, from y 49 (`fLine_y += 24`). */
export const NAME_Y = 49;
export const NAME_LINE = 10;
export const RATE_Y = 69;
/** The zen line, under the rate; the seed researcher's trays have no rate and put it at `RATE_Y`. */
export const ZEN_Y = 89;
/** The prediction, the sources and the description, 15 a line from y 203. */
export const SOURCES_Y = 203;
export const SOURCE_LINE = 15;
/** `RenderMixDescriptions`: the Chaos Card lines, 13 apart from y 250. */
export const CARD_TEXT_Y = 250;
export const CARD_TEXT_LINE = 13;

export const MIX_BUTTON_X = 73;
export const MIX_BUTTON_Y = 380;
export const MIX_BUTTON_WIDTH = 44;
export const MIX_BUTTON_HEIGHT = 35;
export const MIX_BUTTON_FRAMES = { up: 0, active: 1, down: 1 } as const;
export const MIX_SPRITE = 'newui_Bt_mix.OZT';
/** GlobalText[591]. */
export const MIX_TOOLTIP: TextKey = 'chaos.combine';

export const HEAD_CLOSE_X = 169;
export const HEAD_CLOSE_Y = 7;
export const HEAD_CLOSE_WIDTH = 13;
export const HEAD_CLOSE_HEIGHT = 12;

/**
 * `RenderMixDescriptions` for the seed researcher's trays (NewUIMixInventory.cpp:776-790): the
 * label at y 280, and the 160x65 `CUISocketListBox` at (275, 360) on screen, its bottom edge: from
 * y 295 in the tray, 13 a line, the text 8 in.
 */
export const SOCKET_LABEL_Y = 280;
export const SOCKET_LIST = { x: 15, top: 295, width: 160, height: 65, line: 13, textX: 8 };

/**
 * `CSeedMasterMenuMsgBox` / `CSeedInvestigatorMenuMsgBox` (NewUICustomMessageBox.cpp:6292-6680): 7
 * middle slices under the title bar top, 60 from the top; the title at 10, two lines 18 apart from 43,
 * the two buttons at 85 and 120, Close 49 off the bottom.
 */
export const SEED_MENU_LINES = 7;
export const SEED_TEXT_Y = 43;
export const SEED_TEXT_LINE = 18;
export const SEED_BUTTON_Y = [85, 120] as const;

/** `CChaosMixMenuMsgBox`: 13 middle slices, 60 from the top of the screen. */
export const MENU_LINES = 13;
export const MENU_TOP = 60;
export const MENU_TEXT_X = 10;
export const MENU_TITLE_Y = 10;
export const MENU_TEXT_LINE = 15;
/** The three kinds: the lines that list them, and their buttons. */
export const MENU_REGULAR_TEXT_Y = 40;
export const MENU_REGULAR_BUTTON_Y = 85;
export const MENU_WEAPON_TEXT_Y = 125;
export const MENU_WEAPON_BUTTON_Y = 155;
export const MENU_OPTION_TEXT_Y = 210;
export const MENU_OPTION_BUTTON_Y = 225;
/** `MSGBOX_BTN_EMPTY` (108×29) widened by 20, and the small close button (64×29) 20 off the bottom. */
export const MENU_BUTTON_SPRITE = 'newui_btn_empty.OZT';
export const MENU_BUTTON_WIDTH = 128;
export const MENU_CLOSE_SPRITE = 'newui_btn_empty_small.OZT';
export const MENU_CLOSE_WIDTH = 64;
export const MENU_BUTTON_HEIGHT = 29;
export const MENU_CLOSE_BOTTOM = 49;

export const CHAOS_MACHINE_SPRITES = [MIX_SPRITE, MENU_BUTTON_SPRITE, MENU_CLOSE_SPRITE];
