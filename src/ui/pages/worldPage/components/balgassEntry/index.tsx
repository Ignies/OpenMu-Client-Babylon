import './style.less';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { t, type TextKey } from '../../../../../i18n';
import {
  balgassEntryBox,
  cancelBalgassEntry,
  enterBalgass,
  type BalgassEntryBox,
  type BalgassEntryKind,
} from '../../../../../quests/balgassEntry';
import { isTypingInField } from '../../../../../ecs/systems/keyboardInputSystem';
import { playUiSound } from '../../../../../libs/sfx';
import { MsgBoxFrame, msgBoxHeight } from '../../../../components/msgBoxFrame';
import { MuButton } from '../../../../components/muButton';
import { UI_STAGE_HEIGHT, UI_STAGE_WIDTH, useUiViewport } from '../../../../components/uiStage';
import {
  BOX,
  BUTTON,
  BUTTON_BOTTOM,
  BUTTON_FRAMES,
  CANCEL_SPRITE,
  CANCEL_X,
  FRAME_LINES,
  GATEKEEPER_FIRST_COLOR,
  GATEKEEPER_TITLE_COLOR,
  LINE_STEP,
  LOCKED_BUTTON,
  OK_SPRITE,
  OK_X,
  TEXT_COLOR,
  TEXT_TOP,
  TEXT_WIDTH,
  TEXT_X,
  WEREWOLF_FIRST_COLOR,
  WEREWOLF_TITLE_COLOR,
} from './layout';

/**
 * `CMapEnterWerwolfMsgBoxLayout` / `CMapEnterGateKeeperMsgBoxLayout`: the
 * third class quests' entry boxes, OK / Cancel on the common message box.
 * Reads `quests/balgassEntry.ts` and owns no state.
 */

/** One `AddMsg`; a null key is the original's `AddMsg(L" ")` spacer row. */
type Message = { key: TextKey | null; color?: string; bold?: boolean };

const BLANK: Message = { key: null };

const MESSAGES: Record<BalgassEntryKind, readonly Message[]> = {
  werewolf: [
    { key: 'quest.werewolf.name', color: WEREWOLF_TITLE_COLOR, bold: true },
    BLANK,
    { key: 'quest.werewolf.line1', color: WEREWOLF_FIRST_COLOR },
    BLANK,
    { key: 'quest.werewolf.line2' },
    BLANK,
    { key: 'quest.werewolf.line3' },
    BLANK,
    { key: 'quest.werewolf.line4' },
  ],
  gatekeeper: [
    { key: 'quest.gatekeeper.name', color: GATEKEEPER_TITLE_COLOR, bold: true },
    BLANK,
    { key: 'quest.gatekeeper.line1', color: GATEKEEPER_FIRST_COLOR },
    BLANK,
    { key: 'quest.gatekeeper.line2' },
    BLANK,
    { key: 'quest.gatekeeper.line3' },
  ],
};

/** Places a 640x480-stage point on the canvas, scaled like the sheets. */
function useStage() {
  const { width, height, scale } = useUiViewport();
  const offsetX = (width - UI_STAGE_WIDTH * scale) / 2;
  const offsetY = (height - UI_STAGE_HEIGHT * scale) / 2;
  return (x: number, y: number) => ({
    left: offsetX + x * scale,
    top: offsetY + y * scale,
    transform: `scale(${scale})`,
  });
}

const EntryBox = observer(({ kind, canEnter }: BalgassEntryBox) => {
  const at = useStage();
  const messages = MESSAGES[kind];
  const texts = messages.map(message => (message.key ? t(message.key) : ''));
  const signature = texts.join('\n');
  const textRef = useRef<HTMLDivElement>(null);
  const [textLines, setTextLines] = useState(FRAME_LINES);

  useLayoutEffect(() => {
    const height = textRef.current?.scrollHeight;
    if (height) setTextLines(Math.max(1, Math.round(height / LINE_STEP)));
  }, [signature]);

  // Captured ahead of the game's keyboard handler, which would close the
  // window under the box or open the system menu on Escape.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.isComposing || (e.key !== 'Enter' && e.key !== 'Escape')) return;
      if (isTypingInField()) return;
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'Escape') {
        playUiSound('click');
        cancelBalgassEntry();
      } else if (canEnter) {
        playUiSound('click');
        enterBalgass();
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [canEnter]);

  const middle = Math.max(0, textLines - FRAME_LINES);
  const buttonTop = msgBoxHeight(middle) - BUTTON_BOTTOM;

  return (
    <div className="balgass-entry-layer">
      <MsgBoxFrame lines={middle} className="balgass-entry" style={at(BOX.x, BOX.y)}>
        <div
          ref={textRef}
          className="balgass-entry-text"
          style={{ left: TEXT_X, top: TEXT_TOP, width: TEXT_WIDTH, lineHeight: `${LINE_STEP}px` }}
        >
          {messages.map((message, i) => (
            <div
              key={i}
              style={{ color: message.color ?? TEXT_COLOR, fontWeight: message.bold ? 'bold' : undefined }}
            >
              {texts[i] || ' '}
            </div>
          ))}
        </div>
        <MuButton
          file={OK_SPRITE}
          width={BUTTON.width}
          height={BUTTON.height}
          frames={BUTTON_FRAMES}
          disabled={!canEnter}
          onClick={enterBalgass}
          style={{ position: 'absolute', left: OK_X, top: buttonTop, ...(canEnter ? null : LOCKED_BUTTON) }}
        />
        <MuButton
          file={CANCEL_SPRITE}
          width={BUTTON.width}
          height={BUTTON.height}
          frames={BUTTON_FRAMES}
          onClick={cancelBalgassEntry}
          style={{ position: 'absolute', left: CANCEL_X, top: buttonTop }}
        />
      </MsgBoxFrame>
    </div>
  );
});

/** One line in `worldPage/index.tsx`. */
export const BalgassEntryWindow = observer(() => {
  const box = balgassEntryBox();
  if (!box) return null;
  return <EntryBox kind={box.kind} canEnter={box.canEnter} />;
});
