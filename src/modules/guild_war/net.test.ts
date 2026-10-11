import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runInAction } from 'mobx';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

/** The score fireworks asked for: the square each went off on. */
const rises = vi.hoisted(() => [] as [number, number][]);
vi.mock('@/controllers/fx/firecrackerRise', () => ({
  spawnFirecrackerRise: (_scene: unknown, x: number, y: number) => void rises.push([x, y]),
}));

// Skills first: they keep the app import cycle in order (versions/shared/skills/readme.md).
await import('@versions/shared/skills/skillVisuals');
const { Ecs } = await import('@/ecs/current');
const { installNet } = await import('./net');
const { Social } = await import('../social/social');
const { EventBus } = await import('@/core/eventBus');
const { GuildSoccerScoreUpdatePacket, GuildSoccerTimeUpdatePacket, GuildWarEndedPacket } = await import(
  '@versions/shared/packets/ServerToClientPackets'
);

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
    expect(Social.battleSoccer).toEqual({ redTeam: 'Reds', blueTeam: 'Blues', redGoals: 2, blueGoals: 1 });
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

/** GuildSoccerTimeUpdate (F3 22): `seconds` left in the match. */
function time(seconds: number): DataView {
  const p = GuildSoccerTimeUpdatePacket.createPacket();
  p.Seconds = seconds;
  return p.buffer;
}

// ReceiveWTTimeLeft keeps the time in g_wtMatchTimeLeft, apart from the board (WSclient.cpp:10947-10952).
describe('GuildSoccerTimeUpdate', () => {
  beforeEach(() => {
    runInAction(() => {
      Social.battleSoccer = null;
      Social.soccerSeconds = -1;
    });
  });

  it('keeps the time while the board is hidden, so it is there when the board comes back', () => {
    EventBus.emit('GuildSoccerScoreUpdate', score(2, 1));
    EventBus.emit('GuildSoccerScoreUpdate', score(255, 1));
    EventBus.emit('GuildSoccerTimeUpdate', time(300));
    EventBus.emit('GuildSoccerScoreUpdate', score(2, 1));
    expect(Social.soccerSeconds).toBe(300);
  });

  it('goes with the war (`g_wtMatchTimeLeft.m_Time = 0`, ReceiveGuildEndWar, WSclient.cpp:7822)', () => {
    EventBus.emit('GuildSoccerTimeUpdate', time(300));
    EventBus.emit('GuildWarEnded', GuildWarEndedPacket.createPacket().buffer);
    expect(Social.soccerSeconds).toBe(-1);
  });
});

// `CreateEffect(BITMAP_FIRECRACKERRISE, ...)` on the hero's square after every score, the hiding one too (WSclient.cpp:8172-8179).
describe('the score fireworks', () => {
  it('go off on the square the hero stands on with every score', () => {
    const hero = { transform: { pos: { x: 60.4, y: 2.2, z: 155.9 } } };
    // A class instance: mobx keeps it as it is.
    const world = Object.assign(new (class FakeWorld {})(), { scene: {}, playerEntity: hero });
    runInAction(() => (Ecs.world = world as never));
    rises.length = 0;
    EventBus.emit('GuildSoccerScoreUpdate', score(2, 1));
    EventBus.emit('GuildSoccerScoreUpdate', score(255, 1));
    expect(rises).toEqual([[60, 155], [60, 155]]);
    runInAction(() => (Ecs.world = null));
  });
});
