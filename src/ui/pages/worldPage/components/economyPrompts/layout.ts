// The original's three-slice message box, from `ui/components/msgBoxFrame`:
// the two-field prompt is the only economy window that needs it; everything
// else fits the 352x113 box in `msgWindow/layout.ts`.
import {
  MSGBOX_BOTTOM_HEIGHT,
  MSGBOX_MIDDLE_HEIGHT,
  MSGBOX_TOP_HEIGHT,
  MSGBOX_WIDTH,
  msgBoxHeight,
} from '../../../../components/msgBoxFrame';

export const TALL_WIDTH = MSGBOX_WIDTH;
export const TALL_TOP_HEIGHT = MSGBOX_TOP_HEIGHT;
export const TALL_MIDDLE_HEIGHT = MSGBOX_MIDDLE_HEIGHT;
export const TALL_BOTTOM_HEIGHT = MSGBOX_BOTTOM_HEIGHT;

/** Middle slices: what a title, a wrapping message and two fields need. */
export const TALL_MIDDLE_LINES = 8;

export const TALL_HEIGHT = msgBoxHeight(TALL_MIDDLE_LINES);

// `MSGBOX_TEXT_TOP_BLANK` 35, `MSGBOX_TEXT_MAXWIDTH` 180.
export const TALL_TEXT_INSET_X = 25;
export const TALL_TEXT_TOP = 35;
export const TALL_TEXT_LINE_HEIGHT = 17;
export const TALL_TEXT_LINES = 3;

/** The input frame centred, as `CNewUITextInputMsgBox::Create` places it. */
export const TALL_INPUT_X = 29;

export const TALL_LABEL_HEIGHT = 15;
export const TALL_FIELD_ONE_LABEL_Y = 90;
export const TALL_FIELD_ONE_INPUT_Y = 105;
export const TALL_FIELD_TWO_LABEL_Y = 134;
export const TALL_FIELD_TWO_INPUT_Y = 149;

// `MSGBOX_BTN_BOTTOM_BLANK` 20 under a 30-tall button, each centred in its
// half of the box.
export const TALL_BTN_Y = TALL_HEIGHT - 50;
export const TALL_BTN_OK_X = 30;
export const TALL_BTN_CANCEL_X = 145;
