// The original's three-slice message box (`CNewUIMessageBoxMng::LoadImages`,
// NewUIMessageBox.cpp:444): a 230-wide frame over a stretched fill, whose
// middle slice repeats once per line of text. Only the prompt with two fields
// needs it; everything else fits the 352x113 box in `msgWindow/layout.ts`.
export const TALL_BACK_SPRITE = 'newui_msgbox_back.OZJ';
export const TALL_TOP_SPRITE = 'newui_msgbox_top.OZT';
export const TALL_MIDDLE_SPRITE = 'newui_msgbox_middle.OZT';
export const TALL_BOTTOM_SPRITE = 'newui_msgbox_bottom.OZT';

// `MSGBOX_WIDTH`, `MSGBOX_TOP_HEIGHT`, `MSGBOX_MIDDLE_HEIGHT`,
// `MSGBOX_BOTTOM_HEIGHT` (NewUICommonMessageBox.h:30).
export const TALL_WIDTH = 230;
export const TALL_TOP_HEIGHT = 67;
export const TALL_MIDDLE_HEIGHT = 15;
export const TALL_BOTTOM_HEIGHT = 50;

/** Middle slices: what a title, a wrapping message and two fields need. */
export const TALL_MIDDLE_LINES = 8;

export const TALL_HEIGHT =
  TALL_TOP_HEIGHT + TALL_MIDDLE_HEIGHT * TALL_MIDDLE_LINES + TALL_BOTTOM_HEIGHT;

// `MSGBOX_BACK_BLANK_WIDTH` / `_HEIGHT`: the fill is stretched a little
// smaller than the frame so the frame's own edge stays on top of it.
export const TALL_BACK_TOP = 2;
export const TALL_BACK_WIDTH = TALL_WIDTH - 8;
export const TALL_BACK_HEIGHT = TALL_HEIGHT - 10;

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
