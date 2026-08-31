import type { TextKey } from '../../../../../i18n';
import { MIX_COLUMNS, MIX_ROWS } from '../../../../../common/itemStorage';

/**
 * `CNewUIMixInventory` (NewUIMixInventory.cpp): the 190×429 item frame, the
 * 8×4 tray at (15, 110) and the 44×35 mix button centred on the bottom edge
 * at y = 380. The block the original fills with the recipe it matched
 * (`GetCurRecipeName`, `GetSourceName`) is the mix menu here - see the note
 * on `MIX_MENU` in economy.ts.
 */

export const COLUMNS = MIX_COLUMNS;
export const ROWS = MIX_ROWS;

export const GRID_X = 15;
export const GRID_Y = 110;

export const TITLE_Y = 13;
/** GlobalText[735]. */
export const TITLE: TextKey = 'chaos.title';
export const SUBTITLE_Y = 25;
/** GlobalText[1623]. */
export const taxText = (rate: number) => `Chaos tax: ${rate}%`;

export const RECIPE_X = 15;
export const RECIPE_Y = 45;
export const RECIPE_WIDTH = 160;
export const RECIPE_HEIGHT = 58;

export const MENU_X = 15;
export const MENU_Y = 203;
export const MENU_WIDTH = 160;
export const MENU_HEIGHT = 168;

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

export const CHAOS_MACHINE_SPRITES = [MIX_SPRITE];
