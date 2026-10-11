import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

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
const { ServersPage } = await import('.');

// CLoginMainWin (LoginMainWin.cpp:23-50): the Menu button at the bottom left of the server list.
describe('the server list', () => {
  it('carries the login screen Menu and Credit buttons and the deco', () => {
    const html = renderToStaticMarkup(<ServersPage />);
    for (const file of ['server_menu_b_all.OZT', 'server_credit_b_all.OZT', 'deco.OZT']) expect(html, file).toContain(`data-file="${file}"`);
  });
});
