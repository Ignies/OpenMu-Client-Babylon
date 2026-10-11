import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { runInAction } from 'mobx';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// Skills first: they keep the app import cycle in order (versions/shared/skills/readme.md).
await import('@versions/shared/skills/skillVisuals');
const { PregameSystemMenu, chooseSysMenu } = await import('./pregame');
const { PREGAME_MENU, openPregameMenu } = await import('@/ecs/systems/keyboardInputSystem');
const { MsgBox, MuWindows } = await import('@/controllers/interface');
const { AppState, UIState } = await import('@/controllers/interface/uiState');
const { SessionExit } = await import('@/modules/session/sessionExit');

const on = (screen: number) => runInAction(() => (AppState.uiState = screen));
afterEach(() => {
  runInAction(() => {
    MuWindows.setOpen(PREGAME_MENU, false);
    MuWindows.setOpen('options', false);
  });
  MsgBox.closeMsgWin();
});

// CUIMng::Update (UIMng.cpp:691-705): Escape on the login and character scenes shows CSysMenuWin.
describe('Escape on the server list and the character screen', () => {
  it('opens the system menu, not Options', () => {
    for (const screen of [UIState.Servers, UIState.Characters]) {
      on(screen);
      expect(openPregameMenu()).toBe(true);
      expect(MuWindows.isOpen(PREGAME_MENU)).toBe(true);
      expect(MuWindows.isOpen('options')).toBe(false);
      runInAction(() => MuWindows.setOpen(PREGAME_MENU, false));
    }
  });

  it('leaves the world and a message box alone', () => {
    on(UIState.World);
    expect(openPregameMenu()).toBe(false);
    on(UIState.Characters);
    MsgBox.popUpMsgWin(MsgBox.msgWin?.code ?? ('MESSAGE_WAIT' as never));
    expect(openPregameMenu()).toBe(false);
  });
});

// CSysMenuWin::Create (SysMenuWin.cpp:36-73): Select Server only on the character scene.
describe('CSysMenuWin', () => {
  const labels = () => {
    runInAction(() => MuWindows.setOpen(PREGAME_MENU, true));
    return [...renderToStaticMarkup(<PregameSystemMenu />).matchAll(/>(Exit Game|Select Server|Option|Close)</g)].map(m => m[1]);
  };

  it('lists Exit Game, Option and Close on the server list, Select Server too on the character screen', () => {
    on(UIState.Servers);
    expect(labels()).toEqual(['Exit Game', 'Option', 'Close']);
    on(UIState.Characters);
    expect(labels()).toEqual(['Exit Game', 'Select Server', 'Option', 'Close']);
  });

  it('opens Options and leaves for the server list', () => {
    on(UIState.Characters);
    const request = vi.spyOn(SessionExit, 'request').mockImplementation(() => undefined);
    chooseSysMenu('option');
    expect(MuWindows.isOpen('options')).toBe(true);
    expect(MuWindows.isOpen(PREGAME_MENU)).toBe(false);
    chooseSysMenu('servers');
    expect(request).toHaveBeenLastCalledWith('servers');
    request.mockRestore();
  });

  // MESSAGE_GAME_END_COUNTDOWN (MsgWin.cpp:197-218, :310-315).
  it('counts five seconds down before it exits', () => {
    vi.useFakeTimers();
    const request = vi.spyOn(SessionExit, 'request').mockImplementation(() => undefined);
    chooseSysMenu('exit');
    expect(MsgBox.msgWin?.text).toBe('You will exit game in 5 seconds.');
    vi.advanceTimersByTime(1000);
    expect(MsgBox.msgWin?.text).toBe('You will exit game in 4 seconds.');
    expect(request).not.toHaveBeenCalled();
    vi.advanceTimersByTime(4000);
    expect(request).toHaveBeenLastCalledWith('quit');
    expect(MsgBox.msgWin).toBeNull();
    request.mockRestore();
    vi.useRealTimers();
  });
});
