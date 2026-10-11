import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { runInAction } from 'mobx';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

vi.mock('@/controllers/interface/components/mu_sprite', async importOriginal => ({
  ...(await importOriginal<object>()),
  MuSpriteFrame: ({ file }: { file: string }) => <i data-file={file} />,
}));

// Skills first: they keep the app import cycle in order (versions/shared/skills/readme.md).
await import('@versions/shared/skills/skillVisuals');
const { PROJECT_CREDITS, ProjectCreditsWindow, CreditsList, creditGroups } = await import('.');
const { MuWindows } = await import('@/controllers/interface');
type Credit = import('@/modules/credits').Credit;

const credit = (kind: Credit['kind'], name: string, commits = 0, reports = 0, extra: Partial<Credit> = {}): Credit => ({
  kind,
  name,
  commits,
  reports,
  ...extra,
});

const LIST: Credit[] = [
  credit('thanks', 'Sven-n', 0, 0, { note: 'OpenMU' }),
  credit('thanks', 'OpenMU Team', 0, 0, { roll: ['zTeam'] }),
  credit('person', 'Ignies', 900, 1),
  credit('person', 'helper', 3),
  credit('playtest', 'REGZPL'),
  credit('person', 'tester', 0, 2),
  credit('everyone', ''),
];

describe('creditGroups', () => {
  it('splits the running order into the thanks, writers, playtesters, reporters and everyone', () => {
    expect(creditGroups(LIST).map(g => [g.group, g.credits.map(c => c.name)])).toEqual([
      ['thanks', ['Sven-n', 'OpenMU Team']],
      ['contributors', ['Ignies', 'helper']],
      ['playtesters', ['REGZPL']],
      ['reporters', ['tester']],
      ['everyone', ['']],
    ]);
  });

  it('leaves out a group with nobody in it', () => {
    expect(creditGroups([credit('thanks', 'Sven-n')]).map(g => g.group)).toEqual(['thanks']);
  });
});

describe('the credits list', () => {
  const html = renderToStaticMarkup(<CreditsList list={LIST} />);

  it('names everyone with their commits and reports', () => {
    for (const text of ['Sven-n', 'OpenMU', 'zTeam', 'Ignies', '900 commits', '1 reports', 'REGZPL', 'tester', '2 reports']) {
      expect(html).toContain(text);
    }
  });

  it('heads each group with its count', () => {
    expect(html).toContain('Contributors (2)');
    expect(html).toContain('Bug reports (1)');
  });

  it('names the owners it builds on and where the Season 6 roll is', () => {
    expect(html).toContain('Webzen');
    expect(html).toContain('server list');
  });
});

describe('ProjectCreditsWindow', () => {
  it('draws nothing while closed, the default window frame while open', () => {
    expect(renderToStaticMarkup(<ProjectCreditsWindow />)).toBe('');
    runInAction(() => MuWindows.setOpen(PROJECT_CREDITS, true));
    const html = renderToStaticMarkup(<ProjectCreditsWindow />);
    expect(html).toContain('mu-item-window');
    expect(html).toContain('newui_exit_00.OZT');
    runInAction(() => MuWindows.setOpen(PROJECT_CREDITS, false));
  });
});
