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
});
