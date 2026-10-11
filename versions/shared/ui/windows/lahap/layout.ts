import { MSGBOX_WIDTH } from '@/controllers/interface/components/msg_box_frame';
import { UI_STAGE_WIDTH } from '@/controllers/interface/components/ui_stage';

/**
 * Lahap's message boxes on the 640x480 stage (NewUICustomMessageBox.cpp:1112-2160): every box is
 * `MSGBOX_WIDTH` wide, centred, 100 from the top, built on the three-slice frame.
 */
export const BOX = { x: (UI_STAGE_WIDTH - MSGBOX_WIDTH) / 2, y: 100 };

/** `RenderTexts`: from `MSGBOX_TEXT_TOP_BLANK / 2`, each line its height plus 4, centred. */
export const TEXT_TOP = 17;
export const TEXT_STEP = 17;

/** `MSGBOX_BTN_EMPTY` 108x29 and `MSGBOX_BTN_EMPTY_SMALL` 64x29, three frames each. */
export const BUTTON_SPRITE = 'newui_btn_empty.OZT';
export const SMALL_BUTTON_SPRITE = 'newui_btn_empty_small.OZT';
export const BUTTON_WIDTH = 108;
export const SMALL_BUTTON_WIDTH = 64;
export const BUTTON_HEIGHT = 29;
export const BUTTON_FRAMES = { up: 0, active: 1, down: 2 } as const;

/** `CGemIntegrationMsgBox`: 5 middle slices; the two buttons 60 and 100 down, Close 40 below. */
export const MENU_LINES = 5;
export const MENU_BUTTON_Y = 60;
export const MENU_BUTTON_GAP = 40;

/**
 * `CGemIntegrationUnityMsgBox`: 10 middle slices with the jewel buttons, 7 with the count buttons
 * (`ResetWndSize`), Close 50 off the bottom. The jewels two to a row from (20, 50), 84 wide, 5 apart;
 * the counts from (50, 50), 128 wide, 10 apart.
 */
export const COMBINE_LINES = 10;
export const COMBINE_COUNT_LINES = 7;
export const JEWEL_X = 20;
export const JEWEL_Y = 50;
export const JEWEL_WIDTH = SMALL_BUTTON_WIDTH + 20;
export const JEWEL_GAP_X = 20;
export const JEWEL_GAP_Y = 5;
export const COUNT_X = 50;
export const COUNT_WIDTH = BUTTON_WIDTH + 20;
export const COUNT_GAP_Y = 10;
export const CLOSE_BOTTOM = 50;

/**
 * `CGemIntegrationDisjointMsgBox`: 10 middle slices, the 180x109 `CUIUnmixgemList` centred with its
 * top 65 down (13 a line, 8 shown), Disband 85 and Close 50 off the bottom.
 */
export const DISMANTLE_LINES = 10;
export const LIST = { width: 180, height: 109, top: 65, line: 13 };
export const DISBAND_BOTTOM = 85;

/** `CNewUICommonMessageBox` (OK / Cancel): text rows from 35, 15 apart; the buttons 50 off the bottom. */
export const CHECK_TEXT_TOP = 35;
export const CHECK_TEXT_WIDTH = 180;
export const CHECK_LINE_STEP = 15;
export const CHECK_FRAME_LINES = 2;
export const OK_SPRITE = 'newui_button_ok.OZT';
export const CANCEL_SPRITE = 'newui_button_cancel.OZT';
export const CHECK_BUTTON = { width: 54, height: 30 };
export const OK_X = 30;
export const CANCEL_X = 145;

/** `LockOkButton`-style: a disabled button is drawn dimmed. */
export const LOCKED_BUTTON = { opacity: 0.6, filter: 'brightness(0.6)' };

// `AddMsg` colours: the orange title, `CLRDW_YELLOW` (255, 255, 121), `CLRDW_DARKYELLOW` (255, 255, 0),
// the list's (230, 220, 200) and its picked line, black on the scroll bar's (106, 97, 88).
export const TITLE_COLOR = 'rgb(255, 128, 0)';
export const YELLOW = 'rgb(255, 255, 121)';
export const DARK_YELLOW = 'rgb(255, 255, 0)';
export const LIST_TEXT = 'rgb(230, 220, 200)';
export const LIST_PICKED = 'rgb(106, 97, 88)';
