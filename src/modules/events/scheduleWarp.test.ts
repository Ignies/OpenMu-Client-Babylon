import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// Skills first: they keep the app import cycle in order (versions/shared/skills/readme.md).
await import('@versions/shared/skills/skillVisuals');
const { installChaosCastle, chaosCastlePrompt, closeChaosCastlePrompt } = await import('./chaosCastle');
const { scheduleLayer } = await import('./schedule');
const { OPENING_STATE_GAME } = await import('./recipes');
const { Session } = await import('../session');
const { AppState, UIState } = await import('../../controllers/interface/uiState');
const { Ecs } = await import('../../ecs/current');
const { EventBus } = await import('@/core/eventBus');
const { MiniGameOpeningStatePacket } = await import('@versions/shared/packets/ServerToClientPackets');

installChaosCastle();

/** The server's answer to a Chaos Castle opening-state request: opens in `minutes`. */
function chaosAnswer(minutes: number): void {
  const p = MiniGameOpeningStatePacket.createPacket();
  p.GameType = OPENING_STATE_GAME.chaosCastle;
  p.RemainingEnteringTimeMinutes = minutes >> 8;
  p.RemainingEnteringTimeMinutesLow = minutes & 0xff;
  p.UserCount = 0;
  EventBus.emit('MiniGameOpeningState', p.buffer);
}

describe('event schedule poll across a warp', () => {
  it('an answer that lands after the map change raises no Chaos Castle prompt', () => {
    vi.spyOn(Session, 'sendToGS').mockImplementation(() => undefined);
    Session.isOffline = false;
    AppState.uiState = UIState.World;
    Ecs.world = {} as never;

    // The HUD poll goes out ...
    scheduleLayer.update?.(0, 0);
    expect(Session.sendToGS).toHaveBeenCalled();

    // ... the map change resets the layers (loading the map blocked the thread,
    // so the answer is only handled now) ...
    scheduleLayer.reset?.();
    chaosAnswer(60);

    // ... and the answer is the poll's, not a ticket's: nothing is shown.
    expect(chaosCastlePrompt()).toBeNull();
  });

  it('an answer nobody asked for still raises the prompt (the ticket path is untouched)', () => {
    closeChaosCastlePrompt();
    chaosAnswer(60);
    expect(chaosCastlePrompt()).not.toBeNull();
  });
});
