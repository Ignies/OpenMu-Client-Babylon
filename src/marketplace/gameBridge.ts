import { autorun } from 'mobx';
import { Store } from '../store';
import { InventoryConstants } from '../common/inventoryConstants';
import { buildEscrowRequest, parseEscrowResult, type EscrowResult } from '../common/escrowWire';
import { t } from '../i18n';
import { Marketplace, type BagEntry } from './state';

/**
 * The one place the marketplace touches the game.
 *
 * `state.ts` deliberately knows nothing about `Store`, so the window can be
 * mounted on its own (`marketplace.html`) without the packet layer or the
 * world behind it. This module is the adapter, in both directions: it reads
 * the live Zen and bag and pushes them in, and it carries escrow tokens to
 * the game server and the result packets back.
 */
function bagEntries(): BagEntry[] {
  const items = Store.playerData.items;
  const start = InventoryConstants.EquippableSlotsCount;
  const out: BagEntry[] = [];
  for (let slot = start; slot < items.length; slot++) {
    const item = items[slot];
    if (item) out.push({ item, slot });
  }
  return out;
}

export function syncMarketplaceFromGame(): void {
  Marketplace.syncFromGame(Store.playerData.money, bagEntries(), Store.playerData.name);
}

export function toggleMarketplace(): void {
  if (!Marketplace.open) syncMarketplaceFromGame();
  Marketplace.toggle();
}

// Kept current while the window is open: a list takes the item out of the
// bag and a buy changes the wallet, both through the ordinary inventory
// packets. Read once at opening, both were stale until the window was
// closed and reopened.
autorun(() => {
  if (!Marketplace.open) return;
  syncMarketplaceFromGame();
});

// ---- escrow ----------------------------------------------------------------

/** The game server has this long to answer a token before the window gives up. */
export const ESCROW_TIMEOUT_MS = 15_000;

type Waiter = {
  resolve: (result: EscrowResult) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

/** One outstanding request per listing; the result packet names the listing. */
const waiting = new Map<string, Waiter>();

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0 || /[^0-9a-f]/i.test(hex)) throw new Error('escrow token is not hex');
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function settle(listingId: string): Waiter | undefined {
  const key = listingId.toLowerCase();
  const waiter = waiting.get(key);
  if (waiter) {
    waiting.delete(key);
    clearTimeout(waiter.timer);
  }
  return waiter;
}

/**
 * Sends a token to the game server and resolves with the result packet that
 * names the same listing. Rejects at once when there is no game socket, and
 * after `ESCROW_TIMEOUT_MS` without an answer: the service's own sweep reads
 * the box later, so nothing is lost, only unreported.
 */
export function sendEscrow(tokenHex: string, listingId: string): Promise<EscrowResult> {
  if (Store.isOffline || Store.gsSocket?.readyState !== WebSocket.OPEN) {
    return Promise.reject(new Error(t('marketplace.notConnected')));
  }

  const packet = buildEscrowRequest(hexToBytes(tokenHex));

  return new Promise<EscrowResult>((resolve, reject) => {
    // A second token for the same listing supersedes the first: the server
    // answers each, but only the newest answer is the one being waited on.
    settle(listingId)?.reject(new Error(t('marketplace.noAnswer')));

    const timer = setTimeout(() => {
      settle(listingId);
      reject(new Error(t('marketplace.noAnswer')));
    }, ESCROW_TIMEOUT_MS);

    waiting.set(listingId.toLowerCase(), { resolve, reject, timer });
    Store.sendToGS(new DataView(packet.buffer, packet.byteOffset, packet.byteLength));
  });
}

/** `MarketplaceEscrowResult` (C1 E7 02), the whole packet with its header. */
export function onEscrowResultPacket(bytes: Uint8Array): void {
  const result = parseEscrowResult(bytes);
  if (!result) {
    console.warn('marketplace: malformed escrow result', bytes);
    return;
  }
  const waiter = settle(result.listingId);
  if (!waiter) {
    console.warn(`marketplace: escrow result for ${result.listingId} nobody was waiting for`, result);
    return;
  }
  waiter.resolve(result);
}

Marketplace.attach({ bridge: { send: sendEscrow } });
