import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// Skills first: they keep the app import cycle in order (versions/shared/skills/readme.md).
await import('@versions/shared/skills/skillVisuals');
const { EventBus } = await import('@/core/eventBus');
const { ENUM_WORLD } = await import('@/core/types');
const { blobShadowsActive } = await import('@/controllers/render/objectShadow');
const { KanturuStateChangePacket, KanturuStateInfoStateTypeEnum: State } = await import('@versions/shared/packets/ServerToClientPackets');
const { installKanturu, kanturuLayer } = await import('./kanturu');

installKanturu();

/** The tower's state pair arrives, then a frame on `map`: are the Classic shadows on? */
function shadowsAfter(state: number, map: number): boolean {
  const p = KanturuStateChangePacket.createPacket();
  p.State = state as never;
  p.DetailState = 0;
  EventBus.emit('KanturuStateChange', p.buffer);
  kanturuLayer.update?.(map, 1 / 25);
  return blobShadowsActive();
}

// IsMayaScene: in Kanturu's tower, every state but the Nightmare fight, the open tower and the end
// (CKANTURUDirection.cpp:40-54) draws no shadow (ZzzObject.cpp:9382, :786, :853, :978, ZzzCharacter.cpp:8405).
describe('the Kanturu Maya scene', () => {
  it('turns the shadows off in the tower until the Nightmare fight', () => {
    const tower = ENUM_WORLD.WD_39KANTURU_3RD;
    expect(shadowsAfter(State.MayaBattle, tower)).toBe(false);
    expect(shadowsAfter(State.Standby, tower)).toBe(false);
    expect(shadowsAfter(State.NightmareBattle, tower)).toBe(true);
    expect(shadowsAfter(State.MayaBattle, ENUM_WORLD.WD_0LORENCIA)).toBe(true);
  });
});

// `m_CKanturu.m_iMayaState` (CKANTURUDirection.cpp:77-102): the detail of a Maya battle state change, 0 otherwise.
describe('the Maya direction state', () => {
  it('is the detail while the Maya battle runs', async () => {
    const { kanturuMayaState } = await import('./kanturu');
    const { lookState } = await import('@/controllers/monsters');
    const send = (state: number, detail: number) => {
      const p = KanturuStateChangePacket.createPacket();
      p.State = state as never;
      p.DetailState = detail;
      EventBus.emit('KanturuStateChange', p.buffer);
    };
    send(State.MayaBattle, 14);
    expect(kanturuMayaState()).toBe(14);
    // What the Maya hands' rows read.
    expect(lookState('kanturuMaya')).toBe(14);
    send(State.NightmareBattle, 3);
    expect(kanturuMayaState()).toBe(0);
  });
});
