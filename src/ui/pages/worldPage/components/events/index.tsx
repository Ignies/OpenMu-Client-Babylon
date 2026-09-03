import './style.less';
import { observer } from 'mobx-react-lite';
import { Store } from '../../../../../store';
import { events } from '../../../../../events';
import {
  bloodCastleImminent,
  bloodCastleScore,
  bloodCastleTimer,
  bloodCastleWindow,
  inBloodCastle,
} from '../../../../../events/bloodCastle';
import {
  devilSquareResult,
  devilSquareWindow,
} from '../../../../../events/devilSquare';
import {
  chaosCastleImminent,
  chaosCastlePrompt,
  chaosCastleResult,
  chaosCastleTimer,
  inChaosCastle,
} from '../../../../../events/chaosCastle';
import { doppelgangerWindow } from '../../../../../events/doppelganger';
import {
  CrywolfState,
  crywolfBarVisible,
  crywolfHud,
  crywolfNoticePage,
  crywolfResult,
} from '../../../../../events/crywolf';
import {
  CRYWOLF_NOTICE_KEYS,
  DEVIL_SQUARE_INTRO_KEYS,
  EVENT_TEXT,
  RANK_HEADERS,
  formatText,
} from '../../../../../events/recipes';
// Aliased: this file already binds `t` to a timer record in two components.
import { t as text } from '../../../../../i18n';
import { MuButton } from '../../../../components/muButton';
import { ItemIcon } from '../../../../components/itemIcon';
import { MuSpriteFrame } from '../../../../components/muSprite';
import { MuItemWindow } from '../../../../components/muWindow';
import { DEFAULT_SCALE } from '../../../../components/muWindow/windowState';
import { MuText } from '../../../../components/muText';
import { useUiStageScale, UI_STAGE_HEIGHT, UI_STAGE_WIDTH } from '../../../../components/uiStage';
import { TEXT_COLOR } from '../../../serversPage/layout';
import {
  BACK_SPRITE as MSG_BACK_SPRITE,
  BTN_BOTH_CANCEL_X,
  BTN_BOTH_OK_X,
  BTN_HEIGHT as MSG_BTN_HEIGHT,
  BTN_SINGLE_X,
  BTN_WIDTH as MSG_BTN_WIDTH,
  BTN_Y as MSG_BTN_Y,
  CANCEL_SPRITE,
  OK_SPRITE,
  TEXT_LINE_HEIGHT as MSG_LINE_HEIGHT,
  TEXT_TOP as MSG_TEXT_TOP,
  WIN_HEIGHT as MSG_HEIGHT,
  WIN_WIDTH as MSG_WIDTH,
} from '../../../../components/msgWindow/layout';
import {
  BLOOD_BUTTON_Y,
  BLOOD_INTRO_STEP,
  BLOOD_INTRO_Y,
  BUTTON,
  CW_ALTARS,
  CW_ALTAR_SIZE,
  CW_BALGASS_BAR,
  CW_BALGASS_ICON,
  CW_BALGASS_TEXT,
  CW_CLOCK,
  CW_CLOCK_COLOR,
  CW_CLOCK_COLOR_BALGASS,
  CW_DARK_ELF_ICON,
  CW_DARK_ELF_TEXT,
  CW_ICON_SIZE,
  CW_MAIN,
  CW_NOTICE,
  CW_NOTICE_BACKGROUND,
  CW_NOTICE_COLOR,
  CW_NOTICE_HEAD_COLOR,
  CW_RESULT,
  CW_SPRITES,
  CW_STATUE_BAR,
  CW_TEXT_COLOR,
  CW_TIME_PANEL,
  BUTTON_COLOR_DISABLED,
  BUTTON_COLOR_ENABLED,
  BUTTON_FRAMES,
  BUTTON_SPRITE,
  BUTTON_STEP,
  BUTTON_X,
  COUNTDOWN_BACKGROUND,
  COUNTDOWN_COLOR,
  COUNTDOWN_Y,
  DEVIL_BUTTON_Y,
  DEVIL_INTRO_STEP,
  DEVIL_INTRO_Y,
  DG_BUTTON,
  DG_BUTTON_SPRITE,
  DG_BUTTON_X,
  DG_CLOSE_Y,
  DG_ENTER_Y,
  DG_ENTRY_TIME_Y,
  DG_INTRO_STEP,
  DG_INTRO_Y,
  DG_ITEM,
  DG_LINE,
  DG_LINE_SPRITE,
  DG_LINE_Y,
  DG_MIRROR_Y,
  DG_TIME_Y,
  EXIT_BUTTON,
  EXIT_SPRITE,
  HEAD_CLOSE,
  INTRO_WIDTH,
  INTRO_X,
  RESULT,
  RESULT_COLUMNS,
  RESULT_HEAD_COLOR,
  RESULT_HEAD_GAP,
  RESULT_LINE,
  RESULT_MINE_COLOR,
  RESULT_ROW_GAP,
  RESULT_TOP,
  TIMER,
  TIMER_CLOCK_Y,
  TIMER_COLOR,
  TIMER_COLOR_IMMINENT,
  TIMER_COUNT_Y,
  TIMER_LABEL_Y,
  TIMER_SPRITE,
  TITLE_WIDTH,
  TITLE_X,
  TITLE_Y,
} from './layout';

