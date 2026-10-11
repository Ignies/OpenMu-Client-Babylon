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
