import { ClosePlayerShopDialogPacket, PlayerShopBuyResultPacket, PlayerShopBuyResultResultKindEnum, PlayerShopClosedPacket, PlayerShopItemListPacket, PlayerShopItemSoldToPlayerPacket, PlayerShopOpenSuccessfulPacket, PlayerShopSetItemPriceResponseItemPriceSetResultEnum, PlayerShopSetItemPriceResponsePacket, PlayerShopsPacket } from '@versions/shared/packets/ServerToClientPackets';
import { Economy, type ShopStock } from '../economy/economy';
import { EventBus } from '@/core/eventBus';
import { ItemSerializer } from '../items/itemSerializer';
import { PERSONAL_SHOP_SLOTS, StorageKind, localIndexOf } from '../inventory/itemStorage';
import { Social } from '../social/social';
import { Store } from '@/app/store';
import { t, type TextKey } from '@/i18n';
import { cleanName } from '../chat/chat';
import { runInAction } from 'mobx';

// --- Personal shop (CNewUIMyShopInventory / CNewUIPurchaseShopInventory) -----

EventBus.on('PlayerShopSetItemPriceResponse', packet => {
  const p = new PlayerShopSetItemPriceResponsePacket(packet);
  const E = PlayerShopSetItemPriceResponseItemPriceSetResultEnum;

  const reason: Partial<Record<number, TextKey>> = {
    [E.Failed]: 'personalShop.disabled',
    [E.ItemSlotOutOfRange]: 'personalShop.slotNotInShop',
    [E.ItemNotFound]: 'personalShop.itemGone',
    [E.PriceNegative]: 'notify.negativePrice',
    [E.ItemIsBlocked]: 'personalShop.cannotSell',
    [E.CharacterLevelTooLow]: 'personalShop.needLevel',
  };

  Economy.itemPriceResult(
    p.InventorySlot,
    p.Result === E.Success,
    t(reason[p.Result] ?? 'personalShop.priceNotSet')
  );
});

EventBus.on('PlayerShopOpenSuccessful', packet => {
  const p = new PlayerShopOpenSuccessfulPacket(packet);
  Economy.sellingStarted(p.Success);
});

EventBus.on('PlayerShopItemSoldToPlayer', packet => {
  const p = new PlayerShopItemSoldToPlayerPacket(packet);
  Economy.itemSold(p.InventorySlot, cleanName(p.BuyerName));
});

// `PlayerShops` (0x3F 0x00): the shop titles floating over players in scope.
// The ids here carry the same 0x8000 flag bit as the scope packets, so they
// are masked down to the net id the world entities are keyed by - the name
// tags look a shop title up by `entity.netId`.
EventBus.on('PlayerShops', packet => {
  const p = new PlayerShopsPacket(packet);
  for (const shop of p.getShops()) {
    Economy.setShopTitle(shop.PlayerId & 0x7fff, cleanName(shop.StoreName));
  }
});

EventBus.on('PlayerShopClosed', packet => {
  const p = new PlayerShopClosedPacket(packet);
  const maskedId = p.PlayerId & 0x7fff;
  Economy.setShopTitle(maskedId, null);
  Economy.dropBrowsedShop(maskedId);

  // The server's confirmation of our own close (or a forced close): state
  // only. `stopSelling()` would send PlayerShopClose again, which OpenMU
  // answers with another PlayerShopClosed - 600 round trips in one second
  // (verified live).
  if (Store.playerId === maskedId) Economy.sellingStopped();
});

EventBus.on('ClosePlayerShopDialog', packet => {
  const p = new ClosePlayerShopDialogPacket(packet);
  Economy.dropBrowsedShop(p.PlayerId & 0x7fff);
});

/**
 * The stall list quotes its slots the way `CNewUIPurchaseShopInventory`
 * indexes them - `MAX_MY_INVENTORY_EX_INDEX` + square. A slot that is
 * already inside the 8×4 grid is taken as a square, so a server that counts
 * from zero still fills the window instead of leaving it empty.
 */
function shopSquareOf(slot: number): number {
  if (slot >= 0 && slot < PERSONAL_SHOP_SLOTS) return slot;
  return localIndexOf(StorageKind.PersonalShop, slot);
}

EventBus.on('PlayerShopItemList', packet => {
  const p = new PlayerShopItemListPacket(packet);

  if (!p.Success) {
    Social.errorMessage(t('personalShop.openFailed'));
    return;
  }

  const items = new Array<ShopStock | null>(PERSONAL_SHOP_SLOTS).fill(null);

  for (const entry of p.getItems()) {
    const square = shopSquareOf(entry.ItemSlot);
    if (square < 0 || square >= PERSONAL_SHOP_SLOTS) continue;

    items[square] = {
      slot: entry.ItemSlot,
      item: ItemSerializer.DeserializeItem(new Uint8Array(entry.ItemData.buffer)),
      price: entry.Price,
    };
  }

  Economy.showShop({
    playerId: p.PlayerId & 0x7fff,
    playerName: cleanName(p.PlayerName),
    shopName: cleanName(p.ShopName),
    items,
  });
});

/**
 * The bought item rides this packet and nothing else: OpenMU's
 * `BuyRequestAction` puts it in the inventory server-side and reports it
 * here, with no `ItemAddedToInventory` behind it. Dropping the payload left
 * the slot empty until the next login.
 */
EventBus.on('PlayerShopBuyResult', packet => {
  const p = new PlayerShopBuyResultPacket(packet);

  if (p.Result !== PlayerShopBuyResultResultKindEnum.Success) {
    Economy.shopBuyResult(p.Result);
    return;
  }

  // ReceivePurchaseItem (WSclient.cpp:9526-9597) plays nothing.
  const item = ItemSerializer.DeserializeItem(new Uint8Array(p.ItemData.buffer));

  runInAction(() => {
    Store.playerData.items[p.ItemSlot] = item;
  });

  Store.syncPlayerAppearance();
});
