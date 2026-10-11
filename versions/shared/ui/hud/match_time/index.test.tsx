import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { runInAction } from 'mobx';
import { FIDELITY_CLASSIC, FIDELITY_DEFAULT, setFidelityChoice } from '@/controllers/fidelity';
import { ENUM_WORLD } from '@/core/types';

vi.stubGlobal('location', { search: '', hostname: 'localhost', href: 'http://localhost/' });
// The board places itself from the window size.
vi.stubGlobal('window', {
  innerWidth: 640,
  innerHeight: 480,
  addEventListener: () => {},
  removeEventListener: () => {},
});
const { MatchTime } = await import('.');
const { SoccerScoreHud } = await import('../soccer_score');
const { Social } = await import('@/modules/social/social');
const { Ecs } = await import('@/ecs/current');

function seconds(value: number): void {
  runInAction(() => {
    Social.soccerSeconds = value;
  });
}

describe('the match time at the screen centre (RenderTournamentInterface)', () => {
  afterEach(() => {
    seconds(-1);
    runInAction(() => {
      Social.battleSoccer = null;
      Ecs.world = null;
    });
    setFidelityChoice(FIDELITY_DEFAULT, {});
  });

  it('draws the original lines on Classic, red then yellow under a minute', () => {
    setFidelityChoice(FIDELITY_CLASSIC, {});
    seconds(125);
    let html = renderToStaticMarkup(<MatchTime />);
    expect(html).toContain('Remaining hours 2:05');
    expect(html).toContain('rgb(255,10,10)');
    expect(html).toContain('rgb(255,255,255)');
    seconds(135);
    expect(renderToStaticMarkup(<MatchTime />)).toContain('Remaining seconds 2:15');
    seconds(42);
    html = renderToStaticMarkup(<MatchTime />);
    expect(html).toContain('Remaining seconds 0:42');
    expect(html).toContain('rgb(255,255,10)');
  });

  it('draws nothing at zero, before any time or past ten minutes', () => {
    setFidelityChoice(FIDELITY_CLASSIC, {});
    for (const value of [-1, 0, 11 * 60]) {
      seconds(value);
      expect(renderToStaticMarkup(<MatchTime />)).toBe('');
    }
    seconds(10 * 60 + 59);
    expect(renderToStaticMarkup(<MatchTime />)).toContain('Remaining seconds 10:59');
  });

  it('moves the time onto the scoreboard with soccerBoardClock', () => {
    runInAction(() => {
      Ecs.world = { mapIndex: ENUM_WORLD.WD_6STADIUM } as never;
      Social.battleSoccer = { redTeam: 'Red', blueTeam: 'Blue', redGoals: 1, blueGoals: 0 };
    });
    seconds(125);
    expect(renderToStaticMarkup(<MatchTime />)).toBe('');
    expect(renderToStaticMarkup(<SoccerScoreHud />)).toContain('02:05');

    setFidelityChoice(FIDELITY_CLASSIC, {});
    expect(renderToStaticMarkup(<SoccerScoreHud />)).not.toContain('02:05');
  });
});
