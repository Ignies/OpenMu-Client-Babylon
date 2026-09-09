import type { Item } from '../ecs/world';
import { Store } from '../store';
import { InventoryConstants } from '../common/inventoryConstants';
import { Marketplace } from './state';

/**
 * The one place the marketplace touches the game.
 *
 * `state.ts` deliberately knows nothing about `Store`, so the window can be
 * mounted on its own (`marketplace.html`) without the packet layer or the
 * world behind it. This module is the adapter: it reads the live Zen and bag
 * and pushes them in.
 */
function bagItems(): Item[] {
  const items = Store.playerData.items;
  const start = InventoryConstants.EquippableSlotsCount;
  const out: Item[] = [];
  for (let i = start; i < items.length; i++) {
    const item = items[i];
    if (item) out.push(item);
  }
  return out;
}

export function syncMarketplaceFromGame(): void {
  Marketplace.syncFromGame(Store.playerData.money, bagItems(), Store.playerData.name);
}

export function toggleMarketplace(): void {
  if (!Marketplace.open) syncMarketplaceFromGame();
  Marketplace.toggle();
}
