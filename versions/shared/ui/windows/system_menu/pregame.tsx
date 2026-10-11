import { runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import { t, type TextKey } from '@/i18n';
import { MsgBox, MsgWinCode, MuWindows } from '@/controllers/interface';
import { MuButton } from '@/controllers/interface/components/mu_button';
import { MuSpriteFrame } from '@/controllers/interface/components/mu_sprite';
import { TEXT_COLOR } from '@/controllers/interface/components/mu_text';
import { UI_STAGE_HEIGHT, UI_STAGE_WIDTH, useUiViewport } from '@/controllers/interface/components/ui_stage';
import { useWindowStackEntry } from '@/controllers/interface/components/mu_window';
import { AppState, UIState } from '@/controllers/interface/uiState';
import { PREGAME_MENU } from '@/ecs/systems/keyboardInputSystem';
import { SessionExit } from '@/modules/session/sessionExit';

/**
 * `CSysMenuWin` (SysMenuWin.cpp): the server list's and the character screen's system menu, a
 * `CWinEx` frame of 6 or 10 side lines centred on the stage. Exit Game counts five seconds down,
 * Select Server (the character screen only) leaves for the server list, Option opens Options.
 */

const WIDTH = 213;
const TOP_HEIGHT = 64;
const BOTTOM_HEIGHT = 43;
/** `op1_back3` / `op1_back4`: one side line. */
const LINE = 8;
/** `WE_CENTER_SPR_POS`: the stone fill's inset. */
const INSET = 3;
const BUTTON = { width: 108, height: 30 };
/** `SMW_BTN_GAP` plus a button. */
const BUTTON_STEP = 4 + BUTTON.height;
const FIRST_BUTTON_Y = 33;
const CLOSE_FROM_BOTTOM = 52;
/** `MESSAGE_GAME_END_COUNTDOWN`'s `m_nGameExit`. */
const EXIT_SECONDS = 5;

export type SysMenuButton = 'exit' | 'servers' | 'option' | 'close';

const LABEL: Record<SysMenuButton, TextKey> = {
  exit: 'options.exitGame',
  servers: 'options.selectServer',
  option: 'options.title',
  close: 'common.close',
};

const close = () => MuWindows.setOpen(PREGAME_MENU, false);

/** `MESSAGE_GAME_END_COUNTDOWN` (MsgWin.cpp:197-218, :310-315): no button, one line a second, then out. */
function exitCountdown(): void {
  let left = EXIT_SECONDS;
  MsgBox.popUpMsgWin(MsgWinCode.GameEndCountdown, { seconds: left });
  const timer = setInterval(() => {
    if (MsgBox.msgWin?.code !== MsgWinCode.GameEndCountdown) {
      clearInterval(timer);
      return;
    }
    if (--left > 0) {
      MsgBox.popUpMsgWin(MsgWinCode.GameEndCountdown, { seconds: left });
      return;
    }
    clearInterval(timer);
    MsgBox.closeMsgWin();
    SessionExit.request('quit');
  }, 1000);
}

/** `UpdateWhileActive` (SysMenuWin.cpp:115-147): what each button does. */
export function chooseSysMenu(button: SysMenuButton): void {
  runInAction(() => {
    close();
    if (button === 'option') MuWindows.setOpen('options', true);
  });
  if (button === 'exit') exitCountdown();
  else if (button === 'servers') SessionExit.request('servers');
}

export const PregameSystemMenu = observer(() => {
  const { width, height, scale } = useUiViewport();
  const screen = AppState.uiState;
  const open = MuWindows.isOpen(PREGAME_MENU) && (screen === UIState.Servers || screen === UIState.Characters);
  // Escape hides it again, in silence (UIMng.cpp:696-698).
  useWindowStackEntry(PREGAME_MENU, open, close);
  if (!open) return null;

  // `SetLine`: 6 lines on the login scene, 10 on the character scene, where Select Server is enabled.
  const characters = screen === UIState.Characters;
  const boxHeight = TOP_HEIGHT + BOTTOM_HEIGHT + LINE * (characters ? 10 : 6);
  const closeY = boxHeight - CLOSE_FROM_BOTTOM;
  // A disabled Select Server is not drawn (`CButton::Render`, no disable frame).
  const buttons: [SysMenuButton, number][] = [
    ['exit', FIRST_BUTTON_Y],
    ...(characters ? [['servers', FIRST_BUTTON_Y + BUTTON_STEP] as [SysMenuButton, number]] : []),
    ['option', closeY - BUTTON_STEP],
    ['close', closeY],
  ];
  const left = (width - UI_STAGE_WIDTH * scale) / 2 + ((UI_STAGE_WIDTH - WIDTH) / 2) * scale;
  const top = (height - UI_STAGE_HEIGHT * scale) / 2 + ((UI_STAGE_HEIGHT - boxHeight) / 2) * scale;
  const sides = LINE * (characters ? 10 : 6);

  return (
    <div className="system-menu-layer">
      <div className="sys-menu-win" style={{ left, top, width: WIDTH, height: boxHeight, transform: `scale(${scale})` }}>
        <MuSpriteFrame
          file="op1_stone.OZJ"
          width={WIDTH - INSET * 2}
          height={boxHeight - INSET * 2}
          style={{ position: 'absolute', left: INSET, top: INSET, backgroundRepeat: 'repeat' }}
        />
        <MuSpriteFrame file="op1_back1.OZT" width={WIDTH} height={TOP_HEIGHT} style={{ position: 'absolute', left: 0, top: 0 }} />
        <MuSpriteFrame
          file="op1_back3.OZJ"
          width={5}
          height={sides}
          style={{ position: 'absolute', left: 0, top: TOP_HEIGHT, backgroundRepeat: 'repeat-y' }}
        />
        <MuSpriteFrame
          file="op1_back4.OZJ"
          width={5}
          height={sides}
          style={{ position: 'absolute', right: 0, top: TOP_HEIGHT, backgroundRepeat: 'repeat-y' }}
        />
        <MuSpriteFrame
          file="op1_back2.OZT"
          width={WIDTH}
          height={BOTTOM_HEIGHT}
          style={{ position: 'absolute', left: 0, top: TOP_HEIGHT + sides }}
        />
        {buttons.map(([button, y]) => (
          <MuButton
            key={button}
            file="op1_b_all.OZT"
            width={BUTTON.width}
            height={BUTTON.height}
            frames={{ up: 0, active: 1, down: 2 }}
            color={TEXT_COLOR.brightGray}
            activeColor={TEXT_COLOR.white}
            label={t(LABEL[button])}
            labelStyle={{ fontSize: 11 }}
            onClick={() => chooseSysMenu(button)}
            style={{ position: 'absolute', left: Math.trunc((WIDTH - BUTTON.width) / 2), top: y }}
          />
        ))}
      </div>
    </div>
  );
});
