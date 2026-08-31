import type { TextKey } from '../../../../../i18n';
import { InventoryConstants } from '../../../../../common/inventoryConstants';

export const GRID_X = 15;
export const GRID_Y = 200;

export const SQUARE = 20;

export const COLUMNS = InventoryConstants.RowSize;
export const ROWS = InventoryConstants.InventoryRows;
export const SQUARES = COLUMNS * ROWS;

export const FIRST_SLOT = InventoryConstants.LastEquippableItemSlotIndex + 1;

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
export const TITLE: TextKey = 'inventory.title';

export const OPTION_Y = 25;
export const OPTION_WIDTH = 0.3;
export const SET_OPTION_X = 0.2;
export const SOCKET_OPTION_X = 0.5;
export const SET_OPTION_TEXT = '[Set option]';
export const SOCKET_OPTION_TEXT = '[Socket option]';

export const MONEY_SPRITE = 'newui_item_money.OZT';
export const MONEY_X = 11;
export const MONEY_Y = 364;
export const MONEY_WIDTH = 170;
export const MONEY_HEIGHT = 26;
export const MONEY_TEXT_X = 50;
export const MONEY_TEXT_Y = 371;

export const BUTTON_Y = 391;
export const BUTTON_WIDTH = 36;
export const BUTTON_HEIGHT = 29;
export const BUTTON_FRAMES = { up: 0, down: 1, check: 1 } as const;

export const EXIT_BUTTON_X = 13;
export const REPAIR_BUTTON_X = 50;
export const SHOP_BUTTON_X = 87;
export const EXPAND_BUTTON_X = 87 + 37;

export const EXIT_SPRITE = 'newui_exit_00.OZT';
export const REPAIR_SPRITE = 'newui_repair_00.OZT';
export const SHOP_SPRITE = 'newui_Bt_openshop.OZT';
export const EXPAND_SPRITE = 'newui_expansion_btn.OZT';

export const EXIT_TOOLTIP: TextKey = 'inventory.close';
export const REPAIR_TOOLTIP: TextKey = 'inventory.repair';
export const SHOP_TOOLTIP: TextKey = 'inventory.personalShop';
export const EXPAND_TOOLTIP: TextKey = 'inventory.expand';

export type EquipmentSlotInfo = {
  slot: number;
  x: number;
  y: number;
  width: number;
  height: number;
  sprite: string;
};

export const EQUIPMENT_SLOTS: EquipmentSlotInfo[] = [
  {
    slot: InventoryConstants.PetSlot,
    x: 15,
    y: 44,
    width: 46,
    height: 46,
    sprite: 'newui_item_fairy.OZT',
  },
  {
    slot: InventoryConstants.HelmSlot,
    x: 75,
    y: 44,
    width: 46,
    height: 46,
    sprite: 'newui_item_cap.OZT',
  },
  {
    slot: InventoryConstants.WingsSlot,
    x: 120,
    y: 44,
    width: 61,
    height: 46,
    sprite: 'newui_item_wing.OZT',
  },
  {
    slot: InventoryConstants.LeftHandSlot,
    x: 15,
    y: 87,
    width: 46,
    height: 66,
    sprite: 'newui_item_weapon(L).OZT',
  },
  {
    slot: InventoryConstants.PendantSlot,
    x: 54,
    y: 87,
    width: 28,
    height: 28,
    sprite: 'newui_item_necklace.OZT',
  },
  {
    slot: InventoryConstants.ArmorSlot,
    x: 75,
    y: 87,
    width: 46,
    height: 66,
    sprite: 'newui_item_upper.OZT',
  },
  {
    slot: InventoryConstants.RightHandSlot,
    x: 135,
    y: 87,
    width: 46,
    height: 66,
    sprite: 'newui_item_weapon(R).OZT',
  },
  {
    slot: InventoryConstants.GlovesSlot,
    x: 15,
    y: 150,
    width: 46,
    height: 46,
    sprite: 'newui_item_gloves.OZT',
  },
  {
    slot: InventoryConstants.Ring1Slot,
    x: 54,
    y: 150,
    width: 28,
    height: 28,
    sprite: 'newui_item_ring.OZT',
  },
  {
    slot: InventoryConstants.PantsSlot,
    x: 75,
    y: 150,
    width: 46,
    height: 46,
    sprite: 'newui_item_lower.OZT',
  },
  {
    slot: InventoryConstants.Ring2Slot,
    x: 114,
    y: 150,
    width: 28,
    height: 28,
    sprite: 'newui_item_ring.OZT',
  },
  {
    slot: InventoryConstants.BootsSlot,
    x: 135,
    y: 150,
    width: 46,
    height: 46,
    sprite: 'newui_item_boots.OZT',
  },
];

export const HEAD_CLOSE_X = 169;
export const HEAD_CLOSE_Y = 7;
export const HEAD_CLOSE_WIDTH = 13;
export const HEAD_CLOSE_HEIGHT = 12;

export const INVENTORY_SPRITES = [
  SQUARE_SPRITE,
  MONEY_SPRITE,
  EXIT_SPRITE,
  REPAIR_SPRITE,
  SHOP_SPRITE,
  EXPAND_SPRITE,
  ...EQUIPMENT_SLOTS.map(slot => slot.sprite),
];
