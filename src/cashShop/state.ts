import { observable, runInAction } from 'mobx';
import { JEWEL, JEWEL_GROUP } from '../common/jewelUpgrade';
import type { Item } from '../ecs/world';

/**
 * Cash shop state: the catalogue, which tab is up, and the last gacha roll.
 *
 * The wallet is *not* here. It is counted straight off `Store.playerData.items`
 * on read, because the client already holds the authoritative inventory - the
 * one the server sent it - and a count taken from that is exact and live. The
 * shop's own API can only ever see the player's last save, which is a minute
 * stale while they are online; asking it for a number the client already knows
 * would be strictly worse.
 *
 * Nothing here can spend anything. Ordering lands with the delivery queue.
 */

export interface Product {
  id: string;
  line: string;
  name: string;
  group: number | null;
  number: number | null;
  level: number;
  width: number;
  height: number;
  bless: number;
  soul: number;
  dailyCap: number;
  note?: string;
}

export interface Line {
  id: string;
  label: string;
}

export interface Roll {
  seed: number;
  group: number;
  num: number;
  name: string;
  slot: string;
  width: number;
  height: number;
  level: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  excellent: true;
  options: string[];
}

type Loading = 'idle' | 'loading' | 'ready' | 'failed';

export const CashShopState = observable({
  windowOpen: false,
  tab: 'wings',
  catalogue: [] as Product[],
  lines: [] as Line[],
  status: 'idle' as Loading,
  error: null as string | null,

  /** The gacha stage. `rolling` is the charge; the roll lands when it ends. */
  rolling: false,
  roll: null as Roll | null,
});

/**
 * Where the shop service answers.
 *
 * Relative by default: Caddy publishes the service under `/api` on the
 * client's own host, so there is no second origin and no CORS. Point it at a
 * host of its own (`https://api.example.net/api`) and that service has to
 * name this origin in `CORS_ORIGIN`.
 */
const API = import.meta.env.VITE_CASHSHOP_API || '/api';

async function get<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    // Nothing here is cookie-authenticated, and asking for credentials on a
    // cross-origin call would only add a CORS requirement for no gain.
    credentials: 'omit',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error((body as { error?: string }).error ?? `HTTP ${response.status}`);
  }

  return body as T;
}

/** Loads the catalogue once. Safe to call on every open. */
export async function ensureCatalogue(): Promise<void> {
  if (CashShopState.status === 'loading' || CashShopState.status === 'ready') return;

  runInAction(() => {
    CashShopState.status = 'loading';
    CashShopState.error = null;
  });

  try {
    const answer = await get<{ lines: Line[]; products: Product[] }>('/catalog');

    runInAction(() => {
      CashShopState.lines = answer.lines;
      CashShopState.catalogue = answer.products;
      CashShopState.status = 'ready';
    });
  } catch (error) {
    runInAction(() => {
      CashShopState.status = 'failed';
      CashShopState.error = error instanceof Error ? error.message : 'Shop is unreachable.';
    });
  }
}

export function toggleCashShopWindow(open?: boolean): void {
  runInAction(() => {
    CashShopState.windowOpen = open ?? !CashShopState.windowOpen;
  });

  if (CashShopState.windowOpen) void ensureCatalogue();
}

/** How long the orb charges before the roll is shown. */
const CHARGE_MS = 1900;

/**
 * The roll is the server's - the same seeded draw fulfilment will run - so the
 * window only decides how to show it. The charge and the request are awaited
 * together, so a fast answer still gets the full build-up.
 */
export async function rollGacha(): Promise<void> {
  if (CashShopState.rolling) return;

  runInAction(() => {
    CashShopState.rolling = true;
    CashShopState.roll = null;
    CashShopState.error = null;
  });

  try {
    const [answer] = await Promise.all([
      get<{ roll: Roll }>('/gacha/preview', { method: 'POST' }),
      new Promise(resolve => setTimeout(resolve, CHARGE_MS)),
    ]);

    runInAction(() => {
      CashShopState.roll = answer.roll;
      CashShopState.rolling = false;
    });
  } catch (error) {
    runInAction(() => {
      CashShopState.rolling = false;
      CashShopState.error = error instanceof Error ? error.message : 'Shop is unreachable.';
    });
  }
}

/* ----------------------------------------------------------------- wallet */

function countJewel(items: readonly (Item | null)[], num: number): number {
  let count = 0;

  for (const item of items) {
    if (item && item.group === JEWEL_GROUP && item.num === num) count++;
  }

  return count;
}

/**
 * Bless and Soul the player is carrying right now.
 *
 * Inventory only: the vault is not loaded into the client unless it is open,
 * so counting it here would show zero for anyone who banks their jewels, which
 * is worse than saying plainly that this is what is on the character.
 */
export function walletOnHand(items: readonly (Item | null)[]): {
  bless: number;
  soul: number;
} {
  return { bless: countJewel(items, JEWEL.bless), soul: countJewel(items, JEWEL.soul) };
}
