import './style.less';
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { observer } from 'mobx-react-lite';
import { t, type TextKey } from '@/i18n';
import { JewelMix, STACK_SIZES, combineZen } from '@/modules/chaos_mix/jewelMix';
import { isTypingInField } from '@/ecs/systems/keyboardInputSystem';
import { playUiSound } from '@/controllers/sound/sfx';
import { MsgBoxFrame, MSGBOX_WIDTH, msgBoxHeight } from '@/controllers/interface/components/msg_box_frame';
import { MuButton } from '@/controllers/interface/components/mu_button';
import { TEXT_COLOR } from '@/controllers/interface/components/mu_text';
import { UI_STAGE_HEIGHT, UI_STAGE_WIDTH, useUiViewport } from '@/controllers/interface/components/ui_stage';
import {
  BOX,
  BUTTON_FRAMES,
  BUTTON_HEIGHT,
  BUTTON_SPRITE,
  BUTTON_WIDTH,
  CANCEL_SPRITE,
  CANCEL_X,
  CHECK_BUTTON,
  CHECK_FRAME_LINES,
  CHECK_LINE_STEP,
  CHECK_TEXT_TOP,
  CHECK_TEXT_WIDTH,
  CLOSE_BOTTOM,
  COMBINE_COUNT_LINES,
  COMBINE_LINES,
  COUNT_GAP_Y,
  COUNT_WIDTH,
  COUNT_X,
  DARK_YELLOW,
  DISBAND_BOTTOM,
  DISMANTLE_LINES,
  JEWEL_GAP_X,
  JEWEL_GAP_Y,
  JEWEL_WIDTH,
  JEWEL_X,
  JEWEL_Y,
  LIST,
  LIST_PICKED,
  LIST_TEXT,
  LOCKED_BUTTON,
  MENU_BUTTON_GAP,
  MENU_BUTTON_Y,
  MENU_LINES,
  OK_SPRITE,
  OK_X,
  SMALL_BUTTON_SPRITE,
  SMALL_BUTTON_WIDTH,
  TEXT_STEP,
  TEXT_TOP,
  TITLE_COLOR,
  YELLOW,
} from './layout';

/** `GetJewelIndex(.., eGEM_NAME)`: GlobalText 1806, 1807, 3312-3314, 2081, 3315-3318. */
const jewelName = (jewel: number) => t(`lahap.jewel.${jewel}` as TextKey);

/** Places a 640x480-stage point on the canvas, scaled like the sheets. */
function useStage() {
  const { width, height, scale } = useUiViewport();
  const offsetX = (width - UI_STAGE_WIDTH * scale) / 2;
  const offsetY = (height - UI_STAGE_HEIGHT * scale) / 2;
  return (x: number, y: number): CSSProperties => ({
    left: offsetX + x * scale,
    top: offsetY + y * scale,
    transform: `scale(${scale})`,
  });
}

/** One `AddMsg` line of a custom box. */
type Line = { text: string; color?: string; bold?: boolean };

/** A `CNewUIMessageBoxBase` box: the frame at (BOX), centred text lines from the top, its buttons. */
const Box = observer(({ lines, texts, children }: { lines: number; texts: readonly Line[]; children: ReactNode }) => {
  const at = useStage();
  return (
    <div className="lahap-layer">
      <MsgBoxFrame lines={lines} className="lahap-box" style={at(BOX.x, BOX.y)}>
        {texts.map((line, i) => (
          <div
            key={i}
            className="lahap-text"
            style={{ top: TEXT_TOP + i * TEXT_STEP, color: line.color ?? TEXT_COLOR.white, fontWeight: line.bold ? 'bold' : undefined }}
          >
            {line.text || ' '}
          </div>
        ))}
        {children}
      </MsgBoxFrame>
    </div>
  );
});

