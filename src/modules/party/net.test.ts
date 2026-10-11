import { afterEach, describe, expect, it, vi } from 'vitest';
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
const { PartyListPacket, PartyRequestPacket } = await import('@versions/shared/packets/ServerToClientPackets');
const { PartyInviteResponsePacket } = await import('@versions/shared/packets/ClientToServerPackets');
const { Session } = await import('@/modules/session');
const { GameOptions } = await import('@/controllers/settings');

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

// `/re on|off|auto` (ours, `GameOptions.partyInviteReply`): on is the original's prompt.
describe('party invitations and /re', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    GameOptions.partyInviteReply = 0;
    runInAction(() => {
      Social.partyRequest = null;
    });
  });

  /** An invitation arrives: the answers sent (accepted or not), and whether the prompt is up. */
  function invite(): { answers: boolean[]; prompt: boolean } {
    const answers: boolean[] = [];
    vi.spyOn(Session, 'sendToGS').mockImplementation(view => {
      answers.push(new PartyInviteResponsePacket(view).Accepted);
    });
    const p = PartyRequestPacket.createPacket();
    p.RequesterId = 7;
    EventBus.emit('PartyRequest', p.buffer);
    return { answers, prompt: Social.partyRequest !== null };
  }

  it('asks, as the original, by default', () => {
    expect(invite()).toEqual({ answers: [], prompt: true });
  });

  it('declines or accepts on its own once the player says so', () => {
    vi.spyOn(performance, 'now').mockReturnValue(1e9);
    expect(Social.sendChat('/re off')).toBe(true);
    expect(GameOptions.partyInviteReply).toBe(1);
    expect(invite()).toEqual({ answers: [false], prompt: false });

    vi.restoreAllMocks();
    vi.spyOn(performance, 'now').mockReturnValue(2e9);
    Social.sendChat('/re auto');
    expect(invite()).toEqual({ answers: [true], prompt: false });
  });

  // The requestTimeout improvement (on in Enhanced, the test default).
  it('declines an invitation left alone for 20 s', () => {
    vi.useFakeTimers();
    const { answers } = invite();
    vi.advanceTimersByTime(20_000);
    vi.useRealTimers();
    expect(answers).toEqual([false]);
  });

  it('sends the command to nobody', () => {
    vi.spyOn(performance, 'now').mockReturnValue(3e9);
    const send = vi.spyOn(Session, 'sendToGS').mockImplementation(() => undefined);
    Social.sendChat('/re on');
    expect(send).not.toHaveBeenCalled();
    expect(GameOptions.partyInviteReply).toBe(0);
  });
});
