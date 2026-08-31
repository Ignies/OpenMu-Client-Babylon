import type { TextKey } from '../../../../../i18n';
/**
 * Coordinates of the four quest windows, on the 190×429 item frame the
 * originals render into (NewUINPCQuest.cpp, NewUIQuestProgress.cpp,
 * NewUIMyQuestInfoWindow.cpp). Every number is the original's; the sprite
 * sizes were read from the OZT headers in `Data/Interface`.
 */

export const TITLE_Y = 12;
/** The X in the frame art (`CheckMouseIn(x + 169, y + 7, 13, 12)`). */
export const HEAD_CLOSE = { left: 169, top: 7, width: 13, height: 12 };

/** `newui_exit_00.tga`: 36×29, frames up / down. */
export const EXIT_SPRITE = 'newui_exit_00.OZT';
export const EXIT_BUTTON = { x: 13, y: 392, width: 36, height: 29 };
export const EXIT_FRAMES = { up: 0, down: 1 } as const;

/** `newui_btn_empty.tga`: 108×87 = three 29 px frames. */
export const EMPTY_BUTTON_SPRITE = 'newui_btn_empty.OZT';
export const EMPTY_BUTTON = { width: 108, height: 29 };
export const EMPTY_BUTTON_FRAMES = { up: 0, active: 1, down: 2 } as const;

/** `newui_myquest_Line.tga`: 188×21 separator. */
export const LINE_SPRITE = 'newui_myquest_Line.OZT';
export const LINE = { width: 188, height: 21 };
/** `newui_item_money2.tga`: 170×24, the zen box. */
export const MONEY_SPRITE = 'newui_item_money2.OZT';
export const MONEY_BOX = { x: 11, y: 361, width: 170, height: 24 };

// ---- CNewUINPCQuest ---------------------------------------------------------

export const NPC_NAME_Y = 16;
export const NPC_QUEST_TITLE_Y = 29;
/** `yPos = y + 66 + (NUM_LINE_CMB - total) * 18 / 2`, 18 px a line. */
export const NPC_TEXT_TOP = 66;
export const NPC_LINE_STEP = 18;
export const NPC_LINES_MAX = 7;
/** In progress: the item / monster list under a line at 220, answers at 250. */
export const NPC_ITEM_LINE_Y = 220;
export const NPC_ITEM_TEXT_Y = 235;
export const NPC_ANSWERS_ING_Y = 250;
export const NPC_ZEN_LINE_Y = 325;
export const NPC_ZEN_TEXT_Y = 368;

// ---- CNewUIQuestProgress ----------------------------------------------------

export const QP_SUBJECT_Y = 27;
export const QP_NPC_NAME_Y = 51;
export const QP_TEXT_X = 13;
export const QP_NPC_TEXT_Y = 66;
/** `QP_TEXT_GAP`, `QP_NPC_MAX_LINE_PER_PAGE`. */
export const QP_TEXT_GAP = 15;
export const QP_LINES_PER_PAGE = 7;
export const QP_LINE_Y = 181;
export const QP_PLAYER_NAME_Y = 207;
export const QP_PLAYER_TEXT_Y = 222;
export const QP_ANSWERS_Y = 251;
export const QP_ANSWER_WIDTH = 168;
export const QP_LIST_Y = 200;
export const QP_LIST_HEIGHT = 180;
/** `Quest_bt_L/R.tga`: 17×36 = three 12 px frames. */
export const PAGE_BUTTON_L = 'Quest_bt_L.OZT';
export const PAGE_BUTTON_R = 'Quest_bt_R.OZT';
export const PAGE_BUTTON = { width: 17, height: 12 };
export const PAGE_BUTTON_FRAMES = { up: 0, active: 1, down: 2 } as const;
export const PAGE_BUTTON_Y = 170;
export const PAGE_BUTTON_L_X = 20;
export const PAGE_BUTTON_R_X = 153;
export const COMPLETE_BUTTON = { x: 41, y: 392 };

// ---- CNewUIMyQuestInfoWindow ------------------------------------------------

/** `Quest_tab01/02/03.tga`: 166×22 strip, 48×22 small tab, 72×22 wide tab. */
export const TAB_STRIP_SPRITE = 'Quest_tab01.OZT';
export const TAB_SMALL_SPRITE = 'Quest_tab02.OZT';
export const TAB_BIG_SPRITE = 'Quest_tab03.OZT';
export const TAB = { x: 10, y: 27, width: 166, height: 22 };
export const TAB_LABEL_Y = 34;
/**
 * The tabs are sprite-sized, so a translated label has to fit 48 / 72 px.
 * Like the event intro lines, the label shrinks to fit and is cut with an
 * ellipsis past `TAB_LABEL_MIN_FONT_PX`; `TAB_LABEL_ADVANCE` is the average
 * glyph advance of the UI font, in px per px of font size.
 */
