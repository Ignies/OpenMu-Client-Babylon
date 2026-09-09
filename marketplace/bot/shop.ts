import {
  PlayerShopClosePacket,
  PlayerShopOpenPacket,
  PlayerShopSetItemPricePacket,
  ItemMoveRequestPacket,
} from '../../src/common/packets/ClientToServerPackets';
import {
  PlayerShopItemSoldToPlayerPacket,
  PlayerShopOpenSuccessfulPacket,
  PlayerShopSetItemPriceResponsePacket,
  PlayerShopSetItemPriceResponseItemPriceSetResultEnum as PriceResult,
  ItemMovedPacket,
} from '../../src/common/packets/ServerToClientPackets';
import { StorageKind } from '../../src/common/itemStorage';
import { InventoryConstants } from '../../src/common/inventoryConstants';
import type { BotConnection, Frame } from './connection';
import { view } from './session';

/**
 * The bot's personal shop, which is how it sells.
 *
 * A trade is a negotiation: two tables, four states, and a confirm from each
 * side that has to arrive in the right order. Every failure the delivery had
 * lived in that choreography - an item that never reached the table, a side
 * nobody checked, a cancel that destroys the Zen standing on it.
 *
 * A shop has none of it. `BuyRequestAction` checks the buyer's money, moves
 * the item and moves the payment inside one server-side operation with no
 * cancel path: either the buyer walks away with the item and the bot with the
 * Zen, or nothing happened. The bot does not confirm anything, so it cannot
 * confirm the wrong thing, and a second buyer arriving late is refused by the
 * server rather than charged.
 *
 * What it costs is that a shop can only *sell*. Taking an item from a seller
 * and paying a seller what they are owed both still need a trade.
 */

/** Every shop packet is 0x3F; the sub code says which. */
const CODE = {
  price: { code: 0x3f, sub: 0x01 },
  opened: { code: 0x3f, sub: 0x02 },
  closed: { code: 0x3f, sub: 0x03 },
  sold: { code: 0x3f, sub: 0x08 },
  /** The server's answer to an item move, whichever box it went to. */
  moved: { code: 0x24 },
} as const;

/**
 * Shop slots are inventory slots, not a box of their own numbering.
 *
 * `ShopStorage` is a window onto the inventory starting at
 * `FirstStoreItemSlotIndex`, and both `SetItemPriceAction` and the item move
 * address it by absolute slot - so the first shop square is 204, not 0. The
 * comment on OpenMU's own `SetPriceAsync` says "0 to 31" and is describing an
 * older layout; the code beneath it looks the item up by `ItemSlot`.
 */
export const FIRST_SHOP_SLOT = InventoryConstants.FirstStoreItemSlotIndex;
export const SHOP_SLOTS = InventoryConstants.StoreSize;

/** A character below this cannot open a shop at all (`SetItemPriceAction`). */
export const MINIMUM_SHOP_LEVEL = 6;

export type Sale = { slot: number; buyer: string };

export class ShopSession {
  private open = false;
  private readonly unsubscribe: () => void;
  private readonly sales: Sale[] = [];
  private watchers: ((sale: Sale) => void)[] = [];

  constructor(
    private readonly connection: BotConnection,
    private readonly log: (message: string) => void = () => {}
  ) {
    this.unsubscribe = connection.on(frame => this.handle(frame));
  }

  dispose(): void {
    this.unsubscribe();
  }

  get isOpen(): boolean {
    return this.open;
  }

  /**
   * Moves a held item out of the bag and into the shop window.
   *
   * The move is confirmed rather than assumed: the server answers with
   * `ItemMoved` naming where the item actually went, and a refused move is
   * silent. Pricing a slot that never received the item would otherwise open
   * a shop selling nothing, which is the same shape of bug the trade
   * delivery had.
   */
  async stockItem(inventorySlot: number, shopSlot: number, timeoutMs = 8000): Promise<void> {
    const answer = this.connection.expect(CODE.moved, timeoutMs, 'ItemMoved');
    const packet = ItemMoveRequestPacket.createPacket();
    packet.FromStorage = StorageKind.Inventory;
    packet.FromSlot = inventorySlot;
    packet.ToStorage = StorageKind.PersonalShop;
    packet.ToSlot = shopSlot;
    packet.setItemData(new Uint8Array(12), 12);
    this.connection.send(packet.buffer);

    const moved = new ItemMovedPacket(view(await answer));
    if (moved.TargetStorageType !== StorageKind.PersonalShop || moved.TargetSlot !== shopSlot) {
      throw new Error(
        `the item did not reach shop slot ${shopSlot} from bag slot ${inventorySlot}`
      );
    }
  }

