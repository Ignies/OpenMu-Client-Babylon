import { existsSync, readFileSync } from 'node:fs';
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
const { CREDITS, CreditsWindow, creditBlock } = await import('.');
const { loadCredits, parseCredits } = await import('@/controllers/assets');
const { MuWindows } = await import('@/controllers/interface');
const { AppState, UIState } = await import('@/controllers/interface/uiState');

const FILE = 'Data/Local/credit.bmd';

// CCreditWin::LoadText (CreditWin.cpp:370-400) and SetTextIndex (:402-433).
describe.skipIf(!existsSync(FILE))('the staff roll', () => {
  const lines = parseCredits(new Uint8Array(readFileSync(FILE)));

  it('reads credit.bmd as class and name records', () => {
    expect(lines).toHaveLength(400);
    expect(lines.slice(0, 3)).toEqual([
      { kind: 1, name: 'STAFF' },
      { kind: 2, name: 'Game Design' },
      { kind: 3, name: 'Webzen.INC' },
    ]);
  });

  it('shows a department, a team and up to three names at a time', () => {
    expect(creditBlock(lines, 0, { dept: 0, team: 0 })).toEqual({ dept: 0, team: 1, names: [2], next: 3 });
    // Game Designers has four names: the fourth is passed over unshown, as `iNameCnt` counts.
    const designers = lines.findIndex(l => l.name === 'Game Designers');
    expect(creditBlock(lines, designers, { dept: 0, team: 0 })).toEqual({
      dept: 0, team: designers, names: [designers + 1, designers + 2, designers + 3], next: designers + 5,
    });
  });
});

describe('the end of the roll', () => {
  it('is a class-0 line', () => {
    expect(creditBlock([{ kind: 0, name: '' }], 0, { dept: 0, team: 0 })).toBeNull();
  });
});

describe.skipIf(!existsSync(FILE))('CCreditWin', () => {
  it('draws the illustrations, the logo, the roll and the deco with its close button on the server list', () => {
    loadCredits(new Uint8Array(readFileSync(FILE)));
    runInAction(() => {
      AppState.uiState = UIState.Servers;
      MuWindows.setOpen(CREDITS, true);
    });
    const html = renderToStaticMarkup(<CreditsWindow />);
    for (const file of ['im1_1.OZJ', 'im1_2.OZJ', 'cr_mu_lo.OZT', 'deco.OZT', 'message_close_b_all.OZT']) {
      expect(html, file).toContain(`data-file="${file}"`);
    }
    runInAction(() => MuWindows.setOpen(CREDITS, false));
  });
});
