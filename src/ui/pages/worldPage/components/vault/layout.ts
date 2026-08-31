import type { TextKey } from '../../../../../i18n';
import { VAULT_COLUMNS, VAULT_ROWS } from '../../../../../common/itemStorage';

/**
 * `CNewUIStorageInventory` (NewUIStorageInventory.cpp): the 190×429 item
 * frame with the 8×15 grid at (15, 36), the money well at (10, 342) and the
 * three buttons on the bottom edge at 37px pitch from x = 13.
 */

export const COLUMNS = VAULT_COLUMNS;
export const ROWS = VAULT_ROWS;

export const GRID_X = 15;
export const GRID_Y = 36;

export const TITLE_Y = 11;
/** GlobalText[234] + GlobalText[240] / [241]. */
export const TITLE: TextKey = 'vault.title';
export const TITLE_UNLOCKED: TextKey = 'vault.unlocked';
export const TITLE_LOCKED: TextKey = 'vault.locked';

export const MONEY_SPRITE = 'newui_item_money3.OZT';
export const MONEY_X = 10;
export const MONEY_Y = 342;
export const MONEY_WIDTH = 170;
export const MONEY_HEIGHT = 46;

export const MONEY_TEXT_RIGHT = 168;
export const MONEY_TEXT_Y = MONEY_Y + 8;

/** GlobalText[266]: the warehouse fee line, red label + gold amount. */
export const FEE_LABEL: TextKey = 'vault.fee';
export const FEE_LABEL_X = MONEY_X + 15;
export const FEE_TEXT_Y = MONEY_Y + 29;

export const BUTTON_Y = 391;
export const BUTTON_WIDTH = 36;
export const BUTTON_HEIGHT = 29;
export const BUTTON_FRAMES = { up: 0, down: 1, check: 1 } as const;

const BUTTON_X0 = 13;
const BUTTON_PITCH = 37;

export const DEPOSIT_BUTTON_X = BUTTON_X0;
export const WITHDRAW_BUTTON_X = BUTTON_X0 + BUTTON_PITCH;
export const LOCK_BUTTON_X = BUTTON_X0 + BUTTON_PITCH * 2;

export const DEPOSIT_SPRITE = 'newui_Bt_money01.OZT';
export const WITHDRAW_SPRITE = 'newui_Bt_money02.OZT';
export const UNLOCKED_SPRITE = 'newui_Bt_lock02.OZT';
export const LOCKED_SPRITE = 'newui_Bt_lock.OZT';

/** GlobalText[235] / [236] / [242]. */
export const DEPOSIT_TOOLTIP: TextKey = 'vault.deposit';
export const WITHDRAW_TOOLTIP: TextKey = 'vault.withdraw';
export const LOCK_TOOLTIP: TextKey = 'vault.pin';

export const HEAD_CLOSE_X = 169;
export const HEAD_CLOSE_Y = 7;
export const HEAD_CLOSE_WIDTH = 13;
export const HEAD_CLOSE_HEIGHT = 12;

export const VAULT_SPRITES = [
  MONEY_SPRITE,
  DEPOSIT_SPRITE,
  WITHDRAW_SPRITE,
  UNLOCKED_SPRITE,
  LOCKED_SPRITE,
];
