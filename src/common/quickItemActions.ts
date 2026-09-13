import { reaction } from 'mobx';
import { t } from '../i18n';
import { Store } from '../store';
import { Economy } from '../economy';
import { GameOptions } from './gameOptions';
import { StorageKind } from './itemStorage';
import { itemValue } from './itemValue';
import { itemDisplayName } from './itemTooltip';
import { MsgWinCode } from './msgWin';
import {
  buyRunStop,
  inventoryTarget,
  isValuableItem,
  MAX_BULK_BUY,
  type BuyStop,
} from './quickItemRules';
import type { Item } from '../ecs/world';

/**
 * Ctrl-click transfers, the shop's bulk buy, and the yes/no before a valuable
 * item leaves for good.
 *
 * One writer: a grid reports which square was Ctrl-clicked and decides
 * nothing. Where the item goes is worked out in `quickItemRules.ts` from the
 * windows that are open, and it travels by the requests a drag or a shop
 * click already sends (`autoMoveItem`, `sellPickedItemToNpc`,
 * `buyItemFromNpc`), through the one-move-in-flight guard
 * `Store.pendingItemMove`. Nothing new goes on the wire.
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
    if (Store.pickedItem || Store.pendingItemMove) return;

    const item = Store.playerData.items[slot];
    if (!item) return;

    const target = inventoryTarget({
      storage: Economy.autoMoveTarget,
      shop: !!Store.npcShop,
    });
    if (!target) return;

    if (target.kind === 'move') {
      Store.autoMoveItem(StorageKind.Inventory, slot, target.to);
      return;
    }

    this.confirm(item, MsgWinCode.ConfirmSellItem, () => this.sellSlot(slot));
  }

  /** Ctrl-click in the vault, the trade grid or the mix tray: send it back. */
  toInventory(storage: StorageKind, slot: number): void {
    if (!GameOptions.quickItemActions) return;

    Store.autoMoveItem(storage, slot, StorageKind.Inventory);
  }

  // --- selling and dropping ------------------------------------------------

  /** The carried item let go over the merchant's grid. */
  sellPickedItem(): void {
    const item = Store.pickedItem?.item;
    if (!item) return;

    this.confirm(item, MsgWinCode.ConfirmSellItem, () =>
      Store.sellPickedItemToNpc()
    );
  }

  /** The carried item let go over the ground (`itemPickupSystem`). */
  dropPickedItem(x: number, y: number): void {
    const item = Store.pickedItem?.item;
    if (!item) return;

    this.confirm(item, MsgWinCode.ConfirmDropItem, () =>
      Store.dropPickedItem(x, y)
    );
  }

  private sellSlot(slot: number): void {
    if (!Store.npcShop || Store.pickedItem || Store.pendingItemMove) return;

    Store.pickInventoryItem(slot);
    if (!Store.pickedItem) return;

    Store.sellPickedItemToNpc();

    // A refusal leaves the item hanging off the cursor: put it back.
    if (Store.pickedItem && !Store.pendingItemMove) Store.cancelPickedItem();
  }

  private confirm(item: Item, code: MsgWinCode, go: () => void): void {
    if (!GameOptions.confirmValuableItems || !isValuableItem(item)) {
      go();
      return;
    }

    Store.popUpMsgWin(code, itemDisplayName(item), go);
  }

  // --- bulk buy ------------------------------------------------------------

  /** Ctrl-click on a shop entry: ask how many. */
  promptBuy(slot: number): void {
    if (!GameOptions.quickItemActions) return;
    if (!Store.npcShop?.items[slot]) return;

    Economy.openPrompt({ kind: 'npc-buy-many', slot });
  }

  /** The answered quantity: buy that many, one purchase in flight. */
  startBuyRun(slot: number, count: number): void {
    this.cancel();

    if (!Store.npcShop?.items[slot]) return;

    const wanted = Math.max(1, Math.min(MAX_BULK_BUY, Math.trunc(count) || 0));
    this.run = { slot, wanted, bought: 0 };

    this.disposers.push(
      reaction(
        () => Store.shopBuyPending || !!Store.pendingItemMove,
        busy => {
          if (!busy) this.step();
        }
      ),
      // The player picking something up takes the shop over: the run stops,
      // exactly as the arrange and bulk-move runs do.
      reaction(
        () => !!Store.pickedItem,
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
    if (Store.shopBuyPending || Store.pendingItemMove) return;
    if (Store.pickedItem) {
      this.cancel();
      return;
    }

    const item = Store.npcShop?.items[run.slot] ?? null;

    const stop = buyRunStop({
      bought: run.bought,
      wanted: run.wanted,
      item,
      price: item ? itemValue(item, 0) : 0,
      money: Store.playerData.money,
      freeSquare: item ? Store.findFreeSquare(StorageKind.Inventory, item) : -1,
      refused: Store.shopBuyRefused,
    });

    if (stop) {
      this.finish(stop, run.bought);
      return;
    }

    run.bought++;
    Store.buyItemFromNpc(run.slot);

    // Offline there is no answer to wait for, so the loop runs itself.
    if (Store.isOffline) this.step();
  }

  private finish(stop: BuyStop, bought: number): void {
    this.cancel();

    if (bought > 0) {
      Store.addNotification(t('notify.itemsBought', { count: bought }));
    }

    if (stop === 'noRoom') {
      Store.addNotification(t('notify.noInventoryRoom'), 'error');
    } else if (stop === 'noZen') {
      Store.addNotification(t('common.notEnoughZen'), 'error');
    }
  }
})();
