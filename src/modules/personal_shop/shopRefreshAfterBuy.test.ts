import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

await import('@versions/shared/skills/skillVisuals');
const { installNet } = await import('./net');
const { Economy } = await import('../economy/economy');
const { EventBus } = await import('@/core/eventBus');
const { PlayerShopItemListPacket, PlayerShopItemListActionKindEnum } = await import('@versions/shared/packets/ServerToClientPackets');

installNet();

/** What OpenMU's `ShowShopItemListPlugIn` writes: header, action, success, id, names, count, then 20-byte blocks. */
function list(action: number, slots: number[]): DataView {
  const size = 55 + slots.length * 20;
  const p = PlayerShopItemListPacket.createPacket(size);
  p.buffer.setUint8(4, action);
  p.Success = true;
  p.PlayerId = 0x8001;
  p.setPlayerName('Seller');
  p.setShopName('loja');
  p.ItemCount = slots.length;
  slots.forEach((slot, i) => {
    const o = 55 + i * 20;
    p.buffer.setUint8(o, slot);
    // minimal item: group 7 id 0 (Pants), level 0
    p.buffer.setUint8(o + 1, 0);
    p.buffer.setUint8(o + 2, 0);
    p.buffer.setUint8(o + 3, 255);
    p.buffer.setUint32(o + 16, 1000 * (i + 1), true);
  });
  return p.buffer;
}

describe('the browsed stall after a purchase', () => {
  it('drops the sold item when the server sends the update', () => {
    EventBus.emit('PlayerShopItemList', list(PlayerShopItemListActionKindEnum.ByRequest, [204, 205]));
    expect(Economy.browsing?.items.filter(Boolean)).toHaveLength(2);

    EventBus.emit('PlayerShopItemList', list(PlayerShopItemListActionKindEnum.UpdateAfterItemChange, [205]));
    expect(Economy.browsing?.items.filter(Boolean)).toHaveLength(1);
  });
});
