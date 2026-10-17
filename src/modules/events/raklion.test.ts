import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// Skills first: they keep the app import cycle in order (versions/shared/skills/readme.md).
await import('@versions/shared/skills/skillVisuals');
const { EventBus } = await import('@/core/eventBus');
const { lookState } = await import('@/controllers/monsters');
const P = await import('@versions/shared/packets/ServerToClientPackets');
const { installRaklion, raklionState, raklionSelupanState } = await import('./raklion');

installRaklion();

function send(name: 'RaklionStateInfo' | 'RaklionCurrentState' | 'RaklionStateChange', state: number, detail: number) {
  const p =
    name === 'RaklionStateInfo'
      ? P.RaklionStateInfoPacket.createPacket()
      : name === 'RaklionCurrentState'
        ? P.RaklionCurrentStatePacket.createPacket()
        : P.RaklionStateChangePacket.createPacket();
  p.State = state as never;
  p.DetailState = detail;
  EventBus.emit(name, p.buffer);
}

// CGM_Raklion::SetState (GM_Raklion.cpp:2747-2780): state 11 (DETAIL_STATE) carries Selupan's pattern, any other
// state is the event's and leaves the pattern as it was. All three packets read the same way (WSclient.cpp:12338-12354).
describe('the Raklion state', () => {
  it('takes the event state from any of the three packets and the pattern only from state 11', () => {
    send('RaklionCurrentState', 5, 7);
    expect(raklionState()).toBe(5);
    expect(raklionSelupanState()).toBe(0);
    send('RaklionStateChange', 11, 3);
    expect(raklionState()).toBe(5);
    expect(raklionSelupanState()).toBe(3);
    send('RaklionStateInfo', 10, 0);
    expect(raklionState()).toBe(10);
    expect(raklionSelupanState()).toBe(3);
  });

  it('hands the pattern to the monster looks', () => {
    send('RaklionStateChange', 11, 6);
    expect(lookState('raklionSelupan')).toBe(6);
  });
});
