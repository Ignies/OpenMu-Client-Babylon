import { MSGBOX_WIDTH } from '../../../../components/msgBoxFrame';
import { UI_STAGE_WIDTH } from '../../../../components/uiStage';

/** `SetPos((SCREEN_WIDTH / 2) - (MSGBOX_WIDTH / 2), 50)` on the 640x480 stage. */
export const BOX = { x: (UI_STAGE_WIDTH - MSGBOX_WIDTH) / 2, y: 50 };

/**
 * `CNewUICommonMessageBox::RenderTexts`: rows from 35, each message wrapped
 * at `MSGBOX_TEXT_MAXWIDTH` and centred. The frame grows a middle slice per
 * row past the two its top and bottom already hold.
 */
export const TEXT_TOP = 35;
export const TEXT_WIDTH = 180;
export const TEXT_X = (MSGBOX_WIDTH - TEXT_WIDTH) / 2;
export const LINE_STEP = 15;
export const FRAME_LINES = 2;

/** `newui_button_ok/cancel.tga`: 54x90, three 30 px frames, each centred in its half, 20 px off the bottom. */
export const OK_SPRITE = 'newui_button_ok.OZT';
export const CANCEL_SPRITE = 'newui_button_cancel.OZT';
export const BUTTON = { width: 54, height: 30 };
export const BUTTON_FRAMES = { up: 0, active: 1, down: 2 } as const;
export const OK_X = 30;
export const CANCEL_X = 145;
export const BUTTON_BOTTOM = 50;

/** `LockOkButton`: the plate is drawn tinted RGBA(153, 153, 153, 153). */
export const LOCKED_BUTTON = { opacity: 0.6, filter: 'brightness(0.6)' };

// `AddMsg` colours. `RGBA()` packs red into the low byte, so the raw DWORDs
// the Gatekeeper's box passes read ABGR: 0xFF49B0FF is (255, 176, 73).
export const WEREWOLF_TITLE_COLOR = 'rgb(254, 176, 72)';
export const WEREWOLF_FIRST_COLOR = 'rgb(170, 218, 146)';
export const GATEKEEPER_TITLE_COLOR = 'rgb(255, 176, 73)';
export const GATEKEEPER_FIRST_COLOR = 'rgb(145, 241, 97)';
/** `CLRDW_WHITE`, the default of every other line. */
export const TEXT_COLOR = '#ffffff';
