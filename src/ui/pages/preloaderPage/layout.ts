/**
 * The start menu and the server window, in the original's 640×480 units.
 *
 * Two pieces of MU chrome are reused rather than invented: the menu is the
 * login window's own frame (`login_back.OZT`, the one with the MU ONLINE plate
 * and the dragon corners), and the server window is the Option window's frame -
 * a mirrored top and bottom band over a stone fill, which is what MU uses for
 * anything with settings in it.
 *
 * The server window is one frame with four tabs in it (`serverWindow.tsx`), so
 * everything below `CONTENT_TOP` is a tab's own business and everything the
 * `windowRows` helper places is shared by all of them.
 */

export const SPRITE = {
  /** 329×245 window with the MU ONLINE plate - the login window's frame. */
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
 * two entries now - online play and the server fields both live behind
 * Worlds - and two buttons pinned under the plate leave the stone below them
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

// ---- the server window and its tabs -------------------------------------

const ART_WIDTH = 213;

export const SETUP_WIN_WIDTH = ART_WIDTH * 2;

export const SETUP_TOP_HEIGHT = 65;
export const SETUP_BOTTOM_HEIGHT = 43;
export const SETUP_ART_WIDTH = ART_WIDTH;

export const SETUP_TITLE_Y = 12;

/** Enter and Close, and every other button in this window. */
export const BTN_WIDTH = 108;
export const BTN_HEIGHT = 30;

/** The margin both columns of every tab are set in from. */
export const CONTENT_X = 18;
export const CONTENT_WIDTH = SETUP_WIN_WIDTH - CONTENT_X * 2;

/**
 * Two strips, because the window holds two kinds of thing: the worlds you might
 * go to, and the addresses this client dials. The pair sits on the top band
 * itself, over the seam where its two mirrored halves meet - the frame's own
 * ornament curls together there and reads as a join rather than as decoration,
 * so the strip covers it instead of hanging below it.
 *
 * Under Worlds, the second strip: the grid, what the chosen world says about
 * itself, and the accounts kept for it. Three views of one choice, which is why
 * they are tabs of it rather than dialogs that close each other.
 */
export const TAB_STRIP_Y = 33;
export const TAB_HEIGHT = 22;
/** Two wide tabs, centred: the seam they cover is in the middle of the band. */
export const TAB_STRIP_WIDTH = 260;
export const TAB_STRIP_X = Math.round((SETUP_WIN_WIDTH - TAB_STRIP_WIDTH) / 2);

export const SUBTAB_STRIP_Y = SETUP_TOP_HEIGHT + 2;
export const SUBTAB_HEIGHT = 18;

/** Where every tab's own content starts. */
export const CONTENT_TOP = SUBTAB_STRIP_Y + SUBTAB_HEIGHT + 8;

/**
 * The rows the window hangs off its bottom edge: two lines about the chosen
 * world, then the button row. Measured up from the bottom so every tab puts
 * them in the same place whatever its content is worth.
 */
export function windowRows(height: number) {
  const buttonsY = height - SETUP_BOTTOM_HEIGHT - 10 - BTN_HEIGHT;
  const addressY = buttonsY - 20;
  const descY = addressY - 16;

  return { descY, addressY, buttonsY };
}

/** The band `windowRows` claims, from the first shared line to the frame's foot. */
const SHARED_ROWS = 16 + 20 + BTN_HEIGHT + 10 + SETUP_BOTTOM_HEIGHT;

/** Air between the last thing a tab draws and the first shared line under it. */
const CONTENT_GAP = 8;

/**
 * A tab's own content bottom, turned into the window height that fits it. Every
 * tab goes through this, so a tab that grows pushes the shared rows down rather
 * than printing its last line on top of them.
 */
export function heightFor(contentBottom: number): number {
  return contentBottom + CONTENT_GAP + SHARED_ROWS;
}

/** Left column: the saved servers and the buttons that add or remove one. */
export const LIST_X = CONTENT_X;
export const LIST_ROW_WIDTH = MENU_BTN_WIDTH;
export const LIST_ROW_HEIGHT = MENU_BTN_HEIGHT;
export const LIST_TOP = CONTENT_TOP + 16;
/**
 * Six rows, which is a list rather than a shortlist now that the published
 * servers share the column with the saved ones. More than six pages.
 */
export const LIST_MAX = 6;

export const LIST_BUTTONS_Y = LIST_TOP + LIST_ROW_HEIGHT * LIST_MAX + 6;
export const ADD_X = LIST_X;
export const DELETE_X = LIST_X + BTN_WIDTH + 6;

/** Paging arrows, on the list's header line (`server_deco_all.OZT`). */
export const PAGE_ARROW = { width: 23, height: 29 };
export const PAGE_PREV_X = LIST_X + LIST_ROW_WIDTH - PAGE_ARROW.width * 2 - 4;
export const PAGE_NEXT_X = LIST_X + LIST_ROW_WIDTH - PAGE_ARROW.width;
export const PAGE_ARROW_Y = CONTENT_TOP - 8;

/** Right column: the fields of the selected server. */
export const FIELD_X = 246;
export const FIELD_WIDTH = 162;
export const FIELD_HEIGHT = 23;
export const PORT_WIDTH = 70;

/** label, then the plate under it; one field per 40. */
export const FIELD_LABEL_H = 13;
export const FIELD_STEP = 40;
export const FIELD_TOP = CONTENT_TOP;

export const CHECK_SIZE = 16;

/**
 * The rows under the setup tab's two columns, and the height that tab needs.
 * Derived rather than pinned, so moving a row above them does not leave the
 * lines below floating at a constant that no longer holds.
 */
export function setupMetrics() {
  const contentBottom = LIST_BUTTONS_Y + BTN_HEIGHT;

  const checkY = contentBottom + 10;
  const previewY = checkY + 26;
  const noteY = previewY + 16;

  return {
    /** Left, under both columns: the sentence needs the full width. */
    checkX: LIST_X,
    checkY,
    previewY,
    noteY,
    height: heightFor(noteY + 13),
  };
}

// ---- the info tab -------------------------------------------------------

/**
 * What the chosen world says about itself, before anything is dialled: its
 * banner on the left, the facts that decide whether to enter on the right, and
 * underneath, the game servers and channels the published list named for it.
 * The connect server's protocol carries ids and load percentages and no text,
 * so this is the only place those names can come from before logging in.
 */
export const INFO_ART_WIDTH = MENU_BTN_WIDTH;
export const INFO_ART_HEIGHT = Math.round(MENU_BTN_WIDTH / 1.6);

export const INFO_FACTS_X = CONTENT_X + INFO_ART_WIDTH + 4;
export const INFO_FACT_STEP = 16;

/** Rows of game servers the tab draws before it starts saying "and more". */
export const INFO_SERVER_ROWS = 5;
export const INFO_SERVER_STEP = 15;

export function infoMetrics() {
  const factsTop = CONTENT_TOP + 2;
  const descY = CONTENT_TOP + INFO_ART_HEIGHT + 8;
  const serversLabelY = descY + 32;
  const serversTop = serversLabelY + 16;
  const contentBottom = serversTop + INFO_SERVER_STEP * INFO_SERVER_ROWS;

  return {
    factsTop,
    descY,
    serversLabelY,
    serversTop,
    height: heightFor(contentBottom),
  };
}

// ---- the accounts tab ---------------------------------------------------

/**
 * The accounts saved on the chosen world, in the same two columns the setup tab
 * uses for its servers: the rows on the left, the chosen one's fields on the
 * right. A main and a mule on one server is the ordinary case in MU, so this is
 * a list and not a pair of boxes.
 */
export const ACCOUNT_ROWS = 5;

export function accountMetrics() {
  const listTop = CONTENT_TOP + 16;
  const listBottom = listTop + LIST_ROW_HEIGHT * ACCOUNT_ROWS;
  const buttonsY = listBottom + 6;
  const checkY = FIELD_TOP + FIELD_LABEL_H + FIELD_STEP * 2 - 4;
  const noteY = Math.max(buttonsY + BTN_HEIGHT, checkY + 22) + 12;
  const contentBottom = noteY + 13 * 2;

  return {
    listTop,
    buttonsY,
    checkY,
    noteY,
    height: heightFor(contentBottom),
  };
}

// ---- the worlds tab -----------------------------------------------------

/**
 * The worlds tab: the published servers as a grid of cards.
 *
 * A card is a banner with the server-list row art bolted under it, which is
 * where its name, its language tag and its hover and selected states come
 * from. Two columns of 193 fit the 426 frame exactly: 18 + 193 + 4 + 193 + 18.
 */
export const WORLD_CARD_WIDTH = MENU_BTN_WIDTH;
/**
 * 16:10 of the card's width, which is the shape these banners are drawn in -
 * the same ratio the info tab crops its own copy to. At the 2:1 this used to
 * be, `object-fit: cover` was quietly taking a fifth off the top and bottom of
 * every published banner, which is where a server tends to put its name.
 */
export const WORLD_CARD_ART_HEIGHT = Math.round(MENU_BTN_WIDTH / 1.6);
export const WORLD_CARD_BAR_HEIGHT = MENU_BTN_HEIGHT;
export const WORLD_CARD_HEIGHT = WORLD_CARD_ART_HEIGHT + WORLD_CARD_BAR_HEIGHT;

export const WORLD_COLS = 2;

/**
 * How many rows of cards the window may hold, and how tall a window that is.
 *
 * The card is 193 wide because that is the row art's own width - `MuSpriteFrame`
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

export const WORLD_GRID_X = CONTENT_X;
export const WORLD_COL_STEP = WORLD_CARD_WIDTH + 4;
export const WORLD_ROW_STEP = WORLD_CARD_HEIGHT + 12;

/**
 * Two head rows above the grid: the search plate with the refresh link beside
 * it, then the language chips with the count of what survived both.
 *
 * Search is a row of its own rather than a chip on the filter line because it
 * is the filter that scales - a list with more worlds in it than a filter chip
 * per language can express is exactly the list you cannot page through.
 */
export const WORLD_SEARCH_Y = CONTENT_TOP;
export const WORLD_SEARCH_HEIGHT = 21;
export const WORLD_SEARCH_WIDTH = 300;
export const WORLD_HEAD_X = WORLD_GRID_X;
export const WORLD_FILTER_Y = WORLD_SEARCH_Y + WORLD_SEARCH_HEIGHT + 5;
export const WORLD_GRID_TOP = WORLD_FILTER_Y + 22;

/** Everything but the grid, so a row count can be turned into a window height. */
const WORLD_CHROME =
  WORLD_GRID_TOP + 16 + 20 + BTN_HEIGHT + 10 + SETUP_BOTTOM_HEIGHT;

export function worldRowsFor(viewportHeight: number): number {
  const rows = Math.floor((viewportHeight - WORLD_CHROME) / WORLD_ROW_STEP);

  return Math.max(WORLD_ROWS_MIN, Math.min(WORLD_ROWS_MAX, rows));
}

export const WORLD_STATUS_SIZE = 9;

/** Enter and Close: one centred pair, on every tab. */
const WORLD_BTN_GAP = 6;
const WORLD_BTN_ROW = BTN_WIDTH * 2 + WORLD_BTN_GAP;

export const WORLD_PLAY_X = Math.floor((SETUP_WIN_WIDTH - WORLD_BTN_ROW) / 2);
export const WORLD_BACK_X = WORLD_PLAY_X + BTN_WIDTH + WORLD_BTN_GAP;

/**
 * The height the grid alone would like. The window takes the tallest of its
 * tabs rather than this, so the strip does not jump under the cursor that just
 * clicked it - but a grid that fits in one short row still asks for a short
 * window, and on a tall viewport it is the tab that decides.
 */
export function worldHeight(rowCount: number): number {
  const rows = Math.max(1, Math.min(rowCount, WORLD_ROWS_MAX));
  const gridBottom = WORLD_GRID_TOP + WORLD_ROW_STEP * rows - 12;

  return heightFor(gridBottom + 4);
}

/**
 * Paging arrows flank the button row rather than sitting up on the title: the
 * top band is already carrying an ornament there, and a 23px arrow drawn over
 * a curl of the frame reads as part of the frame.
 */
export const WORLD_PAGE_PREV_X = WORLD_PLAY_X - PAGE_ARROW.width - 6;
export const WORLD_PAGE_NEXT_X = WORLD_BACK_X + BTN_WIDTH + 6;
