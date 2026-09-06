import { reaction } from 'mobx';
import { t } from '../i18n';
import { Store } from '../store';
import { gridFirstIndex, StorageKind, storageColumns, storageRows } from './itemStorage';
import type { Item } from '../ecs/world';

/**
 * "Send all of these over there": the loop behind the vault's jewel button.
 *
 * Same shape as the auto-arrange run (`inventorySort.ts`) and for the same
 * reason - the server owns both grids and answers one move at a time - so
 * this walks the source grid, hands one item to `Store.autoMoveItem` per
 * answered move, and stops when the far grid is full or nothing matches.
 */

const MAX_MOVES = 120;

export const BulkMove = new (class _BulkMove {
  private from: StorageKind = StorageKind.Inventory;
  private to: StorageKind = StorageKind.Vault;
  private wanted: ((item: Item) => boolean) | null = null;
  private moves = 0;
  private stop: (() => void) | null = null;

  get running(): boolean {
    return this.wanted !== null;
  }

  start(from: StorageKind, to: StorageKind, wanted: (item: Item) => boolean): void {
    if (this.running) {
      this.cancel();
      return;
    }
    if (Store.pickedItem || Store.pendingItemMove) return;

    this.from = from;
    this.to = to;
    this.wanted = wanted;
    this.moves = 0;

    this.stop = reaction(
      () => Store.pendingItemMove === null,
      idle => {
        if (idle) this.step();
      }
    );

    this.step();
  }

  cancel(): void {
    this.stop?.();
    this.stop = null;
    this.wanted = null;
  }

  private step(): void {
    const wanted = this.wanted;
    if (!wanted) return;
    if (Store.pickedItem || Store.pendingItemMove) return;

    if (this.moves >= MAX_MOVES) {
      this.cancel();
      return;
    }

    const slot = this.nextSlot(wanted);
    if (slot < 0) {
      const moved = this.moves;
      this.cancel();
      if (moved > 0) Store.addNotification(t('notify.itemsMoved', { count: moved }));
      return;
    }

    const item = Store.itemsOfStorage(this.from)[slot];
    if (!item || Store.findFreeSquare(this.to, item) < 0) {
      this.cancel();
      Store.addNotification(t('notify.noRoomForItem'), 'error');
      return;
    }

    this.moves++;
    Store.autoMoveItem(this.from, slot, this.to);
    if (Store.isOffline) this.step();
  }

  private nextSlot(wanted: (item: Item) => boolean): number {
    const items = Store.itemsOfStorage(this.from);
    const first = gridFirstIndex(this.from);
    const count = storageColumns(this.from) * storageRows(this.from);

    for (let square = 0; square < count; square++) {
      const item = items[first + square];
      if (item && wanted(item)) return first + square;
    }

    return -1;
  }
})();
