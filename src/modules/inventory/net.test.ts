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
const { CharacterInventoryPacket } = await import('@versions/shared/packets/ServerToClientPackets');

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
