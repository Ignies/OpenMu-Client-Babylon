import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// Skills first: they keep the app import cycle in order (versions/shared/skills/readme.md).
await import('@versions/shared/skills/skillVisuals');
const { EventBus } = await import('@/core/eventBus');
const { takeLookCue } = await import('@/controllers/monsters');
const P = await import('@versions/shared/packets/ServerToClientPackets');
const { installCrywolf, crywolfLayer } = await import('./crywolf');

installCrywolf();

function send(state: number) {
  const p = P.CrywolfStateInfoPacket.createPacket();
  p.Occupation = P.CrywolfStateInfoOccupationStateEnum.War;
  p.State = state as never;
  EventBus.emit('CrywolfStateInfo', p.buffer);
}

// CheckCryWolf1stMVP (GMCrywolf1st.cpp:108-123): a change to START sets Dark_Elf_Check, which the first Dark Elf to
// move takes (:846-848); CryWolfMVPInit drops it (:81).
describe('the Crywolf START cue', () => {
  it('is cued once when the state changes to START and dropped by a warp', () => {
    const { Started, Ready } = P.CrywolfStateInfoEventStateEnum;
    send(Ready);
    expect(takeLookCue('crywolfStart')).toBe(false);
    send(Started);
    expect(takeLookCue('crywolfStart')).toBe(true);
    expect(takeLookCue('crywolfStart')).toBe(false);
    send(Started);
    expect(takeLookCue('crywolfStart')).toBe(false);
    send(Ready);
    send(Started);
    crywolfLayer.reset?.();
    expect(takeLookCue('crywolfStart')).toBe(false);
  });
});
