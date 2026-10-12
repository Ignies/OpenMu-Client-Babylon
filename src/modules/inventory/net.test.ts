import { describe, expect, it, vi } from 'vitest';
import { runInAction } from 'mobx';
import type { Item } from '@/ecs/world';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// Skills first: they keep the app import cycle in order (versions/shared/skills/readme.md).
await import('@versions/shared/skills/skillVisuals');
const { installNet } = await import('./net');
const { Hero } = await import('@/modules/hero');
const { Economy } = await import('../economy/economy');
const { EventBus } = await import('@/core/eventBus');
const { CharacterInventoryPacket, ConsumeItemWithEffectPacket, ItemDurabilityChangedPacket } = await import('@versions/shared/packets/ServerToClientPackets');
const { Bag } = await import('./state');
const { Session } = await import('../session');

installNet();

// ReceiveInventoryExtended (WSclient.cpp:1672-1683): the whole bag comes in one packet.
describe('CharacterInventory', () => {
  it('empties the bag and the stall before filling them', () => {
    const left = { group: 0, id: 1 } as unknown as Item;
    runInAction(() => {
      Hero.items[12] = left;
      Economy.myShopItems[3] = left;
    });
    const p = CharacterInventoryPacket.createPacket(6); // header + count 0
    EventBus.emit('CharacterInventory', p.buffer);
    expect(Hero.items[12]).toBeNull();
    expect(Economy.myShopItems[3]).toBeNull();
  });
});

// EnableUse = 0 on the answer: ReceiveDurability's consumption flag (WSclient.cpp:7164-7167) and ReceiveHelperItem (:7190).
describe('the answer to a use', () => {
  const sent = vi.spyOn(Session, 'sendToGS').mockImplementation(() => {});
  const use = () => {
    sent.mockClear();
    Bag.consumeItemRequest(20);
    return sent.mock.calls.length;
  };

  it('lets the next use go at once after a durability change by consumption', () => {
    runInAction(() => (Session.isOffline = false));
    expect(use()).toBe(1);
    expect(use()).toBe(0);
    const p = ItemDurabilityChangedPacket.createPacket();
    p.InventorySlot = 20;
    p.Durability = 2;
    p.ByConsumption = false;
    EventBus.emit('ItemDurabilityChanged', p.buffer);
    expect(use()).toBe(0);
    p.ByConsumption = true;
    EventBus.emit('ItemDurabilityChanged', p.buffer);
    expect(use()).toBe(1);
  });

  it('lets the next use go at once after an item with an effect (Ale)', () => {
    expect(use()).toBe(0);
    const p = ConsumeItemWithEffectPacket.createPacket();
    p.EffectTimeInSeconds = 60;
    EventBus.emit('ConsumeItemWithEffect', p.buffer);
    expect(use()).toBe(1);
  });
});
