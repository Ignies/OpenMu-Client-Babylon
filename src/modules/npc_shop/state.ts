import { computed, makeObservable, observable, reaction, runInAction } from 'mobx';
import { t } from '@/i18n';
import type { Item } from '@/ecs/world';
import { EventBus } from '@/core/eventBus';
import { InventoryConstants } from '@/core/inventoryConstants';
import {
  BuyItemFromNpcRequestPacket,
  CloseNpcRequestPacket,
  RepairItemRequestPacket,
  SellItemToNpcRequestPacket,
  TalkToNpcRequestPacket,
} from '@versions/shared/packets/ClientToServerPackets';
import { MuWindows } from '@/controllers/interface';
import { playUiSound } from '@/controllers/sound';
import { prefetchItemIcons } from '@/controllers/assets';
import {
  calcMaxDurability,
  isRepairBanned,
  isSellingBanned,
  itemDef,
  itemValue,
  needsRepair,
  repairAllCost,
  repairCost,
} from '@/controllers/item_rules';
import { addNotification } from '../chat';
import { Session } from '../session';
import { Hero } from '../hero';
import { Bag, ITEM_MOVE_TIMEOUT, itemSize } from '../inventory';
import { StorageKind } from '../inventory/storageKind';
import { findFreeSlot, type Footprint } from '../inventory/inventoryFit';
import { Economy } from '../economy/economy';

/** `CNewUINPCShop`'s item control: 8 columns × 15 rows. */
export const SHOP_COLUMNS = 8;
export const SHOP_ROWS = 15;
const SHOP_SLOTS = SHOP_COLUMNS * SHOP_ROWS;

/** `SendRepairItemRequest(0xFF, …)`: everything at once. */
const REPAIR_ALL_SLOT = 0xff;
/** `m_bRepairEnableLevel` (NewUIMyInventory.cpp:796): self-repair from level 50. */
const SELF_REPAIR_LEVEL = 50;
/**
 * The merchants with a smithy (ZzzInterface.cpp:3605): Eo, Zienna, Hanzo,
 * Rhea and Bolo. The repair buttons only appear at these.
 */
const REPAIR_NPC_TYPES = new Set([243, 246, 251, 416, 578]);

/** The merchant window's contents (`CNewUINPCShop`). */
export type NpcShop = {
  npcId: number;
  name: string;
  npcType: number;
  repairShop: boolean;
  taxRate: number;
  items: (Item | null)[];
};

type NpcTarget = { netId: number; name: string; npcType: number };

/**
 * First slot of `items`'s grid part where `item` fits (the original's
 * `FindEmptySlot`); -1 when the inventory is full.
 */
function findFreeInventorySlot(items: (Item | null)[], item: Item): number {
  const first = InventoryConstants.LastEquippableItemSlotIndex + 1;
  const rows = Math.floor((items.length - first) / InventoryConstants.RowSize);
  const occupied: Footprint[] = [];

  for (let slot = first; slot < items.length; slot++) {
    const placed = items[slot];
    if (!placed) continue;
    const { w, h } = itemSize(placed);
    occupied.push({ slot, width: w, height: h });
  }

  const { w, h } = itemSize(item);

  return findFreeSlot(occupied, rows, w, h);
}

/** What the offline merchant sells: a Lorencia weapon-and-potion stall. */
function offlineShopStock(): { slot: number; item: Item }[] {
  const stock: Item[] = [
    { group: 14, num: 0, lvl: 0, durability: 1 },
    { group: 14, num: 1, lvl: 0, durability: 1 },
    { group: 14, num: 2, lvl: 0, durability: 1 },
    { group: 14, num: 3, lvl: 0, durability: 1 },
    { group: 14, num: 4, lvl: 0, durability: 1 },
    { group: 14, num: 5, lvl: 0, durability: 1 },
    { group: 14, num: 6, lvl: 0, durability: 1 },
    { group: 14, num: 8, lvl: 0, durability: 1 },
    { group: 14, num: 10, lvl: 0, durability: 1 },
    { group: 0, num: 0, lvl: 0, durability: 20 },
    { group: 0, num: 1, lvl: 0, durability: 22 },
    { group: 0, num: 2, lvl: 0, durability: 30 },
    { group: 1, num: 0, lvl: 0, durability: 20 },
    { group: 2, num: 0, lvl: 0, durability: 24 },
    { group: 4, num: 0, lvl: 0, durability: 20 },
    { group: 5, num: 0, lvl: 0, durability: 26 },
    { group: 6, num: 0, lvl: 0, durability: 22 },
    { group: 7, num: 5, lvl: 0, durability: 24 },
    { group: 8, num: 5, lvl: 0, durability: 24 },
    { group: 9, num: 5, lvl: 0, durability: 24 },
    { group: 10, num: 5, lvl: 0, durability: 24 },
    { group: 11, num: 5, lvl: 0, durability: 24 },
  ];

  const grid = new Array<Item | null>(SHOP_SLOTS).fill(null);
  const entries: { slot: number; item: Item }[] = [];

  for (const item of stock) {
    const { w, h } = itemSize(item);
    let placed = false;
    for (let row = 0; row + h <= SHOP_ROWS && !placed; row++) {
      for (let column = 0; column + w <= SHOP_COLUMNS && !placed; column++) {
        let fits = true;
        for (let y = 0; y < h && fits; y++) {
          for (let x = 0; x < w; x++) {
            if (grid[(row + y) * SHOP_COLUMNS + column + x]) {
              fits = false;
              break;
            }
          }
        }
        if (!fits) continue;
        const slot = row * SHOP_COLUMNS + column;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            grid[(row + y) * SHOP_COLUMNS + column + x] = item;
          }
        }
        entries.push({ slot, item });
        placed = true;
      }
    }
  }

  return entries;
}