  /**
   * Puts an item back in the bag, for a listing nobody bought.
   *
   * Same confirmation, and it matters more here: an item stranded in the shop
   * window is one the bot still holds but can no longer find.
   */
  async unstockItem(shopSlot: number, inventorySlot: number, timeoutMs = 8000): Promise<void> {
    const answer = this.connection.expect(CODE.moved, timeoutMs, 'ItemMoved');
    const packet = ItemMoveRequestPacket.createPacket();
    packet.FromStorage = StorageKind.PersonalShop;
    packet.FromSlot = shopSlot;
    packet.ToStorage = StorageKind.Inventory;
    packet.ToSlot = inventorySlot;
    packet.setItemData(new Uint8Array(12), 12);
    this.connection.send(packet.buffer);

    const moved = new ItemMovedPacket(view(await answer));
    if (moved.TargetStorageType !== StorageKind.Inventory || moved.TargetSlot !== inventorySlot) {
      throw new Error(`the item is stranded in shop slot ${shopSlot}`);
    }
  }

  /**
   * Prices one shop slot. Must happen while the shop is shut: OpenMU refuses
   * a price change on an open store, which is also what stops a buyer paying
   * yesterday's price for today's item.
   */
  async setPrice(shopSlot: number, price: number, timeoutMs = 8000): Promise<void> {
    const answer = this.connection.expect(CODE.price, timeoutMs, 'ItemPriceResponse');
    const packet = PlayerShopSetItemPricePacket.createPacket();
    packet.ItemSlot = shopSlot;
    packet.Price = price;
    this.connection.send(packet.buffer);

    const response = new PlayerShopSetItemPriceResponsePacket(view(await answer));
    if (response.Result !== PriceResult.Success) {
      throw new Error(
        `the server refused the price for slot ${shopSlot}: ${
          PriceResult[response.Result] ?? response.Result
        }`
      );
    }
  }

  /** Opens the shop under a name passers-by can read. */
  async openWith(name: string, timeoutMs = 8000): Promise<void> {
    const answer = this.connection.expect(CODE.opened, timeoutMs, 'ShopOpened');
    const packet = PlayerShopOpenPacket.createPacket();
    packet.setStoreName(name);
    this.connection.send(packet.buffer);

    const response = new PlayerShopOpenSuccessfulPacket(view(await answer));
    if (!response.Success) throw new Error('the server refused to open the shop');
    this.open = true;
    this.log(`shop open as "${name}"`);
  }

  /**
   * Shuts the shop. Sent unconditionally rather than only when we believe it
   * is open: the belief is the thing most likely to be wrong after a crash,
   * and a close on a shut shop costs nothing.
   */
  close(): void {
    this.connection.send(PlayerShopClosePacket.createPacket().buffer);
    this.open = false;
  }

  /**
   * Waits for a particular slot to sell.
   *
   * Resolves with the buyer's name, which the server volunteers - so who
   * bought it is known rather than assumed, and a listing claimed by one
   * person but bought by another is visible instead of silently mis-booked.
   */
  waitForSale(shopSlot: number, timeoutMs: number): Promise<Sale> {
    const already = this.sales.find(s => s.slot === shopSlot);
    if (already) return Promise.resolve(already);

    return new Promise<Sale>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.watchers = this.watchers.filter(w => w !== watcher);
        reject(new Error(`nobody bought it within ${Math.round(timeoutMs / 1000)}s`));
      }, timeoutMs);

      const watcher = (sale: Sale) => {
        if (sale.slot !== shopSlot) return;
        clearTimeout(timer);
        this.watchers = this.watchers.filter(w => w !== watcher);
        resolve(sale);
      };
      this.watchers.push(watcher);
    });
  }

  /** Forgets past sales, so a new listing does not resolve on an old one. */
  reset(): void {
    this.sales.length = 0;
  }

  private handle(frame: Frame): void {
    if (frame.code !== CODE.sold.code) return;

    if (frame.sub === CODE.sold.sub) {
      const packet = new PlayerShopItemSoldToPlayerPacket(view(frame));
      const sale: Sale = { slot: packet.InventorySlot, buyer: packet.BuyerName };
      this.sales.push(sale);
      this.log(`slot ${sale.slot} sold to ${sale.buyer}`);
      for (const watcher of [...this.watchers]) watcher(sale);
      return;
    }

    if (frame.sub === CODE.closed.sub) {
      // The server can shut the shop without being asked - the last item
      // selling does it - so this is the only reliable word on the matter.
      this.open = false;
    }
  }
}
