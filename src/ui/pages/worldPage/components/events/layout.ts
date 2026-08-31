/**
 * The events UI on the original's art and 640×480 coordinates:
 *
 * - `CNewUIEnterBloodCastle` / `CNewUIEnterDevilSquare` (NewUIBloodCastleEnter.cpp,
 *   NewUIEnterDevilSquare.cpp): the 190×429 item-window frame at (640-190, 0),
 *   a bold title at y 12, the intro text, the `newui_btn_empty_big` column of
 *   180×29 enter buttons 33 px apart, `newui_exit_00` at (13, 392) and the
 *   head close at (169, 7).
 * - `CNewUIBloodCastle` / `CNewUIChaosCastleTime` (NewUIBloodCastleTime.cpp,
 *   NewUIChaosCastleTime.cpp): `newui_Figure_blood` 124×81 at (640-127, 480-132),
 *   count line at y 13, "Time Left" at y 38, the big clock at y 50, orange
 *   (255,150,0) turning red (255,32,32) under five minutes.
 * - `CSBaseMatch::RenderTime` (CSEventMatch.cpp): the countdown line centred
 *   at y 480-70 in (128,128,255) on black(128).
 * - `CSBaseMatch::RenderMatchResult`: the 230-wide result box. `CSBaseMatch`
 *   constructs itself at (640-115, 100) but the message box hosting it
 *   (`NewUICustomMessageBox.cpp:2626`, `matchEvent::SetPosition(GetPos())`)
 *   re-centres it, and `CNewBloodCastleSystem::RenderMatchResult` writes at
 *   x = 320 `RT3_WRITE_CENTER` - so the box sits at ((640-230)/2, 100). At
 *   640-115 its right edge ran 115 px past the 640 stage (B13, clipped live).
 */

export const WINDOW = { width: 190, height: 429 };

export const TITLE_Y = 12;
export const TITLE_X = 60;
export const TITLE_WIDTH = 72;

export const HEAD_CLOSE = { left: 169, top: 7, width: 13, height: 12 };

/** `m_EnterUITextPos`: x + 3, 190 wide, centred; y differs per window. */
export const INTRO_X = 3;
export const INTRO_WIDTH = 190;
export const DEVIL_INTRO_Y = 45;
export const DEVIL_INTRO_STEP = 15;
export const BLOOD_INTRO_Y = 55;
export const BLOOD_INTRO_STEP = 20;

/** `SetBtnPos(m_Pos.x + 6, m_Pos.y + 155 / 125)`, `ENTER_BTN_VAL = 33`. */
export const BUTTON_X = 6;
export const DEVIL_BUTTON_Y = 155;
export const BLOOD_BUTTON_Y = 125;
export const BUTTON_STEP = 33;
export const BUTTON = { width: 180, height: 29 };
export const BUTTON_SPRITE = 'newui_btn_empty_big.OZT';
export const BUTTON_FRAMES = { up: 0, active: 1, down: 2 } as const;
/** `m_dwBtnTextColor[ENTERBTN_DISABLE / ENABLE]`. */
export const BUTTON_COLOR_DISABLED = 'rgb(150,150,150)';
export const BUTTON_COLOR_ENABLED = 'rgb(255,255,255)';

export const EXIT_BUTTON = { x: 13, y: 392, width: 36, height: 29 };
export const EXIT_SPRITE = 'newui_exit_00.OZT';

export const TIMER_SPRITE = 'newui_Figure_blood.OZT';
export const TIMER = { x: 640 - 127, y: 480 - 132, width: 124, height: 81 };
export const TIMER_COUNT_Y = 13;
export const TIMER_LABEL_Y = 38;
export const TIMER_CLOCK_Y = 50;
export const TIMER_COLOR = 'rgb(255,150,0)';
export const TIMER_COLOR_IMMINENT = 'rgb(255,32,32)';

export const COUNTDOWN_Y = 480 - 70;
export const COUNTDOWN_COLOR = 'rgb(128,128,255)';
export const COUNTDOWN_BACKGROUND = 'rgba(0,0,0,0.5)';

export const RESULT = { x: (640 - 230) / 2, y: 100, width: 230 };
export const RESULT_TOP = 40;
export const RESULT_LINE = 16;
export const RESULT_HEAD_GAP = 24;
export const RESULT_ROW_GAP = 20;
/** `SetTextColor(0, 255, 0)` headers, `(200, 120, 0)` for the hero's row. */
export const RESULT_HEAD_COLOR = 'rgb(0,255,0)';
export const RESULT_MINE_COLOR = 'rgb(200,120,0)';
/** Column starts, `xPos[2..5]` relative to the box. */
export const RESULT_COLUMNS = [15, 75, 125, 163] as const;

export const EVENT_SPRITES = [BUTTON_SPRITE, EXIT_SPRITE, TIMER_SPRITE];
