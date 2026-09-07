import './style.less';
import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { t, type TextKey } from '../../../../../i18n';
import { Commands } from '../../../../../commands';
import { GameOptions, uiScaleFactor } from '../../../../../common/gameOptions';
import type { CommandKind } from '../../../../../common/chatCommands';
import { playUiSound, uiClick } from '../../../../../libs/sfx';
import { MuSpriteFrame, useMuSprite } from '../../../../components/muSprite';
import { MuText } from '../../../../components/muText';
import { useWindowStackEntry } from '../../../../components/muWindow/useWindowChrome';

/**
 * `CNewUIQuickCommandWindow` (NewUIQuickCommandWindow.cpp): the menu a right
 * click on another player pops at the cursor - the player's name in green
 * over a column of commands, each one an entry of the "D" command window run
 * straight away instead of armed for a second click. Hovering a row turns it
 * yellow and puts the two little arrows around it; a click runs it and
 * closes the menu, and so do Escape, a click outside, and the target dying,
 * leaving scope or walking off.
 *
 * The original opens on Alt + right click and lists five commands (GlobalText
 * 943, 1124, 944, 948, 949). Alt is the pick-order modifier here
 * (pointerInputSystem), so the menu takes the plain right click, and whisper
 * and attack are appended to the five - the frame is a tiled middle band, so
 * the art carries any number of rows.
 */

/** `RenderFrame`: the panel is 112 wide and its two caps are 45 tall each. */
const WIDTH = 112;
const CAP_HEIGHT = 45;
/** The middle band is drawn as 15 px tiles. */
const MIDDLE_TILE = 15;
/** `RenderContents`: one row per 19 px. */
const ROW_HEIGHT = 19;
/** `RenderText(m_Pos.x, m_Pos.y + 14, m_strID, 112, 0, RT3_SORT_CENTER)`. */
const TITLE_Y = 14;
/**
 * A row: `CheckMouseIn(m_Pos.x, m_Pos.y + 38 + i * 19, 112, 19)` is the box,
 * `RenderText(..., m_Pos.y + 14 + 30 + i * 19)` the label sitting 6 px into
 * it, and `RenderArrow` the two markers a pixel above that. The rule at the
 * bottom of the box (`m_Pos.y + 55 + i * 19`) is the divider to the next.
 */
const ROW_Y = 38;
const LABEL_DY = 6;
const ARROW_DY = 5;
const LINE_DY = 17;
/** `RenderImage(IMAGE_QUICKCOMMAND_LINE, m_Pos.x + 15, ..., 82, 2)`. */
const LINE = { x: 15, width: 82, height: 2 };
/** `RenderArrow`: 6x9 at `m_Pos.x + 16` and `m_Pos.x + 90`. */
const ARROW = { width: 6, height: 9, left: 16, right: 90 };

const BACK_SPRITE = 'newui_msgbox_back.OZJ';
const FRAME_UP_SPRITE = 'newui_commamd04.OZT';
const FRAME_MIDDLE_SPRITE = 'newui_commamd02.OZT';
const FRAME_DOWN_SPRITE = 'newui_commamd03.OZT';
const LINE_SPRITE = 'newui_commamd_Line.OZJ';
const ARROW_L_SPRITE = 'newui_arrow(L).OZT';
const ARROW_R_SPRITE = 'newui_arrow(R).OZT';

/** `SetTextColor` on the title and on the rows. */
const TITLE_COLOR = 'rgb(0, 255, 0)';
const ROW_COLOR = '#fff';
const ROW_SELECTED_COLOR = 'rgb(255, 255, 0)';

const WINDOW_ID = 'quick-command-window';

/** How often the menu re-checks that its target is still there (`Update`). */
const TICK_MS = 100;

/**
 * GlobalText 943, 1124, 944, 948, 949 - the original's five - with whisper
 * (945) in the command window's place after party, and attack last.
 */
const ENTRIES: { kind: CommandKind; labelKey: TextKey }[] = [
  { kind: 'trade', labelKey: 'command.trade' },
  { kind: 'purchase', labelKey: 'command.purchase' },
  { kind: 'party', labelKey: 'command.party' },
  { kind: 'whisper', labelKey: 'command.whisper' },
  { kind: 'follow', labelKey: 'command.follow' },
  { kind: 'battle', labelKey: 'command.battle' },
  { kind: 'attack', labelKey: 'command.attack' },
];

const HEIGHT = CAP_HEIGHT + ROW_HEIGHT * ENTRIES.length;
const MIDDLE_HEIGHT = HEIGHT - CAP_HEIGHT * 2;

