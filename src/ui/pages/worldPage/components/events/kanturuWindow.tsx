import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import {
  closeKanturu,
  enterKanturu,
  kanturuDialog,
  kanturuHud,
  kanturuResult,
  refreshKanturu,
} from '../../../../../events/kanturu';
import { EVENT_TEXT, formatText } from '../../../../../events/recipes';
import { MsgBoxFrame } from '../../../../components/msgBoxFrame';
import { MuButton } from '../../../../components/muButton';
import { MuNumber } from '../../../../components/muNumber';
import { MuSpriteFrame } from '../../../../components/muSprite';
import {
  useUiStageScale,
  UI_STAGE_HEIGHT,
  UI_STAGE_WIDTH,
} from '../../../../components/uiStage';
import {
  DG_BUTTON_SPRITE,
  KT_BODY_COLOR,
  KT_BODY_COLOR_REST,
  KT_BODY_GAP,
  KT_BUTTON,
  KT_BUTTON_DISABLED,
  KT_BUTTON_X,
  KT_BUTTON_Y,
  KT_CLOCK,
  KT_CLOCK_BLINK_MS,
  KT_FIGURE,
  KT_FIGURE_COLOR,
  KT_FIGURE_MONSTER_Y,
  KT_FIGURE_SPRITE,
  KT_FIGURE_TEXT_X,
  KT_FIGURE_USER_Y,
  KT_LINE_HEIGHT,
  KT_MIDDLE_LINES,
  KT_PARAGRAPH_GAP,
  KT_RESULT,
  KT_RESULT_SPRITES,
  KT_SUBJECT_COLOR,
  KT_SUBJECT_Y,
  KT_WINDOW,
} from './layout';

/**
 * The Kanturu Refinery Tower windows: the Gateway Machine's entry dialog
 * (`CNewUIKanturu2ndEnterNpc`), the in-event figure
 * (`CNewUIKanturuInfoWindow`) and the win / lose banner
 * (`M39Kanturu3rd::Kanturu3rdSuccess` / `Kanturu3rdFailed`).
 */

/** Places a 640x480-stage rectangle on the window, scaled like the sheets. */
function useStage() {
  const scale = useUiStageScale();
  const offsetX = (window.innerWidth - UI_STAGE_WIDTH * scale) / 2;
  const offsetY = (window.innerHeight - UI_STAGE_HEIGHT * scale) / 2;
  return (x: number, y: number) => ({
    left: offsetX + x * scale,
    top: offsetY + y * scale,
    transform: `scale(${scale})`,
  });
}

/**
 * `RenderTexts`: the subject in 12 px rows from y 30, the body 20 px under it
 * and 15 px between paragraphs. The original measures each string with
 * `SeparateTextIntoLines` and advances by the rows it actually took, so the
 * block flows here rather than pinning every paragraph to a computed y - at
 * this width the long sentences wrap to three and four rows, and a fixed
 * step drew them on top of each other.
 */
const DialogText = ({ subject, lines }: { subject: string; lines: readonly string[] }) => (
  <div className="kanturu-text" style={{ top: KT_SUBJECT_Y, lineHeight: `${KT_LINE_HEIGHT}px` }}>
    <div className="kanturu-subject" style={{ color: KT_SUBJECT_COLOR }}>
      {subject}
    </div>
    {lines.map((line, i) => (
      <div
        key={i}
        className="kanturu-line"
        style={{
          color: i === 0 ? KT_BODY_COLOR : KT_BODY_COLOR_REST,
          marginTop: i === 0 ? KT_BODY_GAP : KT_PARAGRAPH_GAP,
        }}
      >
        {line}
      </div>
    ))}
  </div>
);

