import { describe, expect, it, vi } from 'vitest';
import { runInAction } from 'mobx';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// Skills first: they keep the app import cycle in order (versions/shared/skills/readme.md).
await import('@versions/shared/skills/skillVisuals');
const { SessionExit, openSystemMenu } = await import('./sessionExit');
const { MuWindows } = await import('@/controllers/interface');
const { AppState, UIState } = await import('@/controllers/interface/uiState');
const { Session } = await import('./state');

// CNewUIHotKey::UpdateKeyEvent (NewUIHotKey.cpp:119-126): Escape with no message box up opens
// CSystemMenuMsgBox, the five-button box; Options is one of its buttons.
describe('Escape in the world', () => {
  it('opens the system menu, not Options', () => {
    runInAction(() => {
      AppState.uiState = UIState.World;
    });
    expect(openSystemMenu()).toBe(true);
    expect(SessionExit.menuOpen).toBe(true);
    expect(MuWindows.isOpen('options')).toBe(false);
  });

  it('does not open it twice', () => {
    expect(openSystemMenu()).toBe(false);
    SessionExit.closeMenu();
    expect(SessionExit.menuOpen).toBe(false);
  });

  // The pre-game screens have their own CSysMenuWin (openPregameMenu, ecs/systems/keyboardInputSystem.ts).
  it('opens nothing on the server list or the character screen', () => {
    for (const screen of [UIState.Servers, UIState.Characters]) {
      runInAction(() => {
        AppState.uiState = screen;
      });
      expect(openSystemMenu()).toBe(false);
      expect(MuWindows.isOpen('options')).toBe(false);
    }
  });
});

// CSysMenuWin's Select Server (SysMenuWin.cpp:121-131): SendLogOut(BackToServerSelection) from the
// character screen, then the screen changes on the answer; OpenMU's LogoutAction answers it there too.
describe('Select Server on the character screen', () => {
  it('asks the server with LogOut(2) and leaves on its answer', () => {
    const sent: DataView[] = [];
    const send = vi.spyOn(Session, 'sendToGS').mockImplementation(b => void sent.push(b));
    const drop = vi.spyOn(Session, 'disconnectFromGameServer').mockImplementation(() => undefined);
    const online = vi.spyOn(Session, 'playOnline').mockImplementation(() => Promise.resolve());
    runInAction(() => {
      Session.isOffline = false;
      AppState.uiState = UIState.Characters;
    });
    SessionExit.request('servers');
    expect(sent.map(b => [b.getUint8(2), b.getUint8(3), b.getUint8(4)])).toEqual([[0xf1, 0x02, 2]]);
    expect(SessionExit.pending).toBe('servers');
    expect(drop).not.toHaveBeenCalled();
    SessionExit.onResponse(2);
    expect(SessionExit.pending).toBeNull();
    expect(drop).toHaveBeenCalled();
    [send, drop, online].forEach(spy => spy.mockRestore());
  });
});
