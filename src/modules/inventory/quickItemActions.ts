import { reaction } from 'mobx';
import { t } from '../../i18n';
import { Merchant } from '../npc_shop';
import { Bag } from './state';
import { Hero } from '../hero';
import { Session } from '../session';
import { addNotification } from '../chat';
import { MsgBox } from '../../controllers/interface';
import { Economy } from '../economy/economy';
import { GameOptions } from '@/controllers/settings';
import { StorageKind } from './itemStorage';
import { itemValue } from '@/controllers/item_rules';
import { itemDisplayName } from '../../controllers/interface/itemTooltip';
import { MsgWinCode } from '../../controllers/interface/msgWin';
import {
  buyRunStop,
  inventoryTarget,
  isValuableItem,
  MAX_BULK_BUY,
  type BuyStop,
} from './quickItemRules';
import type { Item } from '../../ecs/world';

/**
 * Ctrl-click transfers, the shop's bulk buy, and the yes/no before a valuable
 * item leaves for good.
 *
 * One writer: a grid reports which square was Ctrl-clicked and decides
 * nothing. Where the item goes is worked out in `quickItemRules.ts` from the
 * windows that are open, and it travels by the requests a drag or a shop
 * click already sends (`autoMoveItem`, `sellPickedItemToNpc`,
 * `buyItemFromNpc`), through the one-move-in-flight guard
 * `Bag.pendingItemMove`. Nothing new goes on the wire.
 */

export const QuickItemActions = new (class _QuickItemActions {
  private run: { slot: number; wanted: number; bought: number } | null = null;
  private disposers: (() => void)[] = [];

  get buying(): boolean {
    return this.run !== null;
  }

  // --- Ctrl-click transfers ------------------------------------------------

  /** Ctrl-click on an inventory square. */
  fromInventory(slot: number): void {
    if (!GameOptions.quickItemActions) return;
    if (Bag.pickedItem || Bag.pendingItemMove) return;

    const item = Hero.items[slot];
    if (!item) return;

    const target = inventoryTarget({
      storage: Economy.autoMoveTarget,
      shop: !!Merchant.npcShop,
    });
    if (!target) return;

    if (target.kind === 'move') {
      Bag.autoMoveItem(StorageKind.Inventory, slot, target.to);
      return;
    }

    this.confirm(item, MsgWinCode.ConfirmSellItem, () => this.sellSlot(slot));
  }

  /** Ctrl-click in the vault, the trade grid or the mix tray: send it back. */
  toInventory(storage: StorageKind, slot: number): void {
    if (!GameOptions.quickItemActions) return;

    Bag.autoMoveItem(storage, slot, StorageKind.Inventory);
  }

  // --- selling and dropping ------------------------------------------------

  /** The carried item let go over the merchant's grid. */
  sellPickedItem(): void {
    const item = Bag.pickedItem?.item;
    if (!item) return;

    this.confirm(item, MsgWinCode.ConfirmSellItem, () =>
      Merchant.sellPickedItemToNpc()
    );
  }

  /** The carried item let go over the ground (`itemPickupSystem`). */
  dropPickedItem(x: number, y: number): void {
    const item = Bag.pickedItem?.item;
    if (!item) return;

    this.confirm(item, MsgWinCode.ConfirmDropItem, () =>
      Bag.dropPickedItem(x, y)
    );
  }

  private sellSlot(slot: number): void {
    if (!Merchant.npcShop || Bag.pickedItem || Bag.pendingItemMove) return;

    Bag.pickInventoryItem(slot);
    if (!Bag.pickedItem) return;

    Merchant.sellPickedItemToNpc();

    // A refusal leaves the item hanging off the cursor: put it back.
    if (Bag.pickedItem && !Bag.pendingItemMove) Bag.cancelPickedItem();
  }

  private confirm(item: Item, code: MsgWinCode, go: () => void): void {
    if (!GameOptions.confirmValuableItems || !isValuableItem(item)) {
      go();
      return;
    }

    MsgBox.popUpMsgWin(code, itemDisplayName(item), go);
  }

  // --- bulk buy ------------------------------------------------------------

  /** Ctrl-click on a shop entry: ask how many. */
  promptBuy(slot: number): void {
    if (!GameOptions.quickItemActions) return;
    if (!Merchant.npcShop?.items[slot]) return;

    Economy.openPrompt({ kind: 'npc-buy-many', slot });
  }

  /** The answered quantity: buy that many, one purchase in flight. */
  startBuyRun(slot: number, count: number): void {
    this.cancel();

    if (!Merchant.npcShop?.items[slot]) return;

    const wanted = Math.max(1, Math.min(MAX_BULK_BUY, Math.trunc(count) || 0));
    this.run = { slot, wanted, bought: 0 };

    this.disposers.push(
      reaction(
        () => Merchant.shopBuyPending || !!Bag.pendingItemMove,
        busy => {
          if (!busy) this.step();
        }
      ),
      // The player picking something up takes the shop over: the run stops,
      // exactly as the arrange and bulk-move runs do.
      reaction(
        () => !!Bag.pickedItem,
        picked => {
          if (picked) this.cancel();
        }
      )
    );

    this.step();
  }

  cancel(): void {
    for (const dispose of this.disposers) dispose();
    this.disposers = [];
    this.run = null;
  }

  private step(): void {
    const run = this.run;
    if (!run) return;
    if (Merchant.shopBuyPending || Bag.pendingItemMove) return;
    if (Bag.pickedItem) {
      this.cancel();
      return;
    }

    const item = Merchant.npcShop?.items[run.slot] ?? null;

    const stop = buyRunStop({
      bought: run.bought,
      wanted: run.wanted,
      item,
      price: item ? itemValue(item, 0) : 0,
      money: Hero.money,
      freeSquare: item ? Bag.findFreeSquare(StorageKind.Inventory, item) : -1,
      refused: Merchant.shopBuyRefused,
    });

    if (stop) {
      this.finish(stop, run.bought);
      return;
    }

    run.bought++;
    Merchant.buyItemFromNpc(run.slot);

    // Offline there is no answer to wait for, so the loop runs itself.
    if (Session.isOffline) this.step();
  }

  private finish(stop: BuyStop, bought: number): void {
    this.cancel();

    if (bought > 0) {
      addNotification(t('notify.itemsBought', { count: bought }));
    }

    if (stop === 'noRoom') {
      addNotification(t('notify.noInventoryRoom'), 'error');
    } else if (stop === 'noZen') {
      addNotification(t('common.notEnoughZen'), 'error');
    }
  }
})();
