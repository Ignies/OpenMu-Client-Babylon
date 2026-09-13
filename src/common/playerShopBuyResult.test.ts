import { describe, expect, it } from 'vitest';
import { ItemSerializer } from './itemSerializer';
import {
  PlayerShopBuyResultPacket,
  PlayerShopBuyResultResultKindEnum,
} from './packets/ServerToClientPackets';

/**
 * A buy from another player's stall is answered with this packet and nothing
 * else - the item itself rides here (OpenMU `BuyRequestAction`), so the
 * offsets it is read at are the whole purchase.
 */
function serverPacket(slot: number, itemData: number[]): DataView {
  const bytes = new Uint8Array(21);
  bytes[0] = 0xc1;
  bytes[1] = 21;
  bytes[2] = 0x3f;
  bytes[3] = 0x06;
  bytes[4] = PlayerShopBuyResultResultKindEnum.Success;
  bytes[5] = 0x12; // SellerId, big endian
  bytes[6] = 0x34;
  bytes.set(itemData, 7);
  bytes[20] = slot;
  return new DataView(bytes.buffer);
}

describe('PlayerShopBuyResult', () => {
  it('reads the inventory slot the item was put in', () => {
    const p = new PlayerShopBuyResultPacket(serverPacket(37, []));

    expect(p.Result).toBe(PlayerShopBuyResultResultKindEnum.Success);
    expect(p.SellerId).toBe(0x1234);
    expect(p.ItemSlot).toBe(37);
  });

  it('carries the bought item', () => {
    // Excellent +13 lucky socketed item, as the seller had it.
    const wire = [
      0x2c, 0xef, 0x80, 0x61, 0x06, 0xd0, 0x02, 0x05, 0xfe, 0xff, 0xff, 0xff,
      0x00,
    ];
    const p = new PlayerShopBuyResultPacket(serverPacket(12, wire));

    const item = ItemSerializer.DeserializeItem(
      new Uint8Array(p.ItemData.buffer)
    );

    expect(item.group).toBe(13);
    expect(item.num).toBe(44);
    expect(item.lvl).toBe(13);
    expect(item.luck).toBe(true);
    expect(item.isExcellent).toBe(true);
    expect(item.socketCount).toBe(2);
  });
});
