/**
 * The start menu and its server-setup window, in the original's 640×480 units.
 *
 * Two pieces of MU chrome are reused rather than invented: the menu is the
 * login window's own frame (`login_back.OZT`, the one with the MU ONLINE plate
 * and the dragon corners), and the setup window is the Option window's frame —
 * a mirrored top and bottom band over a stone fill, which is what MU uses for
 * anything with settings in it.
 */

export const SPRITE = {
  /** 329×245 window with the MU ONLINE plate — the login window's frame. */
  menuWindow: 'login_back.OZT',
  /** 193×26, three frames: idle, hover, pressed. The server-list row art. */
  menuButton: 'server_b2_all.OZT',
  /** 108×30, four frames: idle, hover, pressed, selected (gold). */
  button: 'op1_b_all.OZT',
  /** 213×65 top band, mirrored to make the full window width. */
  optionTop: 'op2_back1.OZT',
  /** 213×43 bottom band, mirrored the same way. */
  optionBottom: 'op1_back2.OZT',
  optionFill: 'op1_stone.OZJ',
  optionRailLeft: 'op1_back3.OZJ',
  optionRailRight: 'op1_back4.OZJ',
  /** 156×23 sunken plate; the text input sits on top of it. */
  input: 'login_me.OZT',
  /** 16×16 per frame: unchecked, checked. */
  check: 'op2_ch.OZT',
} as const;

// ---- start menu --------------------------------------------------------

export const MENU_WIN_WIDTH = 329;
export const MENU_WIN_HEIGHT = 245;

export const MENU_BTN_WIDTH = 193;
export const MENU_BTN_HEIGHT = 26;
export const MENU_BTN_X = Math.floor((MENU_WIN_WIDTH - MENU_BTN_WIDTH) / 2);
/** One row per 30, below the frame's title plate. */
export const MENU_BTN_STEP = 30;

/** The band the frame leaves free: under the title plate, above the two lines. */
const MENU_BTN_AREA_TOP = 70;
const MENU_BTN_AREA_BOTTOM = 190;

/**
 * The buttons centred in that band rather than hung from its top. The menu is
 * two entries now — online play and the server fields both live behind
 * Worlds — and two buttons pinned under the plate leave the stone below them
 * looking
 * like the rest of the menu failed to draw.
 */
export function menuButtonsTop(count: number) {
  const block = MENU_BTN_HEIGHT + MENU_BTN_STEP * (count - 1);
  const free = MENU_BTN_AREA_BOTTOM - MENU_BTN_AREA_TOP - block;
  return Math.round(MENU_BTN_AREA_TOP + Math.max(0, free) / 2);
}

/** The two lines under the buttons: the chosen server, then its endpoints. */
export const MENU_SERVER_LINE_Y = 198;
export const MENU_ENDPOINT_LINE_Y = 212;

// ---- server setup window ------------------------------------------------

const ART_WIDTH = 213;

export const SETUP_WIN_WIDTH = ART_WIDTH * 2;

export const SETUP_TOP_HEIGHT = 65;
export const SETUP_BOTTOM_HEIGHT = 43;
export const SETUP_ART_WIDTH = ART_WIDTH;

export const SETUP_TITLE_Y = 12;

export const CONTENT_TOP = 72;

/** Left column: the saved servers and the buttons that add or remove one. */
export const LIST_X = 18;
export const LIST_ROW_WIDTH = MENU_BTN_WIDTH;
export const LIST_ROW_HEIGHT = MENU_BTN_HEIGHT;
export const LIST_TOP = CONTENT_TOP + 16;
/**
 * Six rows, which is a list rather than a shortlist now that the published
 * servers share the column with the saved ones. More than six pages.
 */
export const LIST_MAX = 6;

export const BTN_WIDTH = 108;
export const BTN_HEIGHT = 30;
export const LIST_BUTTONS_Y = LIST_TOP + LIST_ROW_HEIGHT * LIST_MAX + 6;
export const ADD_X = LIST_X;
export const DELETE_X = LIST_X + BTN_WIDTH + 6;

/** Paging arrows, on the list's header line (`server_deco_all.OZT`). */
export const PAGE_ARROW = { width: 23, height: 29 };
export const PAGE_PREV_X = LIST_X + LIST_ROW_WIDTH - PAGE_ARROW.width * 2 - 4;
export const PAGE_NEXT_X = LIST_X + LIST_ROW_WIDTH - PAGE_ARROW.width;
export const PAGE_ARROW_Y = CONTENT_TOP - 9;

/** Right column: the fields of the selected server. */
export const FIELD_X = 246;
export const FIELD_WIDTH = 162;
export const FIELD_HEIGHT = 23;
export const PORT_WIDTH = 70;

/** label, then the plate under it; one field per 40. */
export const FIELD_LABEL_H = 13;
export const FIELD_STEP = 40;
export const FIELD_TOP = CONTENT_TOP;

/**
 * A published server's banner, under its fields. 16:10 of the right column —
 * the artwork these lists carry is a wide title card, so it crops well.
 */
export const BANNER_X = FIELD_X;
export const BANNER_Y = FIELD_TOP + FIELD_STEP * 4 + 4;
export const BANNER_WIDTH = FIELD_WIDTH;
export const BANNER_HEIGHT = 100;
export const CHECK_SIZE = 16;

/**
 * The rows under the two columns, and the window they add up to. Derived rather
 * than pinned, so moving a row above them does not leave the lines below
 * floating at a constant that no longer holds.
 */