/** A `CNewUIMessageBoxButton` on the wide or the small art, stretched to `width`. */
const button = (label: string, left: number, top: number, width: number, onClick: () => void, disabled = false) => (
  <MuButton
    file={width >= BUTTON_WIDTH ? BUTTON_SPRITE : SMALL_BUTTON_SPRITE}
    width={width}
    height={BUTTON_HEIGHT}
    frames={BUTTON_FRAMES}
    color={TEXT_COLOR.brightGray}
    activeColor={TEXT_COLOR.white}
    label={label}
    labelStyle={{ fontSize: 11 }}
    disabled={disabled}
    onClick={onClick}
    style={{ position: 'absolute', left, top, ...(disabled ? LOCKED_BUTTON : null) }}
  />
);

const centred = (width: number) => (MSGBOX_WIDTH - width) / 2;
const close = (top: number) => button(t('lahap.close'), centred(SMALL_BUTTON_WIDTH), top, SMALL_BUTTON_WIDTH, () => JewelMix.exit());

/** `CGemIntegrationMsgBox`: combine or dismantle. */
const Menu = observer(() => (
  <Box
    lines={MENU_LINES}
    texts={[
      { text: t('lahap.combineTitle'), color: TITLE_COLOR, bold: true },
      { text: t('lahap.menu1') },
      { text: t('lahap.menu2') },
    ]}
  >
    {button(t('lahap.combineTitle'), centred(BUTTON_WIDTH), MENU_BUTTON_Y, BUTTON_WIDTH, () => JewelMix.chooseCombine())}
    {button(t('lahap.dismantleTitle'), centred(BUTTON_WIDTH), MENU_BUTTON_Y + MENU_BUTTON_GAP, BUTTON_WIDTH, () => JewelMix.chooseDismantle())}
    {close(MENU_BUTTON_Y + 2 * MENU_BUTTON_GAP)}
  </Box>
));

/** `CGemIntegrationUnityMsgBox`: the ten jewels, then the three stack sizes and their zen. */
const Combine = observer(() => {
  const picked = JewelMix.jewel >= 0;
  const lines = picked ? COMBINE_COUNT_LINES : COMBINE_LINES;
  return (
    <Box
      lines={lines}
      texts={[
        { text: t('lahap.combineTitle'), color: TITLE_COLOR, bold: true },
        { text: t('lahap.selectCombine') },
      ]}
    >
      {picked
        ? STACK_SIZES.map((size, k) =>
            button(
              t('lahap.combineCount', { count: size, zen: combineZen(size) }),
              COUNT_X,
              JEWEL_Y + (BUTTON_HEIGHT + COUNT_GAP_Y) * k,
              COUNT_WIDTH,
              () => JewelMix.chooseSize(k)
            )
          )
        : Array.from({ length: 10 }, (_, i) =>
            button(
              jewelName(i),
              JEWEL_X + (i % 2) * (JEWEL_GAP_X + JEWEL_WIDTH),
              JEWEL_Y + (BUTTON_HEIGHT + JEWEL_GAP_Y) * Math.floor(i / 2),
              JEWEL_WIDTH,
              () => JewelMix.chooseJewel(i)
            )
          )}
      {close(msgBoxHeight(lines) - CLOSE_BOTTOM)}
    </Box>
  );
});

/** `CGemIntegrationDisjointMsgBox` and its `CUIUnmixgemList`: "name,  count" per packed jewel. */
const Dismantle = observer(() => {
  const height = msgBoxHeight(DISMANTLE_LINES);
  return (
    <Box
      lines={DISMANTLE_LINES}
      texts={[
        { text: t('lahap.dismantleTitle'), color: TITLE_COLOR, bold: true },
        { text: '' },
        { text: t('lahap.selectDismantle'), color: YELLOW, bold: true },
      ]}
    >
      <div
        className="lahap-list"
        data-no-drag="true"
        style={{ left: centred(LIST.width), top: LIST.top, width: LIST.width, height: LIST.height }}
      >
        {JewelMix.packed.map((entry, i) => (
          <div
            key={entry.slot}
            className="lahap-list-line"
            style={{
              height: LIST.line,
              lineHeight: `${LIST.line}px`,
              color: i === JewelMix.selected ? '#000' : LIST_TEXT,
              backgroundColor: i === JewelMix.selected ? LIST_PICKED : undefined,
            }}
            onClick={() => JewelMix.select(i)}
          >
            {`${jewelName(entry.jewel)},  ${(entry.level + 1) * 10}`}
          </div>
        ))}
      </div>
      {button(
        t('lahap.disband'),
        centred(SMALL_BUTTON_WIDTH),
        height - DISBAND_BOTTOM,
        SMALL_BUTTON_WIDTH,
        () => JewelMix.dismantle(),
        JewelMix.selected < 0
      )}
      {close(height - CLOSE_BOTTOM)}
    </Box>
  );
});