/**
 * Everything the events layer draws : the NPC
 * entry windows, the Chaos Castle prompt, the match timer on the event
 * maps, the 30 s countdown line and the result boxes. This folder only
 * reads the entry files and calls `events.*` commands; it owns no state.
 */

/** `SeparateTextIntoLines(GlobalText[832], …, MAX_LENGTH_CMB)`: wrap at ~30 chars. */
const BLOOD_INTRO_CHARS = 30;

/** The intro font at the window's 640-stage size. */
const INTRO_FONT_PX = 11;
/** Smallest the intro font shrinks to before a line is cut with an ellipsis. */
const INTRO_FONT_MIN_PX = 8;
/** Average glyph advance of the UI font, in px per px of font size. */
const INTRO_GLYPH_ADVANCE = 0.52;

/**
 * The original draws every intro line on its own fixed 15 / 20 px row and
 * lets a long line spill past the frame. Here a row is the same fixed
 * height - a wrapped line never grew the row, so it drew over the next one -
 * and a line wider than the 190 px frame shrinks its font to fit, down to
 * `INTRO_FONT_MIN_PX`; past that the CSS ellipsis cuts it.
 */
function introFontSize(line: string): number {
  const fits = INTRO_WIDTH / (line.length * INTRO_GLYPH_ADVANCE);
  return Math.max(INTRO_FONT_MIN_PX, Math.min(INTRO_FONT_PX, Math.floor(fits)));
}