/**
 * The NPC talk in flight and the merchant window (`CNewUINPCShop`): its stock, the buy waiting for
 * an answer, selling the carried item, and the repair mode of the inventory (`REPAIR_MODE_ON`).
 */
export const Merchant = new (class {
  /** The merchant window (`CNewUINPCShop`); null while no NPC is talking. */
  npcShop: NpcShop | null = null;

  /** `g_nTaxRate`: the castle's store tax, from `ReceiveTaxInfo` type 2 (WSclient.cpp:11307-11311). */
  private storeTaxRate = 0;

  /** `REPAIR_MODE_ON`: the next inventory click repairs instead of picking. */
  repairMode = false;

  /** A buy request is in flight (`BuyCost != 0` blocks a second one). */
  shopBuyPending = false;

  /** The merchant refused the last purchase; a bulk buy run stops on it. */
  shopBuyRefused = false;

  private shopBuyTimer: ReturnType<typeof setTimeout> | null = null;

  /** The NPC a TalkToNpcRequest went out for, until the server answers. */
  private pendingNpcTalk: NpcTarget | null = null;

  /** Monster type of the NPC whose `NpcWindowResponse` is pending (0 = none). */
  get pendingNpcType(): number {
    return this.pendingNpcTalk?.npcType ?? 0;
  }

  // --- NPC shop & repair (CNewUINPCShop, NewUIMyInventory repair mode) -------

  /**
   * Which window the offline test NPC opens next. There is no server to send
   * `NpcWindowResponse`, so talking to it again cycles merchant → vault →
   * chaos machine, which is the only way to see those three without one.
   */
  private offlineNpcWindow = 0;

  /** MOVEMENT_TALK reached the NPC (ZzzInterface.cpp:3576): ask what it offers. */
  talkToNpc(npc: NpcTarget): void {
    if (Bag.pendingItemMove || this.npcShop) return;

    this.pendingNpcTalk = npc;
    // `ReceiveTalk` / `ReceiveQuestState` open with `HideAll`.
    EventBus.emit('npcTalkStarted', { npcType: npc.npcType });

    if (Session.isOffline) {
      const which = this.offlineNpcWindow++ % 3;
      // What the NpcWindowResponse handler plays for every window
      // (ReceiveTalk, WSclient.cpp:6563-6564).
      playUiSound('click');
      playUiSound('window');

      if (which === 1) {
        this.dropNpcTalk();
        this.offlineVault();
        return;
      }
      if (which === 2) {
        this.dropNpcTalk();
        this.offlineMix();
        return;
      }

      this.openNpcShop();
      this.setNpcShopItems(offlineShopStock());
      return;
    }

    // Reset OpenMU's dialog state first, every time: a talk that never produced a
    // window (or one closed without a CloseNpcRequest) leaves it in NpcDialogOpened,
    // and it ignores new talks until a CloseNpcRequest arrives.
    Session.sendToGS(CloseNpcRequestPacket.createPacket().buffer);
    const packet = TalkToNpcRequestPacket.createPacket();
    packet.NpcId = npc.netId;
    Session.sendToGS(packet.buffer);
  }

  /** NpcWindowResponse(Merchant): the shop opens, with the inventory beside it. */
  openNpcShop(): void {
    const npc = this.pendingNpcTalk;
    this.pendingNpcTalk = null;

    runInAction(() => {
      this.npcShop = {
        npcId: npc?.netId ?? 0,
        name: npc?.name ?? 'Merchant',
        npcType: npc?.npcType ?? 0,
        repairShop: npc ? REPAIR_NPC_TYPES.has(npc.npcType) : false,
        taxRate: this.storeTaxRate,
        items: new Array<Item | null>(SHOP_SLOTS).fill(null),
      };
      this.repairMode = false;
      MuWindows.setOpen('inventory', true);
    });
  }

  /** `CNewUINPCShop::SetTaxRate`: the open window and the next one take the new rate. */
  setStoreTaxRate(rate: number): void {
    this.storeTaxRate = rate;
    runInAction(() => {
      if (this.npcShop) this.npcShop.taxRate = rate;
    });
  }

  /** The server's answer came for something other than a merchant. */
  dropNpcTalk(): void {
    this.pendingNpcTalk = null;
  }

  /** StoreItemList: the merchant's stock, by slot in its 8×15 grid. */
  setNpcShopItems(entries: { slot: number; item: Item }[]): void {
    const shop = this.npcShop;
    if (!shop) return;

    runInAction(() => {
      const items = new Array<Item | null>(SHOP_SLOTS).fill(null);
      for (const entry of entries) {
        if (entry.slot >= 0 && entry.slot < SHOP_SLOTS) items[entry.slot] = entry.item;
      }
      shop.items = items;
    });
    // The icons start loading now, at high priority, not when the grid mounts.
    prefetchItemIcons(shop.items);
  }

  /** `ClosingProcess`: tell the server, drop the stock, leave repair mode. */
  closeNpcShop(): void {
    if (!this.npcShop) return;

    if (!Session.isOffline) {
      Session.sendToGS(CloseNpcRequestPacket.createPacket().buffer);
    }

    this.finishShopBuy();

    runInAction(() => {
      this.npcShop = null;
      this.repairMode = false;
    });
  }

  /** Click on a shop item (`SendBuyItemFromNpcRequest`). */
  buyItemFromNpc(shopSlot: number): void {
    const shop = this.npcShop;
    if (!shop || this.shopBuyPending || Bag.pickedItem || Bag.pendingItemMove) return;

    const item = shop.items[shopSlot];
    if (!item) return;

    runInAction(() => {
      this.shopBuyRefused = false;
    });

    if (Session.isOffline) {
      this.buyOffline(item);
      return;
    }

    const packet = BuyItemFromNpcRequestPacket.createPacket();
    packet.ItemSlot = shopSlot;
    Session.sendToGS(packet.buffer);

    runInAction(() => {
      this.shopBuyPending = true;
    });

    this.shopBuyTimer = setTimeout(() => this.finishShopBuy(), ITEM_MOVE_TIMEOUT);
  }

  /** ItemBought / NpcItemBuyFailed arrived (or nothing did in time). */
  finishShopBuy(): void {
    if (this.shopBuyTimer) {
      clearTimeout(this.shopBuyTimer);
      this.shopBuyTimer = null;
    }

    if (!this.shopBuyPending) return;

    runInAction(() => {
      this.shopBuyPending = false;
    });
  }

  /** NpcItemBuyFailed: nothing was bought and nothing was charged. */
  shopBuyFailed(): void {
    runInAction(() => {
      this.shopBuyRefused = true;
    });

    this.finishShopBuy();
    addNotification(t('notify.cannotBuy'), 'error');
  }

  /**
   * The carried item dropped onto the shop (`InventoryProcess`): sold, with
   * the original's two refusals - the money cap and the unsellable list.
   */
  sellPickedItemToNpc(): void {
    const picked = Bag.pickedItem;
    if (!picked || !this.npcShop || Bag.pendingItemMove) return;
    // `SendSellItemToNpcRequest` only knows inventory slots.
    if (picked.fromStorage !== StorageKind.Inventory) return;

    const price = itemValue(picked.item, 1);

    if (Hero.money + price > 2000000000) {
      addNotification(t('notify.zenCap'), 'error');
      return;
    }

    if (isSellingBanned(picked.item)) {
      addNotification(t('notify.cannotSell'), 'error');
      Bag.cancelPickedItem();
      return;
    }

    if (Session.isOffline) {
      runInAction(() => {
        Hero.money += price;
        Bag.pickedItem = null;
        Hero.syncPlayerAppearance();
      });
      playUiSound('getItem');
      return;
    }

    const packet = SellItemToNpcRequestPacket.createPacket();
    packet.ItemSlot = picked.fromSlot;

    Bag.beginItemMove(
      picked.fromStorage,
      picked.fromSlot,
      StorageKind.Inventory,
      -1
    );
    Session.sendToGS(packet.buffer);
  }

  /** NpcItemSellResult: the item is gone and the money is in - or neither. */
  itemSoldToNpc(success: boolean, money: number): void {
    if (!Bag.pendingItemMove) return;

    if (success) {
      Bag.confirmItemMove(-1, null);
      runInAction(() => {
        Hero.money = money;
      });
      // ReceiveSell (WSclient.cpp:6861).
      playUiSound('getItem');
      return;
    }

    Bag.rollbackItemMove();
    addNotification(t('notify.merchantRefuses'), 'error');
  }

  /** Whether a repair can be asked for here: a smith, or self-repair from 50. */
  get canRepair(): boolean {
    if (this.npcShop) return this.npcShop.repairShop;
    return Hero.level >= SELF_REPAIR_LEVEL;
  }

  /** Repairs through the inventory button cost 2.5× the smith's price. */
  get isSelfRepair(): boolean {
    return !this.npcShop?.repairShop;
  }

  /** The repair button / the L key (`ToggleState`, `SetRepairMode`). */
  toggleRepairMode(): void {
    runInAction(() => {
      this.repairMode = this.canRepair && !this.repairMode;
    });
  }

  /** `SendRepairItemRequest(slot, self)`; `REPAIR_ALL_SLOT` for everything. */
  repairItemRequest(slot: number): void {
    if (!this.canRepair || Bag.pendingItemMove) return;

    const selfRepair = this.isSelfRepair;

    if (slot !== REPAIR_ALL_SLOT) {
      const item = Hero.items[slot];
      if (!item || isRepairBanned(item)) return;
      if (!needsRepair(item)) return;
    }

    if (Session.isOffline) {
      this.repairOffline(slot, selfRepair);
      return;
    }

    const packet = RepairItemRequestPacket.createPacket();
    packet.ItemSlot = slot;
    packet.IsSelfRepair = selfRepair;
    Session.sendToGS(packet.buffer);
  }

  /** The smith's second button (`m_BtnRepairAll`). */
  repairAllRequest(): void {
    this.repairItemRequest(REPAIR_ALL_SLOT);
  }

  /** The price of a full repair, as the repair bar of the shop shows it. */
  get repairAllPrice(): number {
    return repairAllCost(Hero.items, this.isSelfRepair);
  }

  private buyOffline(item: Item): void {
    const price = itemValue(item, 0);
    if (Hero.money < price) {
      addNotification(t('common.notEnoughZen'), 'error');
      return;
    }

    const slot = findFreeInventorySlot(Hero.items, item);
    if (slot < 0) {
      addNotification(t('notify.noInventoryRoom'), 'error');
      return;
    }

    runInAction(() => {
      Hero.money -= price;
      Hero.items[slot] = { ...item };
    });
    playUiSound('getItem');
  }

  private repairOffline(slot: number, selfRepair: boolean): void {
    const slots =
      slot === REPAIR_ALL_SLOT
        ? Hero.items.map((_, i) => i)
        : [slot];

    let cost = 0;
    const repaired: Item[] = [];
    for (const i of slots) {
      const item = Hero.items[i];
      if (!item || !needsRepair(item)) continue;
      cost += repairCost(item, selfRepair);
      repaired.push(item);
    }

    if (repaired.length === 0) return;
    if (Hero.money < cost) {
      addNotification(t('common.notEnoughZen'), 'error');
      return;
    }

    runInAction(() => {
      Hero.money -= cost;
      for (const item of repaired) {
        const def = itemDef(item.group, item.num);
        if (!def) continue;
        item.durability = calcMaxDurability(
          def,
          item.lvl ?? 0,
          item.isExcellent === true,
          item.isAncient === true
        );
      }
    });
    playUiSound('repair');
  }

  private offlineVault(): void {
    Economy.openVault();
  }

  private offlineMix(): void {
    Economy.openMix();
  }

  constructor() {
    makeObservable(this, {
      npcShop: observable,
      repairMode: observable,
      shopBuyPending: observable,
      shopBuyRefused: observable,
      canRepair: computed,
    });

    // `HideAll` on the inventory hides the shop with it, and the repair
    // cursor never outlives the window it belongs to.
    reaction(
      () => MuWindows.isOpen('inventory'),
      enabled => {
        if (enabled) return;
        this.closeNpcShop();
        runInAction(() => {
          this.repairMode = false;
        });
      }
    );

    // OpenMU refuses any consume unless PlayerState == EnteredWorld: a merchant
    // window still open makes a scroll / potion fail. The original closes the shop on the use click.
    Bag.beforeConsume = () => {
      if (this.npcShop) this.closeNpcShop();
    };
  }
})();