/** `CGemIntegrationUnityCheckMsgBoxLayout` / `DisjointCheck`: an OK / Cancel common message box. */
const Check = observer(({ texts }: { texts: readonly Line[] }) => {
  const at = useStage();
  const textRef = useRef<HTMLDivElement>(null);
  const [rows, setRows] = useState(CHECK_FRAME_LINES);
  const signature = texts.map(line => line.text).join('\n');

  useLayoutEffect(() => {
    const height = textRef.current?.scrollHeight;
    if (height) setRows(Math.max(1, Math.round(height / CHECK_LINE_STEP)));
  }, [signature]);

  // Enter is OK and Escape Cancel (MSGBOX_EVENT_PRESSKEY_RETURN / _ESC), ahead of the game's keys.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.isComposing || (e.key !== 'Enter' && e.key !== 'Escape') || isTypingInField()) return;
      e.preventDefault();
      e.stopPropagation();
      playUiSound('click');
      if (e.key === 'Enter') JewelMix.confirm();
      else JewelMix.cancelCheck();
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, []);

  const middle = Math.max(0, rows - CHECK_FRAME_LINES);
  const top = msgBoxHeight(middle) - CLOSE_BOTTOM;
  const okCancel = (file: string, left: number, onClick: () => void) => (
    <MuButton
      file={file}
      width={CHECK_BUTTON.width}
      height={CHECK_BUTTON.height}
      frames={BUTTON_FRAMES}
      onClick={onClick}
      style={{ position: 'absolute', left, top }}
    />
  );

  return (
    <div className="lahap-layer">
      <MsgBoxFrame lines={middle} className="lahap-box" style={at(BOX.x, BOX.y)}>
        <div
          ref={textRef}
          className="lahap-check-text"
          style={{ left: centred(CHECK_TEXT_WIDTH), top: CHECK_TEXT_TOP, width: CHECK_TEXT_WIDTH, lineHeight: `${CHECK_LINE_STEP}px` }}
        >
          {texts.map((line, i) => (
            <div key={i} style={{ color: line.color, fontWeight: 'bold' }}>
              {line.text}
            </div>
          ))}
        </div>
        {okCancel(OK_SPRITE, OK_X, () => JewelMix.confirm())}
        {okCancel(CANCEL_SPRITE, CANCEL_X, () => JewelMix.cancelCheck())}
      </MsgBoxFrame>
    </div>
  );
});

/**
 * Lahap (`CComGem`): the jewel combination boxes, one at a time like the original's message box
 * stack. Reads `modules/chaos_mix/jewelMix.ts` and owns no state.
 */
export const LahapWindow = observer(() => {
  switch (JewelMix.box) {
    case 'menu':
      return <Menu />;
    case 'combine':
      return <Combine />;
    case 'dismantle':
      return <Dismantle />;
    case 'combineCheck':
      // SelectMixBtnDown formats the jewel's name line with no holes, so it reads as the name.
      return (
        <Check
          texts={[
            { text: jewelName(JewelMix.jewel), color: YELLOW },
            { text: t('lahap.cost', { zen: JewelMix.zen }), color: YELLOW },
          ]}
        />
      );
    case 'dismantleCheck': {
      const entry = JewelMix.packed[JewelMix.selected];
      // `GetUnMixGemLevel() + 1`, as the original passes it.
      return (
        <Check
          texts={[
            { text: t('lahap.disbandSure', { name: jewelName(JewelMix.jewel), level: (entry?.level ?? 0) + 1 }), color: DARK_YELLOW },
            { text: t('lahap.dismantleCost', { zen: JewelMix.zen }), color: DARK_YELLOW },
          ]}
        />
      );
    }
    default:
      return null;
  }
});