export function setupMetrics() {
  const contentBottom = LIST_BUTTONS_Y + BTN_HEIGHT;

  const checkY = contentBottom + 10;
  const previewY = checkY + 26;
  const noteY = previewY + 16;
  const height = noteY + 13 + 8 + SETUP_BOTTOM_HEIGHT;

  return {
    /** Left, under both columns: the sentence needs the full width. */
    checkX: LIST_X,
    checkY,
    previewY,
    noteY,
    height,
    closeY: height - SETUP_BOTTOM_HEIGHT + 6,
  };
}

export const CLOSE_WIDTH = BTN_WIDTH;
export const CLOSE_HEIGHT = BTN_HEIGHT;

// ---- world select -------------------------------------------------------

/**
 * The worlds screen: the published servers as a grid of cards, in the same
 * frame as the setup window — same width, so the two read as one family of
 * windows rather than two unrelated dialogs.
 *
 * A card is a banner with the server-list row art bolted under it, which is
 * where its name, its language tag and its hover and selected states come
 * from. Two columns of 193 fit the 426 frame exactly: 18 + 193 + 4 + 193 + 18.
 */
export const WORLD_CARD_WIDTH = MENU_BTN_WIDTH;
/**
 * 16:10 of the card's width, which is the shape these banners are drawn in —
 * the same ratio the setup window crops its own preview to (`BANNER_*`). At the
 * 2:1 this used to be, `object-fit: cover` was quietly taking a fifth off the
 * top and bottom of every published banner, which is where a server tends to
 * put its name.
 */
export const WORLD_CARD_ART_HEIGHT = Math.round(MENU_BTN_WIDTH / 1.6);
export const WORLD_CARD_BAR_HEIGHT = MENU_BTN_HEIGHT;
export const WORLD_CARD_HEIGHT = WORLD_CARD_ART_HEIGHT + WORLD_CARD_BAR_HEIGHT;

export const WORLD_COLS = 2;

/**
 * How many rows of cards the window may hold, and how tall a window that is.
 *
 * The card is 193 wide because that is the row art's own width — `MuSpriteFrame`
 * crops rather than scales, so a narrower card would cut the button's right
 * bevel off. Two columns is therefore fixed, and depth is the only axis density
 * can be had on: three rows where the viewport allows it, two where it does not.
 */
/**
 * One row is a poor grid, but it is what a 500px-tall browser window has room
 * for now that a card is 146 tall. Two rows there would put the window's own
 * buttons off the bottom of the screen, and a picker you cannot press Enter on
 * is worse than a picker that pages twice as often.
 */
export const WORLD_ROWS_MIN = 1;
export const WORLD_ROWS_MAX = 3;

export const WORLD_GRID_X = 18;
export const WORLD_COL_STEP = WORLD_CARD_WIDTH + 4;
export const WORLD_ROW_STEP = WORLD_CARD_HEIGHT + 12;

/** The filter chips and the refresh link, on their own line above the grid. */
export const WORLD_HEAD_Y = SETUP_TOP_HEIGHT + 6;
export const WORLD_HEAD_X = WORLD_GRID_X;
export const WORLD_GRID_TOP = WORLD_HEAD_Y + 22;

/** Everything but the grid, so a row count can be turned into a window height. */
const WORLD_CHROME =
  WORLD_GRID_TOP + 16 + 20 + BTN_HEIGHT + 10 + SETUP_BOTTOM_HEIGHT;

export function worldRowsFor(viewportHeight: number): number {
  const rows = Math.floor((viewportHeight - WORLD_CHROME) / WORLD_ROW_STEP);

  return Math.max(WORLD_ROWS_MIN, Math.min(WORLD_ROWS_MAX, rows));
}

export const WORLD_STATUS_SIZE = 9;

/** Enter, Server Setup, Close: one centred row of three. */
const WORLD_BTN_GAP = 6;
const WORLD_BTN_ROW = BTN_WIDTH * 3 + WORLD_BTN_GAP * 2;

export const WORLD_PLAY_X = Math.floor((SETUP_WIN_WIDTH - WORLD_BTN_ROW) / 2);
export const WORLD_SETUP_X = WORLD_PLAY_X + BTN_WIDTH + WORLD_BTN_GAP;
export const WORLD_BACK_X = WORLD_SETUP_X + BTN_WIDTH + WORLD_BTN_GAP;

/**
 * The window sized to the worlds it actually holds. One world is one row, and
 * a window with a row of empty stone under its only card looks like something
 * failed to load — so the height follows the grid rather than the page size.
 */
export function worldMetrics(rowCount: number) {
  const rows = Math.max(1, Math.min(rowCount, WORLD_ROWS_MAX));
  const gridBottom = WORLD_GRID_TOP + WORLD_ROW_STEP * rows - 12;
  const descY = gridBottom + 12;
  const addressY = descY + 16;
  const buttonsY = addressY + 20;

  return {
    descY,
    addressY,
    buttonsY,
    height: buttonsY + BTN_HEIGHT + 10 + SETUP_BOTTOM_HEIGHT,
  };
}

/**
 * Paging arrows flank the button row rather than sitting up on the title: the
 * top band is already carrying an ornament there, and a 23px arrow drawn over
 * a curl of the frame reads as part of the frame.
 */
export const WORLD_PAGE_PREV_X = WORLD_PLAY_X - PAGE_ARROW.width - 6;
export const WORLD_PAGE_NEXT_X = WORLD_BACK_X + BTN_WIDTH + 6;
