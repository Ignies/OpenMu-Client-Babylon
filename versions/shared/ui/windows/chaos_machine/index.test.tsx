import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { runInAction } from 'mobx';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// The sprite art is fetched in the browser; here each frame names its file.
vi.mock('@/controllers/interface/components/mu_sprite', async importOriginal => ({
  ...(await importOriginal<object>()),
  MuSpriteFrame: ({ file }: { file: string }) => <i data-file={file} />,
}));

// Skills first: they keep the app import cycle in order (versions/shared/skills/readme.md).
await import('@versions/shared/skills/skillVisuals');
const { ChaosMachine } = await import('.');
const { Economy } = await import('@/modules/economy/economy');

// CChaosMixMenuMsgBox::RenderFrame (NewUICustomMessageBox.cpp:2914-2933): the title bar top, as the seed menus.
describe("the goblin's menu", () => {
  it('draws the title bar top', () => {
    runInAction(() => {
      Economy.mixOpen = true;
      Economy.mixMenuOpen = true;
    });
    const html = renderToStaticMarkup(<ChaosMachine />);
    const menu = html.slice(html.indexOf('chaos-menu'));
    expect(menu).toContain('data-file="newui_Message_03.OZT"');
  });
});

// CreateOkMessageBox after refusal 4 (WSclient.cpp:6812-6815): it outlives the tray.
describe('a refused mix level box', () => {
  it('shows the Devil Square line with an OK, the tray closed or not', () => {
    runInAction(() => {
      Economy.mixOpen = false;
      Economy.mixNotice = 'chaos.devilSquareLevel';
    });
    const html = renderToStaticMarkup(<ChaosMachine />);
    expect(html).toContain('Must be over level 10 to combine the invitation to Devil Square.');
    expect(html).toContain('data-file="newui_button_ok.OZT"');
    Economy.closeMixNotice();
  });
});
