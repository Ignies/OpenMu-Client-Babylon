import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { runInAction } from 'mobx';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// Skills first: they keep the app import cycle in order (versions/shared/skills/readme.md).
await import('@versions/shared/skills/skillVisuals');
const { WindowMenu, chooseWindowMenu, WINDOW_MENU } = await import('.');
const { MAIN_FRAME_BUTTONS } = await import('../../hud/bottom_bar/mainFrameButtons');
const { MuWindows } = await import('@/controllers/interface');
const { SessionExit } = await import('@/modules/session/sessionExit');
const { Social } = await import('@/modules/social/social');

// CNewUIMainFrameWindow's fifth button toggles INTERFACE_WINDOW_MENU (NewUIMainFrameWindow.cpp:866-868).
describe('the window menu', () => {
  it('opens from the main frame\'s fifth button and lists the six entries', () => {
    MAIN_FRAME_BUTTONS[4].toggle();
    expect(MuWindows.isOpen(WINDOW_MENU)).toBe(true);
    const html = renderToStaticMarkup(<WindowMenu />);
    const labels = [...html.matchAll(/class="window-menu-label"[^>]*>([^<]+)</g)].map(m => m[1]);
    expect(labels).toEqual(['System (Esc)', 'Help (F1)', 'Guild (G)', 'Move (M)', 'Map (Tab)', 'Gens Info (B)']);
    MAIN_FRAME_BUTTONS[4].toggle();
    expect(MuWindows.isOpen(WINDOW_MENU)).toBe(false);
  });

  // UpdateMouseEvent (NewUIWindowMenu.cpp:60-110).
  it('opens the system menu, the guild and the map, closing itself; Move leaves it up', () => {
    const open = () => runInAction(() => MuWindows.setOpen(WINDOW_MENU, true));
    open();
    chooseWindowMenu(0);
    expect(SessionExit.menuOpen).toBe(true);
    expect(MuWindows.isOpen(WINDOW_MENU)).toBe(false);
    SessionExit.closeMenu();
    open();
    chooseWindowMenu(2);
    expect(Social.guildWindowEnabled).toBe(true);
    expect(MuWindows.isOpen(WINDOW_MENU)).toBe(false);
    open();
    chooseWindowMenu(3);
    expect(MuWindows.isOpen('move_command')).toBe(true);
    expect(MuWindows.isOpen(WINDOW_MENU)).toBe(true);
    chooseWindowMenu(4);
    expect(MuWindows.isOpen('minimap')).toBe(true);
    expect(MuWindows.isOpen(WINDOW_MENU)).toBe(false);
  });
});
