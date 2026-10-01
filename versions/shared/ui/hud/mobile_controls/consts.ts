/**
 * Geometry for the mobile HUD, in screen pixels rather than the 640x480 UI
 * stage: these are thumb targets, not reproductions of the original's art, so
 * they must not shrink with the stage on a small screen.
 */

/** `IMAGE_SKILLBOX` / `IMAGE_SKILLBOX_USE`: the empty box and its lit copy. */
export const SKILLBOX_SPRITE = 'newui_skillbox.OZJ';
export const SKILLBOX_USE_SPRITE = 'newui_skillbox2.OZJ';

/** The skill box's own size on the sheet. */
export const BOX_WIDTH = 32;
export const BOX_HEIGHT = 38;

/** Boxes are drawn at 51x61 - comfortably past the ~44 px a thumb needs. */
export const SLOT_SCALE = 1.6;

/** The five main-frame buttons (30x41) at 42x57. */
export const MENU_SCALE = 1.4;
