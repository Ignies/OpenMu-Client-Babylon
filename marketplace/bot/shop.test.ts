import { describe, expect, it } from 'vitest';
import { ShopSession, FIRST_SHOP_SLOT } from './shop';
import type { BotConnection, Frame, FrameHandler, Match } from './connection';
import {
  PlayerShopItemSoldToPlayerPacket,
  PlayerShopOpenSuccessfulPacket,
  PlayerShopSetItemPriceResponsePacket,
  PlayerShopSetItemPriceResponseItemPriceSetResultEnum as PriceResult,
  ItemMovedPacket,
} from '../../src/common/packets/ServerToClientPackets';
import { StorageKind } from '../../src/common/itemStorage';
import { codeOf } from './wire';

/**
 * The shop is how the bot sells, and the reason it sells this way is that the
 * server does the whole exchange itself. So what is worth testing here is not
 * the sale - nothing on this side can get that wrong - but every step that
 * sets it up, each of which fails silently if it is believed rather than
 * checked.
 *
 * Every shop packet is 0x3F and they are told apart only by sub code, so this
 * fake matches on both. One that matched on code alone would resolve a price
 * response with a shop-opened waiter and pass tests that mean nothing.
 */
class FakeConnection {
  readonly sent: { code: number; sub: number }[] = [];
  private readonly handlers: FrameHandler[] = [];
  private readonly waiters: { match: Match; resolve: (f: Frame) => void }[] = [];

  send(buffer: DataView | Uint8Array): void {
    const bytes =
      buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer.buffer.slice(0));
    this.sent.push(codeOf(bytes));
  }

  on(handler: FrameHandler): () => void {
    this.handlers.push(handler);
    return () => {
      const i = this.handlers.indexOf(handler);
      if (i >= 0) this.handlers.splice(i, 1);
    };
  }

  expect(match: Match): Promise<Frame> {
    return new Promise(resolve => this.waiters.push({ match, resolve }));
  }

  deliver(packet: { buffer: DataView }): void {
    const bytes = new Uint8Array(packet.buffer.buffer.slice(0));
    const { code, sub } = codeOf(bytes);
    const frame: Frame = { code, sub, bytes };

    for (let i = this.waiters.length - 1; i >= 0; i--) {
      const m = this.waiters[i].match;
      if (m.code !== code) continue;
      if (m.sub !== undefined && m.sub !== sub) continue;
      this.waiters.splice(i, 1)[0].resolve(frame);
    }
    for (const handler of [...this.handlers]) handler(frame);
  }

  asConnection(): BotConnection {
    return this as unknown as BotConnection;
  }
}

function priceResponse(slot: number, result: PriceResult) {
  const p = PlayerShopSetItemPriceResponsePacket.createPacket();
  p.writeHeader().writeLength();
  p.InventorySlot = slot;
  p.Result = result;
  return p;
}

function shopOpened(success: boolean) {
  const p = PlayerShopOpenSuccessfulPacket.createPacket();
  p.writeHeader().writeLength();
  p.Success = success;
  return p;
}

function sold(slot: number, buyer: string) {
  const p = PlayerShopItemSoldToPlayerPacket.createPacket();
  p.writeHeader().writeLength();
  p.InventorySlot = slot;
  p.setBuyerName(buyer);
  return p;
}

function itemMoved(targetSlot: number, storage: number) {
  const p = ItemMovedPacket.createPacket(16);
  p.writeHeader().writeLength();
  p.TargetSlot = targetSlot;
  p.TargetStorageType = storage;
  return p;
}

const setup = () => {
  const fake = new FakeConnection();
  return { fake, shop: new ShopSession(fake.asConnection()) };
};

describe('ShopSession.stockItem', () => {
  it('accepts an item the server put in the shop window', async () => {
    const { fake, shop } = setup();
    const stocking = shop.stockItem(19, FIRST_SHOP_SLOT);

    fake.deliver(itemMoved(FIRST_SHOP_SLOT, StorageKind.PersonalShop));

    await expect(stocking).resolves.toBeUndefined();
  });

  it('refuses when the item went somewhere else', async () => {
    const { fake, shop } = setup();
    const stocking = shop.stockItem(19, FIRST_SHOP_SLOT);

    // The move was rejected and the item stayed in the bag. Pricing the shop
    // slot after this would open a shop selling nothing.
    fake.deliver(itemMoved(19, StorageKind.Inventory));

    await expect(stocking).rejects.toThrow(/did not reach shop slot/);
  });
});

describe('ShopSession.setPrice', () => {
  it('carries the server refusal, by name', async () => {
    const { fake, shop } = setup();
    const pricing = shop.setPrice(FIRST_SHOP_SLOT, 15_000);

    fake.deliver(priceResponse(FIRST_SHOP_SLOT, PriceResult.CharacterLevelTooLow));

    await expect(pricing).rejects.toThrow(/CharacterLevelTooLow/);
  });

  it('is happy with a success', async () => {
    const { fake, shop } = setup();
    const pricing = shop.setPrice(FIRST_SHOP_SLOT, 15_000);

    fake.deliver(priceResponse(FIRST_SHOP_SLOT, PriceResult.Success));

    await expect(pricing).resolves.toBeUndefined();
  });
});

describe('ShopSession.openWith', () => {
  it('is only open once the server says so', async () => {
    const { fake, shop } = setup();
    const opening = shop.openWith('Marketplace');
    expect(shop.isOpen).toBe(false);

    fake.deliver(shopOpened(true));
    await opening;

    expect(shop.isOpen).toBe(true);
  });

  it('stays shut when the server refuses', async () => {
    const { fake, shop } = setup();
    const opening = shop.openWith('Marketplace');

    fake.deliver(shopOpened(false));

    await expect(opening).rejects.toThrow(/refused to open/);
    expect(shop.isOpen).toBe(false);
  });
});

describe('ShopSession.waitForSale', () => {
  it('reports who bought it, from the server rather than from the claim', async () => {
    const { fake, shop } = setup();
    const sale = shop.waitForSale(FIRST_SHOP_SLOT, 5000);

    fake.deliver(sold(FIRST_SHOP_SLOT, 'Ignies'));

    await expect(sale).resolves.toEqual({ slot: FIRST_SHOP_SLOT, buyer: 'Ignies' });
  });

  it('ignores a sale from a different slot', async () => {
    const { fake, shop } = setup();
    let settled = false;
    void shop.waitForSale(FIRST_SHOP_SLOT, 5000).then(() => (settled = true));

    fake.deliver(sold(FIRST_SHOP_SLOT + 1, 'Somebody'));
    await Promise.resolve();

    expect(settled).toBe(false);
  });

  it('resolves on a sale that landed before anyone asked', async () => {
    const { fake, shop } = setup();
    fake.deliver(sold(FIRST_SHOP_SLOT, 'Ignies'));

    // The sale packet can arrive while the worker is still between awaits;
    // dropping it would strand a listing that has in fact been paid for.
    await expect(shop.waitForSale(FIRST_SHOP_SLOT, 5000)).resolves.toEqual({
      slot: FIRST_SHOP_SLOT,
      buyer: 'Ignies',
    });
  });

  it('forgets old sales when reset', async () => {
    const { fake, shop } = setup();
    fake.deliver(sold(FIRST_SHOP_SLOT, 'Ignies'));
    shop.reset();

    let settled = false;
    void shop.waitForSale(FIRST_SHOP_SLOT, 5000).then(() => (settled = true));
    await Promise.resolve();

    expect(settled).toBe(false);
  });
});