export const TAB_LABEL_FONT_PX = 10;
export const TAB_LABEL_MIN_FONT_PX = 7;
export const TAB_LABEL_ADVANCE = 0.52;
/** The 2 px of padding `.quest-tab span` keeps off the sprite's edges. */
export const TAB_LABEL_PADDING = 4;
export const TABS: readonly {
  key: 'quest' | 'jobChange' | 'castleTemple';
  labelKey: TextKey;
  x: number;
  width: number;
}[] = [
  { key: 'quest', labelKey: 'quest.tab.quest', x: 10, width: 48 },
  { key: 'jobChange', labelKey: 'quest.tab.jobChange', x: 57, width: 48 },
  { key: 'castleTemple', labelKey: 'quest.tab.castleTemple', x: 104, width: 72 },
];
export const MQ_LIST_Y = 60;
export const MQ_LIST_HEIGHT = 96;
export const MQ_MESSAGE_Y = 96;
export const MQ_LINE_Y = 160;
export const MQ_SUMMARY_Y = 185;
export const MQ_SUMMARY_HEIGHT = 200;
export const MQ_JOB_TITLE_Y = 58;
export const MQ_JOB_TEXT_Y = 76;
export const MQ_JOB_STATE_Y = 283;
/** `Quest_Bt_open/cast.tga`: 36×58 = two 29 px frames. */
export const OPEN_BUTTON_SPRITE = 'Quest_Bt_open.OZT';
export const GIVEUP_BUTTON_SPRITE = 'Quest_Bt_cast.OZT';
export const OPEN_BUTTON = { x: 50, y: 392, width: 36, height: 29 };
export const GIVEUP_BUTTON = { x: 87, y: 392, width: 36, height: 29 };
export const SMALL_BUTTON_FRAMES = { up: 0, down: 1 } as const;

/** `SetTextColor` values of the originals. */
export const COLOR = {
  title: 'rgb(230,230,230)',
  npcName: 'rgb(150,255,240)',
  questTitle: 'rgb(200,220,255)',
  text: 'rgb(255,230,210)',
  answer: 'rgb(223,191,103)',
  answerHot: 'rgb(255,0,0)',
  subject: 'rgb(36,242,252)',
  s6NpcName: 'rgb(255,255,10)',
  heroName: 'rgb(255,185,10)',
  yellow: 'rgb(255,255,0)',
  done: 'rgb(223,191,103)',
  missing: 'rgb(255,30,30)',
  tabOn: 'rgb(255,255,255)',
  tabOff: 'rgb(181,181,181)',
  zenLabel: 'rgb(255,220,150)',
} as const;

// ---- CNewUINPCDialogue ------------------------------------------------------

/** `RenderText`: the NPC name at 12, the words from 59, `ND_TEXT_GAP` 15, seven a page. */
export const ND_NAME_Y = 12;
export const ND_TEXT_X = 13;
export const ND_NPC_TEXT_Y = 59;
export const ND_TEXT_GAP = 15;
export const ND_NPC_LINES_PER_PAGE = 7;
/** `DivideStringByPixel(…, 160)`: about 30 characters of `g_hFont`. */
export const ND_LINE_CHARS = 30;
/** `IMAGE_ND_LINE` at (1, 181). */
export const ND_LINE_Y = 181;
/** The answer block starts at 203, its text at 207; eleven lines a page. */
export const ND_SEL_BLOCK_Y = 203;
export const ND_SEL_TEXT_Y = 207;
export const ND_SEL_LINES_PER_PAGE = 11;
export const ND_SEL_X = 11;
export const ND_SEL_WIDTH = 168;
/** The NPC-words pager at (131 / 153, 165), the answer pager at (131 / 153, 372). */
export const ND_PAGE_L_X = 131;
export const ND_PAGE_R_X = 153;
export const ND_NPC_PAGE_Y = 165;
export const ND_SEL_PAGE_Y = 372;
/** `Gens_point.tga` at (11, 27) 168×18, the contribution line at 30. */
export const ND_CONTRIBUTE_BOX = { x: 11, y: 27, width: 168, height: 18 };
export const ND_CONTRIBUTE_Y = 30;
