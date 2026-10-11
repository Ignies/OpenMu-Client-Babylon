import { describe, expect, it, vi } from 'vitest';
import { runInAction } from 'mobx';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// Skills first: they keep the app import cycle in order (versions/shared/skills/readme.md).
await import('@versions/shared/skills/skillVisuals');
const { installNet } = await import('./net');
const { Social } = await import('../social/social');
const { Hero } = await import('@/modules/hero');
const { EventBus } = await import('@/core/eventBus');
const { PartyListPacket } = await import('@versions/shared/packets/ServerToClientPackets');

installNet();

/** A PartyList with these members (10-byte names, 24 bytes each). */
function partyList(...names: string[]): DataView {
  const p = PartyListPacket.createPacket(5 + names.length * 24);
  p.Count = names.length;
  names.forEach((name, i) => {
    const at = 5 + i * 24;
    for (let c = 0; c < name.length; c++) p.buffer.setUint8(at + c, name.charCodeAt(c));
    p.buffer.setUint8(at + 10, i);
  });
  return p.buffer;
}

describe('PartyList', () => {
  // ReceivePartyList (WSclient.cpp:7367-7397) only fills Party[]; the always-on list shows it.
  it('does not open the party window on joining', () => {
    runInAction(() => {
      Hero.name = 'Hero';
      Social.partyMembers = [];
      Social.partyWindowEnabled = false;
    });
    EventBus.emit('PartyList', partyList('Leader', 'Hero'));
    expect(Social.partyMembers.map(m => m.name)).toEqual(['Leader', 'Hero']);
    expect(Social.partyWindowEnabled).toBe(false);
  });

  it('keeps a slot name an update leaves blank', () => {
    EventBus.emit('PartyList', partyList('', 'Hero'));
    expect(Social.partyMembers.map(m => m.name)).toEqual(['Leader', 'Hero']);
  });
});
