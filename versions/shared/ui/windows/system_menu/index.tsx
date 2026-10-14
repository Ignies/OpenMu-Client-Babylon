import './style.less';
import { useEffect } from 'react';
import { runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import { t, type TextKey } from '@/i18n';
import { MuWindows } from '@/controllers/interface';
import { MSGBOX_WIDTH, MsgBoxFrame } from '@/controllers/interface/components/msg_box_frame';
import { MuButton } from '@/controllers/interface/components/mu_button';
import { UI_STAGE_HEIGHT, UI_STAGE_WIDTH, useUiViewport } from '@/controllers/interface/components/ui_stage';
import { playUiSound } from '@/controllers/sound/sfx';
import { isTypingInField } from '@/ecs/systems/keyboardInputSystem';
import { SessionExit, type ExitKind } from '@/modules/session/sessionExit';

/**
 * `CSystemMenuMsgBox` (NewUICustomMessageBox.cpp:2155-2435): Escape in the world. Five
 * `MSGBOX_BTN_EMPTY` buttons down a message box of five middle slices, 100 from the top of the
 * stage; the three ways out log out at once, Option opens the Options window. Reads `SessionExit`.
 */

const LINES = 5;
const TOP = 100;
const BUTTON = { width: 108, height: 29 };
const FIRST_BUTTON_Y = 23;
const BUTTON_STEP = 30;
const BUTTON_SPRITE = 'newui_btn_empty.OZT';

/**
 * Ours (Season1): a label longer than the 108 px button wrapped to two lines and pushed the rest out
 * of line (Spanish, French, Portuguese). One line always; past `LABEL_FIT` characters the 11 px font
 * shrinks to fit.
 */
const LABEL_FIT = 16;
const labelStyle = (label: string) => ({
  whiteSpace: 'nowrap' as const,
  fontSize: label.length > LABEL_FIT ? `${Math.max(8, (11 * LABEL_FIT) / label.length).toFixed(1)}px` : undefined,
});

const BUTTONS: { key: TextKey; exit?: ExitKind }[] = [
  { key: 'options.exitGame', exit: 'quit' },
  { key: 'options.selectServer', exit: 'servers' },
  { key: 'options.switchCharacter', exit: 'characters' },
  { key: 'options.title' },
  { key: 'common.cancel' },
];

function choose(index: number): void {
  const { exit } = BUTTONS[index];
  SessionExit.closeMenu();
  if (exit) SessionExit.request(exit);
  // `OptionBtnDown`: the fourth button.
  else if (index === 3) runInAction(() => MuWindows.setOpen('options', true));
}

export const SystemMenuWindow = observer(() => {
  const { width, height, scale } = useUiViewport();
  const open = SessionExit.menuOpen;

  // `MSGBOX_EVENT_PRESSKEY_ESC` is Cancel. Captured ahead of the game's keyboard handler, which
  // would open the menu again.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.isComposing || isTypingInField()) return;
      e.preventDefault();
      e.stopPropagation();
      if (e.repeat) return;
      playUiSound('click');
      SessionExit.closeMenu();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open]);

  if (!open) return null;

  const left = (width - UI_STAGE_WIDTH * scale) / 2 + (UI_STAGE_WIDTH / 2 - MSGBOX_WIDTH / 2) * scale;
  const top = (height - UI_STAGE_HEIGHT * scale) / 2 + TOP * scale;

  return (
    <div className="system-menu-layer">
      <MsgBoxFrame lines={LINES} className="system-menu" style={{ left, top, transform: `scale(${scale})` }}>
        {BUTTONS.map(({ key }, i) => (
          <MuButton
            key={key}
            file={BUTTON_SPRITE}
            width={BUTTON.width}
            height={BUTTON.height}
            frames={{ up: 0, active: 1, down: 2 }}
            color="#ffffff"
            label={t(key)}
            labelStyle={labelStyle(t(key))}
            onClick={() => choose(i)}
            style={{
              position: 'absolute',
              left: (MSGBOX_WIDTH - BUTTON.width) / 2,
              top: FIRST_BUTTON_Y + i * BUTTON_STEP,
            }}
          />
        ))}
      </MsgBoxFrame>
    </div>
  );
});