export const QuickCommandWindow = observer(() => {
  const [selected, setSelected] = useState(-1);
  // The markers mount only on the hovered row, so they are decoded up front:
  // loaded on the hover itself they paint a frame or two after the yellow.
  useMuSprite(ARROW_L_SPRITE);
  useMuSprite(ARROW_R_SPRITE);
  const target = Commands.quickTarget;
  const open = target !== null;

  useWindowStackEntry(WINDOW_ID, open, () => {
    Commands.closeQuick();
    playUiSound('click');
  });

  useEffect(() => {
    if (!open) return;
    setSelected(-1);
    const tick = window.setInterval(() => Commands.quickTick(), TICK_MS);
    // `UpdateMouseEvent`: a **left release** outside the panel closes it.
    // The release, not the press, and the left button only - the right
    // release of the very click that opened the menu is still to come, and
    // it bubbles to a listener added during its own press.
    const onUp = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const el = e.target as HTMLElement | null;
      if (!el?.closest(`.${WINDOW_ID}`)) Commands.closeQuick();
    };
    window.addEventListener('pointerup', onUp);
    return () => {
      window.clearInterval(tick);
      window.removeEventListener('pointerup', onUp);
    };
  }, [open]);

  if (!target) return null;

  const scale = uiScaleFactor(GameOptions.uiScale);
  // `y = MouseY - 50` is clamped to the top by `OpenQuickCommand`; the right
  // and bottom edges are ours, the menu being scaled by the interface size.
  const left = Math.min(Commands.quickPos.x, window.innerWidth - WIDTH * scale);
  const top = Math.min(Commands.quickPos.y, window.innerHeight - HEIGHT * scale);

  const run = (kind: CommandKind) => {
    const entity = target;
    Commands.closeQuick();
    Commands.run(kind, entity);
  };

  return (
    <div
      className={WINDOW_ID}
      style={{
        left: Math.max(0, left),
        top: Math.max(0, top),
        width: WIDTH,
        height: HEIGHT,
        transform: `scale(${scale})`,
      }}
      onPointerLeave={() => setSelected(-1)}
    >
      <MuSpriteFrame
        file={BACK_SPRITE}
        width={WIDTH}
        height={HEIGHT}
        className="quick-command-art"
        style={{ left: 0, top: 0, backgroundSize: '100% 100%' }}
      />
      <MuSpriteFrame
        file={FRAME_UP_SPRITE}
        width={WIDTH}
        height={CAP_HEIGHT}
        className="quick-command-art"
        style={{ left: 0, top: 0, backgroundSize: '100% 100%' }}
      />
      <MuSpriteFrame
        file={FRAME_MIDDLE_SPRITE}
        width={WIDTH}
        height={MIDDLE_HEIGHT}
        className="quick-command-art"
        style={{
          left: 0,
          top: CAP_HEIGHT,
          backgroundSize: `100% ${MIDDLE_TILE}px`,
          backgroundRepeat: 'repeat-y',
        }}
      />
      <MuSpriteFrame
        file={FRAME_DOWN_SPRITE}
        width={WIDTH}
        height={CAP_HEIGHT}
        className="quick-command-art"
        style={{ left: 0, top: HEIGHT - CAP_HEIGHT, backgroundSize: '100% 100%' }}
      />

      {/* `m_strID` in `g_hFontBold`, green, centred over the panel. */}
      <MuText
        face="bold"
        align="center"
        className="quick-command-title"
        color={TITLE_COLOR}
        style={{ top: TITLE_Y, width: WIDTH }}
        text={target.objectNameInWorld ?? ''}
      />

      {ENTRIES.map((entry, i) => (
        <div
          key={entry.kind}
          className="quick-command-row"
          style={{ top: ROW_Y + i * ROW_HEIGHT, width: WIDTH, height: ROW_HEIGHT }}
          onPointerEnter={() => setSelected(i)}
          onClick={uiClick(() => run(entry.kind))}
        >
          <MuText
            align="center"
            className="quick-command-label"
            color={selected === i ? ROW_SELECTED_COLOR : ROW_COLOR}
            style={{ top: LABEL_DY, width: WIDTH }}
            text={t(entry.labelKey)}
          />
          {selected === i && (
            <>
              <MuSpriteFrame
                file={ARROW_L_SPRITE}
                width={ARROW.width}
                height={ARROW.height}
                className="quick-command-arrow"
                style={{ left: ARROW.left, top: ARROW_DY, backgroundSize: '100% 100%' }}
              />
              <MuSpriteFrame
                file={ARROW_R_SPRITE}
                width={ARROW.width}
                height={ARROW.height}
                className="quick-command-arrow"
                style={{ left: ARROW.right, top: ARROW_DY, backgroundSize: '100% 100%' }}
              />
            </>
          )}
          {i < ENTRIES.length - 1 && (
            <MuSpriteFrame
              file={LINE_SPRITE}
              width={LINE.width}
              height={LINE.height}
              className="quick-command-art"
              style={{ left: LINE.x, top: LINE_DY, backgroundSize: '100% 100%' }}
            />
          )}
        </div>
      ))}
    </div>
  );
});