export const KanturuWindow = observer(() => {
  const dialog = kanturuDialog();
  const at = useStage();

  if (!dialog.open) return null;

  const buttons = [
    { label: EVENT_TEXT.ktRefresh, enabled: true, onClick: refreshKanturu },
    { label: EVENT_TEXT.ktEnter, enabled: dialog.canEnter, onClick: enterKanturu },
    { label: EVENT_TEXT.close, enabled: true, onClick: () => closeKanturu() },
  ];

  return (
    <MsgBoxFrame
      lines={KT_MIDDLE_LINES}
      className="kanturu-window"
      style={at(KT_WINDOW.x, KT_WINDOW.y)}
    >
      <DialogText subject={dialog.subject} lines={dialog.lines} />

      {buttons.map((button, i) => (
        <MuButton
          key={i}
          file={DG_BUTTON_SPRITE}
          width={KT_BUTTON.width}
          height={KT_BUTTON.height}
          frames={{ up: 0, active: 1, down: 2 }}
          label={button.label}
          color={button.enabled ? '#ffffff' : KT_BUTTON_DISABLED}
          activeColor="#ffffff"
          disabled={!button.enabled}
          onClick={button.onClick}
          style={{ position: 'absolute', left: KT_BUTTON_X[i], top: KT_BUTTON_Y }}
        />
      ))}
    </MsgBoxFrame>
  );
});

/** `CNewUIKanturuInfoWindow::RenderInfo`: the counts and the phase clock. */
export const KanturuFigure = observer(() => {
  const hud = kanturuHud();
  const at = useStage();
  const [colon, setColon] = useState(true);

  useEffect(() => {
    if (!hud.open) return;
    const id = setInterval(() => setColon(on => !on), KT_CLOCK_BLINK_MS);
    return () => clearInterval(id);
  }, [hud.open]);

  if (!hud.open) return null;

  // The original divides the remainder by `60 * minutes`, which reads wrong
  // the moment the minutes are not 1; the clock is a clock here.
  const minutes = Math.floor(hud.seconds / 60);
  const seconds = hud.seconds % 60;

  return (
    <div className="kanturu-figure" style={at(KT_FIGURE.x, KT_FIGURE.y)}>
      <MuSpriteFrame
        file={KT_FIGURE_SPRITE}
        width={KT_FIGURE.width}
        height={KT_FIGURE.height}
        style={{ position: 'absolute', left: 0, top: 0 }}
      />
      <div
        className="kanturu-figure-line"
        style={{ left: KT_FIGURE_TEXT_X, top: KT_FIGURE_USER_Y, color: KT_FIGURE_COLOR }}
      >
        {formatText(EVENT_TEXT.ktCharacterCount, hud.userCount)}
      </div>
      <div
        className="kanturu-figure-line"
        style={{ left: KT_FIGURE_TEXT_X, top: KT_FIGURE_MONSTER_Y, color: KT_FIGURE_COLOR }}
      >
        {hud.boss
          ? EVENT_TEXT.ktMonsterBoss
          : formatText(EVENT_TEXT.ktMonsterCount, hud.monsterCount)}
      </div>
      <MuNumber value={minutes} x={KT_CLOCK.minuteX} y={KT_CLOCK.y} />
      <MuNumber value={seconds} minDigits={2} x={KT_CLOCK.secondX} y={KT_CLOCK.y} />
      {colon && (
        <div
          className="kanturu-figure-line"
          style={{ left: KT_CLOCK.colonX, top: KT_CLOCK.colonY, color: '#ffffff' }}
        >
          :
        </div>
      )}
    </div>
  );
});

/** The 372x99 banner, fading in and holding for five seconds. */
export const KanturuResult = observer(() => {
  const result = kanturuResult();
  const at = useStage();

  if (!result) return null;

  return (
    <MuSpriteFrame
      file={KT_RESULT_SPRITES[result.won ? 1 : 0]}
      width={KT_RESULT.width}
      height={KT_RESULT.height}
      className="kanturu-result"
      style={{ ...at(KT_RESULT.x, KT_RESULT.y), opacity: result.alpha }}
    />
  );
});