function wrapLines(text: string, max: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > max && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** `L" %.2d:%.2d:%.2d"` minus the wall-clock seconds the original appends. */
function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/** Places a 640×480-stage rectangle on the window, scaled like the sheets. */
function useStage() {
  const scale = useUiStageScale();
  const offsetX = (window.innerWidth - UI_STAGE_WIDTH * scale) / 2;
  const offsetY = (window.innerHeight - UI_STAGE_HEIGHT * scale) / 2;
  return {
    scale,
    at: (x: number, y: number) => ({
      left: offsetX + x * scale,
      top: offsetY + y * scale,
      transform: `scale(${scale})`,
    }),
  };
}

// ---- entry windows ---------------------------------------------------------

type EntryWindowProps = {
  id: string;
  title: string;
  intro: string[];
  introY: number;
  introStep: number;
  buttonY: number;
  buttons: { label: string; enabled: boolean }[];
  onEnter: (grade: number) => void;
  onClose: () => void;
};

/** `CNewUIEnterBloodCastle::Render` / `CNewUIEnterDevilSquare::Render`. */
const EntryWindow = ({
  id,
  title,
  intro,
  introY,
  introStep,
  buttonY,
  buttons,
  onEnter,
  onClose,
}: EntryWindowProps) => {
  return (
    <MuItemWindow id={id} className="event-window" label={title} onClose={onClose}>
      <div
        className="event-title"
        style={{ left: TITLE_X, top: TITLE_Y, width: TITLE_WIDTH }}
      >
        {title}
      </div>
      <div className="head-close" data-no-drag="true" style={HEAD_CLOSE} onClick={onClose} />

      {intro.map((line, i) => (
        <div
          key={i}
          className="event-intro"
          style={{
            left: INTRO_X,
            top: introY + i * introStep,
            width: INTRO_WIDTH,
            height: introStep,
            lineHeight: `${introStep}px`,
            fontSize: introFontSize(line),
          }}
          title={line}
        >
          {line}
        </div>
      ))}

      {buttons.map((button, i) => (
        <div
          key={i}
          className="event-button"
          data-no-drag="true"
          style={{ left: BUTTON_X, top: buttonY + i * BUTTON_STEP }}
        >
          <MuButton
            file={BUTTON_SPRITE}
            width={BUTTON.width}
            height={BUTTON.height}
            frames={BUTTON_FRAMES}
            label={button.label}
            color={button.enabled ? BUTTON_COLOR_ENABLED : BUTTON_COLOR_DISABLED}
            activeColor={BUTTON_COLOR_ENABLED}
            disabled={!button.enabled}
            onClick={() => onEnter(i)}
            labelStyle={{ fontWeight: 'bold', fontSize: 11 }}
          />
        </div>
      ))}

      <div
        className="event-button"
        data-no-drag="true"
        style={{ left: EXIT_BUTTON.x, top: EXIT_BUTTON.y }}
        title={EVENT_TEXT.close}
      >
        <MuButton
          file={EXIT_SPRITE}
          width={EXIT_BUTTON.width}
          height={EXIT_BUTTON.height}
          frames={{ up: 0, active: 1, down: 2 }}
          onClick={onClose}
        />
      </div>
    </MuItemWindow>
  );
};

const BloodCastleWindow = observer(() => {
  const w = bloodCastleWindow();
  if (!w.open) return null;
  return (
    <EntryWindow
      id="blood-castle-enter"
      title={EVENT_TEXT.archangelMessenger}
      intro={wrapLines(EVENT_TEXT.bloodCastleIntro, BLOOD_INTRO_CHARS)}
      introY={BLOOD_INTRO_Y}
      introStep={BLOOD_INTRO_STEP}
      buttonY={BLOOD_BUTTON_Y}
      buttons={w.buttons}
      onEnter={grade => events.enterBloodCastle(grade)}
      onClose={() => events.closeAll()}
    />
  );
});

const DevilSquareWindow = observer(() => {
  const w = devilSquareWindow();
  if (!w.open) return null;
  return (
    <EntryWindow
      id="devil-square-enter"
      title={EVENT_TEXT.devilSquare}
      intro={DEVIL_SQUARE_INTRO_KEYS.map(key => text(key))}
      introY={DEVIL_INTRO_Y}
      introStep={DEVIL_INTRO_STEP}
      buttonY={DEVIL_BUTTON_Y}
      buttons={w.buttons}
      onEnter={grade => events.enterDevilSquare(grade)}
      onClose={() => events.closeAll()}
    />
  );
});

// ---- Doppelganger window ---------------------------------------------------

/** The Mirror of Dimensions the window renders (`RenderItem3D`, 14 * 512 + 111). */
const DG_MIRROR_ITEM = { group: 14, num: 111 };

/** The wrap widths of `CutStr(GlobalText[2757 / 2758], .., 140 / 100, 2, ..)`. */
const DG_INTRO1_CHARS = 26;
const DG_INTRO2_CHARS = 20;

/** Each intro sentence keeps its two fixed 15 px rows even when it fits one. */
function dgIntroRows(): string[] {
  const first = wrapLines(EVENT_TEXT.dgIntro1, DG_INTRO1_CHARS);
  const second = wrapLines(EVENT_TEXT.dgIntro2, DG_INTRO2_CHARS);
  while (first.length < 2) first.push('');
  while (second.length < 2) second.push('');
  return [...first.slice(0, 2), ...second.slice(0, 2), EVENT_TEXT.dgIntro3];
}

/** `CNewUIDoppelGangerWindow::Render`: Lugard's gate window. */
const DoppelgangerWindow = observer(() => {
  const w = doppelgangerWindow();
  if (!w.open) return null;

  const locked = w.remainMinutes !== 0;
  const timeLine = locked
    ? formatText(EVENT_TEXT.dgEnterAfter, w.remainMinutes)
    : EVENT_TEXT.dgEnterNow;

  const button = (label: string, top: number, disabled: boolean, onClick: () => void) => (
    <div className="event-button" data-no-drag="true" style={{ left: DG_BUTTON_X, top }}>
      <MuButton
        file={DG_BUTTON_SPRITE}
        width={DG_BUTTON.width}
        height={DG_BUTTON.height}
        frames={{ up: 0, active: 1, down: 2 }}
        label={label}
        color={disabled ? BUTTON_COLOR_DISABLED : BUTTON_COLOR_ENABLED}
        activeColor={BUTTON_COLOR_ENABLED}
        disabled={disabled}
        onClick={onClick}
        labelStyle={{ fontWeight: 'bold', fontSize: 11 }}
      />
    </div>
  );

  return (
    <MuItemWindow
      id="doppelganger-enter"
      className="event-window"
      label={EVENT_TEXT.lugard}
      onClose={() => events.closeAll()}
    >
      <div
        className="event-title"
        style={{ left: TITLE_X, top: TITLE_Y, width: TITLE_WIDTH }}
      >
        {EVENT_TEXT.lugard}
      </div>
      <div
        className="head-close"
        data-no-drag="true"
        style={HEAD_CLOSE}
        onClick={() => events.closeAll()}
      />

      {dgIntroRows().map((line, i) => (
        <div
          key={i}
          className="event-intro"
          style={{
            left: INTRO_X,
            top: DG_INTRO_Y + i * DG_INTRO_STEP,
            width: INTRO_WIDTH,
            height: DG_INTRO_STEP,
            lineHeight: `${DG_INTRO_STEP}px`,
            fontSize: introFontSize(line),
          }}
          title={line}
        >
          {line}
        </div>
      ))}

      <div
        className="event-dg-item"
        style={{ left: DG_ITEM.x, top: DG_ITEM.y, width: DG_ITEM.size, height: DG_ITEM.size }}
      >
        <ItemIcon item={DG_MIRROR_ITEM} />
      </div>
      <div
        className="event-intro event-dg-bold"
        style={{ left: INTRO_X, top: DG_MIRROR_Y, width: INTRO_WIDTH }}
      >
        {EVENT_TEXT.dgMirror}
      </div>

      {button(EVENT_TEXT.enter, DG_ENTER_Y, locked, () => events.enterDoppelganger())}

      <MuSpriteFrame
        file={DG_LINE_SPRITE}
        width={DG_LINE.width}
        height={DG_LINE.height}
        style={{ position: 'absolute', left: 1, top: DG_LINE_Y }}
      />

      <div
        className="event-intro"
        style={{ left: INTRO_X, top: DG_ENTRY_TIME_Y, width: INTRO_WIDTH }}
      >
        {EVENT_TEXT.dgEntryTime}
      </div>
      <div
        className="event-intro"
        style={{ left: INTRO_X, top: DG_TIME_Y, width: INTRO_WIDTH }}
      >
        {timeLine}
      </div>

      {button(EVENT_TEXT.close, DG_CLOSE_Y, false, () => events.closeAll())}
    </MuItemWindow>
  );
});

// ---- Chaos Castle prompt ---------------------------------------------------

/** `CChaosCastleTimeCheckMsgBoxLayout`: one or two lines, OK (+ Cancel). */
const ChaosCastlePrompt = observer(() => {
  const prompt = chaosCastlePrompt();
  if (!prompt) return null;

  const okX = prompt.canEnter ? BTN_BOTH_OK_X : BTN_SINGLE_X;

  return (
    <div className="msg-window-layer">
      <MuSpriteFrame
        file={MSG_BACK_SPRITE}
        width={MSG_WIDTH}
        height={MSG_HEIGHT}
        className="msg-window event-prompt"
      >
        {prompt.lines.map((line, i) => (
          <div
            key={i}
            className="event-prompt-line"
            style={{ top: MSG_TEXT_TOP + i * MSG_LINE_HEIGHT }}
          >
            {line}
          </div>
        ))}
        <MuButton
          file={OK_SPRITE}
          width={MSG_BTN_WIDTH}
          height={MSG_BTN_HEIGHT}
          frames={{ up: 0, active: 1, down: 2 }}
          color={TEXT_COLOR.brightGray}
          activeColor={TEXT_COLOR.white}
          onClick={() => (prompt.canEnter ? events.enterChaosCastle() : events.closeAll())}
          style={{ position: 'absolute', left: okX, top: MSG_BTN_Y }}
        />
        {prompt.canEnter && (
          <MuButton
            file={CANCEL_SPRITE}
            width={MSG_BTN_WIDTH}
            height={MSG_BTN_HEIGHT}
            frames={{ up: 0, active: 1, down: 2 }}
            color={TEXT_COLOR.brightGray}
            activeColor={TEXT_COLOR.white}
            onClick={() => events.closeAll()}
            style={{ position: 'absolute', left: BTN_BOTH_CANCEL_X, top: MSG_BTN_Y }}
          />
        )}
      </MuSpriteFrame>
    </div>
  );
});

// ---- timer HUD -------------------------------------------------------------

const TimerFigure = ({
  countLine,
  seconds,
  imminent,
  at,
}: {
  countLine: string | null;
  seconds: number;
  imminent: boolean;
  at: React.CSSProperties;
}) => (
  <MuSpriteFrame
    file={TIMER_SPRITE}
    width={TIMER.width}
    height={TIMER.height}
    className="event-timer"
    style={at}
  >
    {countLine && (
      <MuText
        className="event-timer-line"
        text={countLine}
        color={TIMER_COLOR}
        style={{ top: TIMER_COUNT_Y }}
      />
    )}
    <MuText
      className="event-timer-line"
      text={EVENT_TEXT.timeLeft}
      color={TIMER_COLOR}
      style={{ top: TIMER_LABEL_Y }}
    />
    <MuText
      className="event-timer-line"
      face="big"
      text={clock(seconds)}
      color={imminent ? TIMER_COLOR_IMMINENT : TIMER_COLOR}
      style={{ top: TIMER_CLOCK_Y }}
    />
  </MuSpriteFrame>
);

/** `RenderMatchTimes` of both castle systems: the figure while a match runs. */
const EventTimer = observer(() => {
  // Subscribe to the observable timers *before* the map check: `mapIndex` is
  // a plain field of `World` (only `Store.world` itself is observable), so a
  // render that returned on it alone was never re-run when a match started
  // on the castle map (B11 - the figure never mounted live).
  const bc = bloodCastleTimer();
  const cc = chaosCastleTimer();
  const map = Store.world?.mapIndex;
  const stage = useStage();
  if (map === undefined) return null;

  const at = stage.at(TIMER.x, TIMER.y);

  if (inBloodCastle(map)) {
    const t = bc;
    if (!t.running || t.seconds <= 0) return null;
    const countLine =
      t.maxKill === 65535
        ? null
        : formatText(
            t.gateDestroyed ? EVENT_TEXT.skeletonCount : EVENT_TEXT.monsterCount,
            t.killed,
            t.maxKill
          );
    return (
      <TimerFigure
        countLine={countLine}
        seconds={t.seconds}
        imminent={bloodCastleImminent()}
        at={at}
      />
    );
  }

  if (inChaosCastle(map)) {
    const t = cc;
    if (!t.running || t.seconds <= 0) return null;
    const countLine =
      t.maxAlive === 65535
        ? null
        : formatText(EVENT_TEXT.characterCount, t.alive, t.maxAlive);
    return (
      <TimerFigure
        countLine={countLine}
        seconds={t.seconds}
        imminent={chaosCastleImminent()}
        at={at}
      />
    );
  }

  return null;
});

// ---- countdown line --------------------------------------------------------

/** `CSBaseMatch::RenderTime`: centred at y 410 for the 30 s before a state change. */
const EventCountdown = observer(() => {
  const line = events.countdownLine;
  if (!line) return null;
  return (
    <div
      className="event-countdown"
      style={{ top: `${(COUNTDOWN_Y / UI_STAGE_HEIGHT) * 100}%` }}
    >
      <MuText
        text={line}
        color={COUNTDOWN_COLOR}
        background={COUNTDOWN_BACKGROUND}
        style={{ transform: `scale(${DEFAULT_SCALE})`, transformOrigin: 'center top' }}
      />
    </div>
  );
});

// ---- result boxes ----------------------------------------------------------

/** `CNewBloodCastleSystem::RenderMatchResult`: the six lines of the quest outcome. */
const BloodCastleResult = observer(() => {
  const score = bloodCastleScore();
  const stage = useStage();
  if (!score) return null;

  // OpenMU ends a Chaos Castle with this same packet (B16): word it for the map.
  const cc = Store.world !== null && inChaosCastle(Store.world.mapIndex);
  const lines: string[] = score.success
    ? [EVENT_TEXT.bcCongrats, cc ? EVENT_TEXT.ccQuestDone : EVENT_TEXT.bcQuestDone]
    : [EVENT_TEXT.bcUnfortunately, cc ? EVENT_TEXT.ccQuestFailed : EVENT_TEXT.bcQuestFailed];
  lines.push(
    formatText(EVENT_TEXT.rewardedExp, score.exp),
    formatText(EVENT_TEXT.rewardedZen, score.zen),
    formatText(cc ? EVENT_TEXT.chaosCastlePoint : EVENT_TEXT.bloodCastlePoint, score.score)
  );

  return (
    <div
      className="event-result"
      style={{ ...stage.at(RESULT.x, RESULT.y), width: RESULT.width, textAlign: 'center' }}
    >
      {lines.map((line, i) => (
        <div key={i} className="event-result-line" style={{ height: RESULT_LINE }}>
          {line}
        </div>
      ))}
    </div>
  );
});

/** `CSDevilSquareMatch::RenderMatchResult`: the rank table both squares share. */
const RankTable = observer(
  ({
    result,
    at,
  }: {
    result: { myRank: number; rows: { name: string; score: number; exp: number; zen: number }[] };
    at: React.CSSProperties;
  }) => {
    const heads = RANK_HEADERS;
    const cell = (i: number, text: string | number) => (
      <span key={i} className="event-result-cell" style={{ left: RESULT_COLUMNS[i] }}>
        {text}
      </span>
    );
    return (
      <div className="event-result" style={{ ...at, width: RESULT.width, paddingTop: RESULT_TOP }}>
        <div className="event-result-line">{cell(0, EVENT_TEXT.congratulations)}</div>
        <div className="event-result-line">
          {cell(0, formatText(EVENT_TEXT.braveryProven, Store.playerData.name))}
        </div>
        <div className="event-result-line" style={{ height: RESULT_HEAD_GAP }} />
        <div className="event-result-line" style={{ color: RESULT_HEAD_COLOR }}>
          {cell(0, heads.rank)}
          {cell(1, heads.point)}
          {cell(2, heads.exp)}
          {cell(3, heads.reward)}
        </div>
        <div className="event-result-line" style={{ height: RESULT_ROW_GAP - RESULT_LINE }} />
        {result.rows.map((row, i) => (
          <div
            key={i}
            className="event-result-line"
            style={{ color: i === result.myRank - 1 ? RESULT_MINE_COLOR : undefined }}
          >
            {cell(0, `${i + 1}. ${row.name}`)}
            {cell(1, row.score)}
            {cell(2, row.exp)}
            {cell(3, row.zen)}
          </div>
        ))}
      </div>
    );
  }
);

const EventRankTable = observer(() => {
  const stage = useStage();
  const result = devilSquareResult() ?? chaosCastleResult();
  if (!result) return null;
  return <RankTable result={result} at={stage.at(RESULT.x, RESULT.y)} />;
});

// ---- Crywolf interface bar -------------------------------------------------

/** Which number sheet an altar's packed state byte gets, or null for none. */
function altarSprite(packed: number): string | null {
  const contracted = (packed & 0xf0) >> 4 === 1;
  const grade = packed & 0x0f;
  if (contracted) {
    return CW_SPRITES.numberContracted[grade === 1 ? 0 : grade === 2 ? 1 : 2];
  }
  if (grade === 1) return CW_SPRITES.number[0];
  if (grade === 2) return CW_SPRITES.number[1];
  return null;
}

/**
 * `CNewUICryWolf::Render`: the MVP bar in the lower right (statue shield,
 * the five altars, dark elf count, remaining time, Balgass strip), the READY
 * notices and the end-of-war banner. No window state: everything reads
 * `events/crywolf.ts`.
 */
const CrywolfBar = observer(() => {
  const hud = crywolfHud();
  const result = crywolfResult();
  const page = crywolfNoticePage();
  const map = Store.world?.mapIndex;
  const stage = useStage();
  if (map === undefined || !crywolfBarVisible(map)) return null;

  const statueDamage = Math.min(100, Math.max(0, 100 - hud.statueHp));
  const statueOffset = Math.round((CW_STATUE_BAR.width * statueDamage) / 100);
  const balgassUp = hud.balgassHp > 0;
  const balgassWidth = Math.round(
    (CW_BALGASS_BAR.width * Math.min(100, hud.balgassHp)) / 100
  );
  const notices =
    hud.state === CrywolfState.Ready ? CRYWOLF_NOTICE_KEYS[page] ?? [] : [];

  return (
    <div className="crywolf-bar" style={stage.at(0, 0)}>
      <MuSpriteFrame
        file={CW_SPRITES.main}
        width={CW_MAIN.width}
        height={CW_MAIN.height}
        style={{ position: 'absolute', left: CW_MAIN.x, top: CW_MAIN.y }}
      />

      {/* The statue shield, eroding from the left as it takes damage. */}
      {statueOffset < CW_STATUE_BAR.width && (
        <MuSpriteFrame
          file={CW_SPRITES.statueBar}
          x={statueOffset}
          width={CW_STATUE_BAR.width - statueOffset}
          height={CW_STATUE_BAR.height}
          style={{
            position: 'absolute',
            left: CW_STATUE_BAR.x + statueOffset,
            top: CW_STATUE_BAR.y,
          }}
        />
      )}

      {CW_ALTARS.map((slot, i) => {
        const file = altarSprite(hud.altars[i] ?? 0);
        if (!file) return null;
        return (
          <MuSpriteFrame
            key={i}
            file={file}
            width={CW_ALTAR_SIZE}
            height={CW_ALTAR_SIZE}
            style={{ position: 'absolute', left: slot.x, top: slot.y }}
          />
        );
      })}

      <MuSpriteFrame
        file={hud.darkElves > 0 ? CW_SPRITES.darkElf : CW_SPRITES.darkElfEmpty}
        width={CW_ICON_SIZE}
        height={CW_ICON_SIZE}
        style={{ position: 'absolute', left: CW_DARK_ELF_ICON.x, top: CW_DARK_ELF_ICON.y }}
      />
      <div
        className="crywolf-line"
        style={{ ...CW_DARK_ELF_TEXT, color: CW_TEXT_COLOR }}
      >
        {formatText(EVENT_TEXT.cwDarkElves, hud.darkElves)}
      </div>

      {balgassUp && (
        <>
          <MuSpriteFrame
            file={CW_SPRITES.balgass}
            width={CW_ICON_SIZE}
            height={CW_ICON_SIZE}
            style={{ position: 'absolute', left: CW_BALGASS_ICON.x, top: CW_BALGASS_ICON.y }}
          />
          <div
            className="crywolf-line"
            style={{ ...CW_BALGASS_TEXT, color: CW_TEXT_COLOR }}
          >
            {EVENT_TEXT.cwBalgass}
          </div>
          <MuSpriteFrame
            file={CW_SPRITES.balgassBar}
            width={balgassWidth}
            height={CW_BALGASS_BAR.height}
            style={{ position: 'absolute', left: CW_BALGASS_BAR.x, top: CW_BALGASS_BAR.y }}
          />
        </>
      )}

      <MuSpriteFrame
        file={CW_SPRITES.timePanel}
        width={CW_TIME_PANEL.width}
        height={CW_TIME_PANEL.height}
        style={{ position: 'absolute', left: CW_TIME_PANEL.x, top: CW_TIME_PANEL.y }}
      />
      <MuText
        className="crywolf-clock"
        face="big"
        text={clock(hud.state === CrywolfState.Started ? hud.seconds : 0)}
        color={balgassUp ? CW_CLOCK_COLOR_BALGASS : CW_CLOCK_COLOR}
        style={{ left: CW_CLOCK.x, top: CW_CLOCK.y, width: CW_CLOCK.width }}
      />

      {notices.map((key, i) => (
        <div
          key={key}
          className="crywolf-line"
          style={{
            left: CW_NOTICE.x,
            top: CW_NOTICE.y + i * CW_NOTICE.step,
            color: i === 0 ? CW_NOTICE_HEAD_COLOR : CW_NOTICE_COLOR,
            background: CW_NOTICE_BACKGROUND,
            textAlign: 'left',
          }}
        >
          {formatText(text(key))}
        </div>
      ))}

      {result !== null && (
        <MuSpriteFrame
          file={result ? CW_SPRITES.success : CW_SPRITES.failure}
          width={CW_RESULT.width}
          height={CW_RESULT.height}
          style={{ position: 'absolute', left: CW_RESULT.x, top: CW_RESULT.y }}
        />
      )}
    </div>
  );
});

// ---- the one line the world page mounts -----------------------------------

export const EventWindows = observer(() => (
  <>
    <BloodCastleWindow />
    <DevilSquareWindow />
    <DoppelgangerWindow />
    <ChaosCastlePrompt />
    <EventTimer />
    <CrywolfBar />
    <EventCountdown />
    <BloodCastleResult />
    <EventRankTable />
  </>
));
