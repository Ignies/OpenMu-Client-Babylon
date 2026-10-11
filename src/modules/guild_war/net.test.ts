import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runInAction } from 'mobx';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// Skills first: they keep the app import cycle in order (versions/shared/skills/readme.md).
await import('@versions/shared/skills/skillVisuals');
const { installNet } = await import('./net');
const { Social } = await import('../social/social');
const { EventBus } = await import('@/core/eventBus');
const { GuildSoccerScoreUpdatePacket } = await import('@versions/shared/packets/ServerToClientPackets');

installNet();

function score(red: number, blue: number): DataView {
  const p = GuildSoccerScoreUpdatePacket.createPacket();
  p.setRedTeamName('Reds');
  p.setBlueTeamName('Blues');
  p.RedTeamGoals = red;
  p.BlueTeamGoals = blue;
  return p.buffer;
}

describe('GuildSoccerScoreUpdate (ReceiveSoccerScore, WSclient.cpp:8153-8180)', () => {
  beforeEach(() => {
    runInAction(() => {
      Social.battleSoccer = null;
    });
  });

  it('shows the board and colours the two teams it names', () => {
    EventBus.emit('GuildSoccerScoreUpdate', score(2, 1));
    expect(Social.battleSoccer).toEqual({ redTeam: 'Reds', blueTeam: 'Blues', redGoals: 2, blueGoals: 1, seconds: -1 });
  });

  it('hides the board and stops the colours when the first score is 255 (`SoccerObserver = false`)', () => {
    EventBus.emit('GuildSoccerScoreUpdate', score(2, 1));
    EventBus.emit('GuildSoccerScoreUpdate', score(255, 1));
    expect(Social.battleSoccer).toBeNull();
    // Only the first score is read.
    EventBus.emit('GuildSoccerScoreUpdate', score(0, 255));
    expect(Social.battleSoccer?.blueGoals).toBe(255);
  });
});
