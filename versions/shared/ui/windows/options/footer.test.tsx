import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { runInAction } from 'mobx';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// Skills first: they keep the app import cycle in order (versions/shared/skills/readme.md).
await import('@versions/shared/skills/skillVisuals');
const { OptionsWindow } = await import('.');
const { MuWindows } = await import('@/controllers/interface');
const { AppState, UIState } = await import('@/controllers/interface/uiState');

// CNewUIOptionWindow has a Close button and no ways out: those are the system menus' (CSystemMenuMsgBox, CSysMenuWin).
describe('the Options footer', () => {
  it('holds Close and none of the ways out', () => {
    runInAction(() => {
      AppState.uiState = UIState.World;
      MuWindows.setOpen('options', true);
    });
    const html = renderToStaticMarkup(<OptionsWindow />);
    expect(html).toContain('>Close<');
    for (const label of ['Exit Game', 'Select Server', 'Switch Character']) expect(html).not.toContain(`>${label}<`);
  });
});
