import { HIGH_DROP_LEVEL } from './dropTier';
import { StorageKind } from './itemStorage';
import { isJewel, itemDef } from './itemStats';
import type { Item } from '../ecs/world';

/**
 * The decisions behind the Ctrl-click actions (`quickItemActions.ts`): where
 * an item goes, whether it is worth asking about first, and when a bulk buy
 * stops.
 *
 * Kept apart from the run itself, the way `inventoryLayout` is kept apart
 * from `inventorySort`: this half is pure, so it can be reasoned about (and
 * tested) without a store, a socket or a server.
 */

/** Upper bound on one bulk buy, the same order as the arrange run's. */
export const MAX_BULK_BUY = 120;

export type QuickTarget =
  | { kind: 'move'; to: StorageKind }
  | { kind: 'sell' };

export type OpenWindows = {
  /** `Economy.autoMoveTarget`: the storage grid a right click already feeds. */
  storage: StorageKind | null;
  /** `Store.npcShop`: the merchant's stall is open. */
  shop: boolean;
};

/**
 * Where a Ctrl-click in the inventory sends the item. A storage window wins
 * over the merchant when both are somehow up: a move can be undone, a sale
 * cannot.
 */
export function inventoryTarget(open: OpenWindows): QuickTarget | null {
  if (open.storage !== null) return { kind: 'move', to: open.storage };
  if (open.shop) return { kind: 'sell' };
  return null;
}

/** Excellent, ancient, +7 and up, or a jewel: worth asking about first. */
export function isValuableItem(item: Item): boolean {
  if (item.isExcellent || item.isAncient) return true;
  if ((item.lvl ?? 0) >= HIGH_DROP_LEVEL) return true;

  const def = itemDef(item.group, item.num);
  return !!def && isJewel(def);
}

export type BuyStop = 'done' | 'gone' | 'refused' | 'noZen' | 'noRoom';

export type BuyRunState = {
  bought: number;
  wanted: number;
  /** The stock entry still in that shop slot, or null once it is gone. */
  item: Item | null;
  price: number;
  money: number;
  /** `Store.findFreeSquare` on the inventory; -1 when nothing fits. */
  freeSquare: number;
  /** The merchant said no to the last purchase. */
  refused: boolean;
};

/** Why the bulk buy stops before the next purchase, or null to carry on. */
export function buyRunStop(state: BuyRunState): BuyStop | null {
  if (state.refused) return 'refused';
  if (state.bought >= state.wanted) return 'done';
  if (!state.item) return 'gone';
  if (state.money < state.price) return 'noZen';
  if (state.freeSquare < 0) return 'noRoom';
  return null;
}
