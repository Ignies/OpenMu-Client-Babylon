import { describe, expect, it, vi } from 'vitest';
import { runInAction } from 'mobx';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// Skills first: they keep the app import cycle in order (versions/shared/skills/readme.md).
await import('@versions/shared/skills/skillVisuals');
const { EventBus } = await import('@/core/eventBus');
const { Session } = await import('../session');
const { installQuestLog, questClientAction, CHARACTER_WINDOW_QUEST, INVENTORY_QUEST } = await import('./questLog');
const { QuestProgressPacket, QuestStateListPacket } = await import('@versions/shared/packets/ServerToClientPackets');
const { QuestClientActionRequestPacket } = await import('@versions/shared/packets/ClientToServerPackets');

installQuestLog();

const running = (...keys: number[]) => {
  const p = QuestStateListPacket.createPacket(5 + keys.length * 4);
  p.QuestCount = keys.length;
  keys.forEach((key, i) => {
    p.buffer.setUint16(5 + i * 4, key & 0xffff, true);
    p.buffer.setUint16(7 + i * 4, key >> 16, true);
  });
  EventBus.emit('QuestStateList', p.buffer);
};
const rewardShown = (key: number) => {
  const p = QuestProgressPacket.createPacket();
  p.QuestNumber = key & 0xffff;
  p.QuestGroup = key >> 16;
  EventBus.emit('QuestProgress', p.buffer);
};

// The character window's and the inventory's opening (NewUICharacterInfoWindow.cpp:1636-1644, NewUIMyInventory.cpp:821-828):
// the running quest whose request / reward the server showed (SetEPRequestRewardState, WSclient.cpp:10587, :10644).
describe('the quest a window opening completes (QuestClientActionRequest)', () => {
  const sent = vi.spyOn(Session, 'sendToGS').mockImplementation(() => {});
  runInAction(() => (Session.isOffline = false));
  const actions = () =>
    sent.mock.calls
      .map(([buffer]) => new QuestClientActionRequestPacket(buffer))
      .filter(p => p.buffer.getUint8(2) === QuestClientActionRequestPacket.Code && p.buffer.getUint8(3) === QuestClientActionRequestPacket.SubCode)
      .map(p => [p.QuestNumber, p.QuestGroup]);

  it('sends quest 9 of group 1 once, after its request was shown', () => {
    running(CHARACTER_WINDOW_QUEST);
    sent.mockClear();
    questClientAction(CHARACTER_WINDOW_QUEST);
    expect(actions()).toEqual([]);
    rewardShown(CHARACTER_WINDOW_QUEST);
    questClientAction(CHARACTER_WINDOW_QUEST);
    questClientAction(CHARACTER_WINDOW_QUEST);
    expect(actions()).toEqual([[9, 1]]);
  });

  it('sends nothing once the quest left the running list', () => {
    running(INVENTORY_QUEST);
    rewardShown(INVENTORY_QUEST);
    running();
    sent.mockClear();
    questClientAction(INVENTORY_QUEST);
    expect(actions()).toEqual([]);
    rewardShown(INVENTORY_QUEST);
    questClientAction(INVENTORY_QUEST);
    expect(actions()).toEqual([[15, 1]]);
  });
});
