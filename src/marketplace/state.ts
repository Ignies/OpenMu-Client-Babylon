import { makeAutoObservable, runInAction } from 'mobx';
import * as realApi from './api';
import { MarketError, type HistoryEntry } from './api';
import { CATEGORIES, categoryOf, displayName, type CategoryId } from './categories';
import { isOnSale, mergeCatalogue } from './catalogue';
import { buildMockListings, type Listing } from './mockListings';
import type { EscrowResult, EscrowStatusName } from '../common/escrowWire';
import type { Item } from '../ecs/world';
import { i18n, t, type TextKey } from '../i18n';

export type Tab = 'browse' | 'mine' | 'sell' | 'history';
export type Sort = 'newest' | 'price-asc' | 'price-desc' | 'deal';
export type View = 'list' | 'grid';

export const SORTS: { id: Sort; labelKey: TextKey }[] = [
  { id: 'newest', labelKey: 'marketplace.sort.newest' },
  { id: 'price-asc', labelKey: 'marketplace.sort.priceAsc' },
  { id: 'price-desc', labelKey: 'marketplace.sort.priceDesc' },
  { id: 'deal', labelKey: 'marketplace.sort.deal' },
];

export const PAGE_SIZE_GRID = 12;
export const PAGE_SIZE_LIST = 10;

/** An item in the bag with the slot it sits in, which is what a listing names. */
export type BagEntry = { item: Item; slot: number };

/** The service, as the store calls it. The real one is `./api`; tests and the harness swap it. */
export type MarketApi = Pick<
  typeof realApi,
  'browse' | 'mine' | 'history' | 'list' | 'settle' | 'claim' | 'release' | 'cancel' | 'payout' | 'settlePayout'
>;

/** The game, as the store needs it: a token in, the server's answer out. */
export type EscrowBridge = {
  send(tokenHex: string, listingId: string): Promise<EscrowResult>;
};

export type MarketDeps = { api: MarketApi; bridge: EscrowBridge };

const noBridge: EscrowBridge = {
  send: () => Promise.reject(new Error(t('marketplace.notConnected'))),
};

/** The game server's answer, in the player's words. Null for `ok`. */
export function escrowStatusText(status: EscrowStatusName): string | null {
  if (status === 'ok') return null;
  return t(`marketplace.escrow.${status}` as TextKey);
}

/**
 * Marketplace window state.
 *
 * Deliberately imports no `Store`: the window must be mountable on its own so
 * it can be looked at without a game session (see `marketplace.html`). What it
 * needs from the game - the player's Zen and their bag - is pushed in from
 * the world page, and what it sends to the game goes through a bridge the
 * world page installs (`gameBridge.ts`).
 *
 * Every commit is the same three steps: ask the service for a token, hand the
 * token to the game server and wait for its result, then tell the service to
 * settle. The item and the Zen move in the player's own session, so the bag
 * and the wallet here follow through the ordinary inventory packets.
 */
export class MarketplaceStore {
  open = false;
  tab: Tab = 'browse';
  category: CategoryId = 'all';
  search = '';
  sort: Sort = 'newest';
  /**
   * Opens on the list every time, deliberately not remembered: the list is
   * the view that answers "what is for sale and what does it cost", and the
   * grid is for browsing by eye.
   */
  view: View = 'list';
  page = 0;
  excellentOnly = false;
  affordableOnly = false;

  /** Pushed in by the world page; the dev harness sets its own. */
  zen = 0;
  /** What the player could put up for sale. Pushed in the same way. */
  inventory: BagEntry[] = [];
  /** The character the tokens are minted for. Pushed in from the world page. */
  characterName = '';

  /**
   * Empty until a service fills it.
   *
   * The fixtures are for looking at the window, and they must never reach a
   * player: every one of them is invented, so a live build would offer things
   * nobody is selling and take fake Zen for them. Development builds and the
   * standalone harness seed them explicitly instead.
   */
  listings: Listing[] = [];

  /** The card the pointer is over, for the tooltip. */
  hovered: { id: string; x: number; y: number } | null = null;
  /** A purchase the player has clicked but not confirmed. */
  confirming: Listing | null = null;
  /** Set for a moment after an action, so the window can say how it went. */
  flash: string | null = null;
  /** Zen from sales waiting to be collected, as the service sums it. */
  payoutOwed = 0;
  /** What happened to this player's listings, purchases and payouts, newest first. */
  history: HistoryEntry[] = [];
  /** A commit is in flight: the buttons that would start another wait. */
  busy = false;

  /** Sell tab: which bag entry is picked, and the price typed for it. */
  sellPick: number | null = null;
  sellPrice = '';

  private deps: MarketDeps = { api: realApi, bridge: noBridge };

  constructor() {
    makeAutoObservable<this, 'deps'>(this, { deps: false });
    if (APP_STAGE === 'dev') this.seedFixtures();
  }

  /** Swaps the service or the game out: the world page, the harness, a test. */
  attach(deps: Partial<MarketDeps>): void {
    this.deps = { ...this.deps, ...deps };
  }

  /** Fills the catalogue with invented listings. Never call this in a live build. */
  seedFixtures(): void {
    this.listings = buildMockListings();
    // A few invented rows for the history tab, one of each kind and status.
    const kinds = ['sale', 'purchase', 'payout', 'sale', 'sale', 'purchase'] as const;
    const statuses = ['success', 'failed', 'pending', 'pending', 'success', 'failed'] as const;
    const notes = ['sold to Faelan', 'no room in the bag', 'waiting to be collected', 'not sold yet', 'sold to Xanthe', 'somebody else got it'];
    this.history = this.listings.slice(0, 6).map((l, i) => ({
      id: `H${i}`,
      kind: kinds[i],
      item: kinds[i] === 'payout' ? null : l.item,
      zen: kinds[i] === 'payout' ? 12_500_000 : l.price,
      status: statuses[i],
      note: notes[i],
      at: Date.now() - i * 3_600_000 * 5,
    }));
  }

  /** Pulls the history from the service. */
  async loadHistory(): Promise<void> {
    if (this.mode === 'offline') return;
    try {
      const { history } = await this.deps.api.history();
      runInAction(() => {
        this.history = history;
      });
    } catch {
      // The catalogue's own refresh reports the service being away.
    }
  }

  /** No listings at all, as opposed to none matching the current filters. */
  get isEmpty(): boolean {
    return this.listings.length === 0;
  }

  /**
   * Whether a service is answering.
   *
   * `live` is the real marketplace. `offline` is a development build with
   * nothing running behind it, where the fixtures stand and the actions edit
   * them locally. A live build that cannot reach the service stays `live`
   * with an empty catalogue rather than inventing one.
   */
  mode: 'unknown' | 'live' | 'offline' = 'unknown';
  /** Set when the service refuses or cannot be reached, for the window to show. */
  problem: string | null = null;
  loading = false;

  toggle(): void {
    this.open = !this.open;
    if (this.open) {
      this.page = 0;
      void this.refresh();
    } else {
      this.closeTransients();
    }
  }

  /**
   * Pulls the catalogue and this player's own listings from the service.
   *
   * The window shows what the service holds and nothing else: no optimistic
   * rows, no local edits that survive a reload. Every action below re-reads
   * rather than patching state, because the service is the only thing that
   * knows what the game database says about a box.
   */
  async refresh(): Promise<void> {
    if (this.mode === 'offline') return;

    runInAction(() => {
      this.loading = true;
    });

    try {
      const [catalogue, own] = await Promise.all([
        this.deps.api.browse({ limit: 200 }),
        this.deps.api.mine(),
      ]);
      runInAction(() => {
        this.mode = 'live';
        this.problem = null;
        this.listings = mergeCatalogue(catalogue.listings, own.listings);
        this.payoutOwed = own.balance;
        this.loading = false;
      });
      if (this.tab === 'history') await this.loadHistory();
    } catch (error) {
      runInAction(() => {
        this.loading = false;
        // In a development build the fixtures are the point, so a service that
        // is not running is not an error - it is the harness.
        if (APP_STAGE === 'dev' && this.listings.length > 0) {
          this.mode = 'offline';
          return;
        }
        this.mode = 'live';
        this.problem = error instanceof Error ? error.message : t('marketplace.unreachable');
      });
    }
  }

  close(): void {
    this.open = false;
    this.closeTransients();
  }

  private closeTransients(): void {
    this.hovered = null;
    this.confirming = null;
  }

  setTab(tab: Tab): void {
    // The sell tab shares the category rail, but it opens on everything you
    // carry: arriving at it with a bag filtered to whatever you last browsed
    // reads as an empty bag.
    if (tab === 'sell') this.category = 'all';
    this.tab = tab;
    this.page = 0;
    this.confirming = null;
    if (tab === 'history') void this.loadHistory();
  }

  setCategory(category: CategoryId): void {
    this.category = category;
    this.page = 0;
  }

  setSearch(search: string): void {
    this.search = search;
    this.page = 0;
  }

  setSort(sort: Sort): void {
    this.sort = sort;
    this.page = 0;
  }

  setView(view: View): void {
    if (this.view === view) return;
    // Keep the player roughly where they were rather than snapping to page 1:
    // the two views hold different numbers of listings per page.
    const firstIndex = this.page * this.pageSize;
    this.view = view;
    this.page = Math.floor(firstIndex / this.pageSize);
    this.setPage(this.page);
  }

  get pageSize(): number {
    return this.view === 'grid' ? PAGE_SIZE_GRID : PAGE_SIZE_LIST;
  }

  toggleExcellentOnly(): void {
    this.excellentOnly = !this.excellentOnly;
    this.page = 0;
  }

  toggleAffordableOnly(): void {
    this.affordableOnly = !this.affordableOnly;
    this.page = 0;
  }

  setPage(page: number): void {
    this.page = Math.max(0, Math.min(page, this.pageCount - 1));
  }

  hover(id: string, x: number, y: number): void {
    this.hovered = { id, x, y };
  }

  unhover(id: string): void {
    if (this.hovered?.id === id) this.hovered = null;
  }

  /** How many listings sit in each rail, for the counts beside the labels. */
  get categoryCounts(): Record<string, number> {
    const counts: Record<string, number> = { all: 0 };
    for (const c of CATEGORIES) counts[c.id] = 0;
    for (const l of this.listings.filter(isOnSale)) {
      counts.all++;
      counts[l.category] = (counts[l.category] ?? 0) + 1;
    }
    return counts;
  }

  /**
   * The bag under the same category rail the catalogue uses, carrying each
   * entry's index into `inventory` so picking one still addresses the bag.
   */
  get bagFiltered(): { item: Item; index: number }[] {
    return this.inventory
      .map((entry, index) => ({ item: entry.item, index }))
      .filter(e => this.category === 'all' || categoryOf(e.item) === this.category);
  }

  get bagCounts(): Record<string, number> {
    const counts: Record<string, number> = { all: this.inventory.length };
    for (const c of CATEGORIES) counts[c.id] ??= 0;
    for (const { item } of this.inventory) {
      const id = categoryOf(item);
      counts[id] = (counts[id] ?? 0) + 1;
    }
    return counts;
  }

  get matching(): Listing[] {
    const needle = this.search.trim().toLowerCase();
    // The catalogue is what is actually buyable. A seller's own rows in every
    // other state - being listed, reserved, sold, coming back - are for the
    // My Listings tab only, and were the "for sale but never taken" rows
    // before this filter existed.
    const pool =
      this.tab === 'mine' ? this.listings.filter(l => l.mine) : this.listings.filter(isOnSale);

    const filtered = pool.filter(l => {
      if (this.tab === 'browse' && this.category !== 'all' && l.category !== this.category) {
        return false;
      }
      if (this.excellentOnly && !l.item.isExcellent && !l.item.isAncient) return false;
      if (this.affordableOnly && l.price > this.zen) return false;
      if (needle && !displayName(l.item).toLowerCase().includes(needle)) {
        if (!l.seller.toLowerCase().includes(needle)) return false;
      }
      return true;
    });

    const sorted = filtered.slice();
    switch (this.sort) {
      case 'price-asc':
        sorted.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        sorted.sort((a, b) => b.price - a.price);
        break;
      case 'deal':
        sorted.sort((a, b) => a.price / a.median - b.price / b.median);
        break;
      default:
        sorted.sort((a, b) => b.listedAt - a.listedAt);
    }
    return sorted;
  }

  get pageCount(): number {
    return Math.max(1, Math.ceil(this.matching.length / this.pageSize));
  }

  get pageItems(): Listing[] {
    const start = Math.min(this.page, this.pageCount - 1) * this.pageSize;
    return this.matching.slice(start, start + this.pageSize);
  }

  get hoveredListing(): Listing | null {
    if (!this.hovered) return null;
    return this.listings.find(l => l.id === this.hovered!.id) ?? null;
  }

  canAfford(listing: Listing): boolean {
    return this.zen >= listing.price;
  }

  askBuy(listing: Listing): void {
    this.confirming = listing;
  }

  cancelBuy(): void {
    this.confirming = null;
  }

  // ---- the three-step commits --------------------------------------------

  private setFlash(text: string | null): void {
    runInAction(() => {
      this.flash = text;
    });
  }

  private setBusy(busy: boolean): void {
    runInAction(() => {
      this.busy = busy;
    });
  }

  /**
   * Tells the service to read the box after a result packet, whatever the
   * status said. A settle that fails is logged, not shown: the service's own
   * sweep reads the same box later, and the player has already seen the game
   * server's answer.
   */
  private async settle(listingId: string, result: EscrowResult): Promise<void> {
    const item = result.status === 'ok' && result.item ? Array.from(result.item) : undefined;
    try {
      await this.deps.api.settle(listingId, item);
    } catch (error) {
      console.warn(`marketplace: settle of ${listingId} failed`, error);
    }
  }

  private static errorText(error: unknown, fallback: TextKey): string {
    return error instanceof Error && error.message ? error.message : t(fallback);
  }

  /**
   * Buys the listing the player confirmed: the service reserves it for this
   * buyer and mints a token, the game server takes the Zen and puts the item
   * in the bag, and the service settles. A refusal (no room, not enough Zen)
   * gives the claim straight back so the listing is on sale again at once
   * rather than after the claim timeout.
   */
  async confirmBuy(): Promise<void> {
    const listing = this.confirming;
    if (!listing || !this.canAfford(listing) || this.busy) return;

    runInAction(() => {
      this.confirming = null;
    });

    if (this.mode === 'offline') {
      // A development build with no service: the Zen and the listing move
      // locally so the flow can be walked end to end.
      this.zen -= listing.price;
      this.listings = this.listings.filter(l => l.id !== listing.id);
      this.flash = t('marketplace.bought', { name: displayName(listing.item) });
      this.setPage(this.page);
      return;
    }

    const name = displayName(listing.item);
    this.setBusy(true);
    try {
      const { token } = await this.deps.api.claim(listing.id, this.characterName);
      const result = await this.deps.bridge.send(token, listing.id);
      await this.settle(listing.id, result);
      if (result.status === 'ok') {
        this.setFlash(t('marketplace.bought', { name }));
      } else {
        await this.deps.api.release(listing.id).catch(error => {
          console.warn(`marketplace: release of ${listing.id} failed`, error);
        });
        this.setFlash(escrowStatusText(result.status));
      }
    } catch (error) {
      if (error instanceof MarketError && error.status === 409) {
        this.setFlash(t('marketplace.claimedByOther'));
      } else {
        this.setFlash(MarketplaceStore.errorText(error, 'marketplace.buyRefused'));
      }
    } finally {
      this.setBusy(false);
    }
    await this.refresh();
  }

  /**
   * Pulls one of the player's own listings. A row the game server has not
   * taken yet is cancelled outright (no token); an active one comes back
   * through the game server, which needs room in the bag for it.
   */
  async cancelListing(id: string): Promise<void> {
    const listing = this.listings.find(l => l.id === id);
    if (!listing || this.busy) return;
    const name = displayName(listing.item);

    if (this.mode === 'offline') {
      this.listings = this.listings.filter(l => l.id !== id);
      this.flash = t('marketplace.cancelled', { name });
      this.setPage(this.page);
      return;
    }

    this.setBusy(true);
    try {
      const { token } = await this.deps.api.cancel(id, this.characterName);
      if (token === null) {
        this.setFlash(t('marketplace.cancelled', { name }));
      } else {
        const result = await this.deps.bridge.send(token, id);
        await this.settle(id, result);
        this.setFlash(
          result.status === 'ok'
            ? t('marketplace.cancelled', { name })
            : escrowStatusText(result.status)
        );
      }
    } catch (error) {
      this.setFlash(MarketplaceStore.errorText(error, 'marketplace.cancelFailed'));
    } finally {
      this.setBusy(false);
    }
    await this.refresh();
  }

  pickForSale(index: number | null): void {
    this.sellPick = index;
    this.sellPrice = '';
  }

  setSellPrice(value: string): void {
    // Digits only, and never above the game's own Zen ceiling.
    const digits = value.replace(/\D/g, '').slice(0, 10);
    const n = Number(digits || 0);
    this.sellPrice = n > 2_000_000_000 ? '2000000000' : digits;
  }

  get sellPriceValue(): number {
    return Number(this.sellPrice || 0);
  }

  /**
   * What the same item is going for right now, cheapest first. Matched on the
   * base item rather than the exact roll: a seller wants to see every Dragon
   * Armor on the market, then judge their own +9 excellent against them.
   */
  get comparable(): Listing[] {
    const item = this.sellPick === null ? null : this.inventory[this.sellPick]?.item;
    if (!item) return [];
    return this.listings
      .filter(l => isOnSale(l) && l.item.group === item.group && l.item.num === item.num)
      .sort((a, b) => a.price - b.price);
  }

  /** The cheapest of those, which is the number a seller actually undercuts. */
  get comparableFloor(): number | null {
    return this.comparable[0]?.price ?? null;
  }

  /**
   * Lists the picked item: the service opens a `pending` row and mints a
   * token, the game server takes the item out of the bag and answers with
   * its own bytes for it, and the service settles with those. Only then is
   * the row on sale.
   */
  async listForSale(): Promise<void> {
    const index = this.sellPick;
    const entry = index === null ? null : this.inventory[index];
    if (!entry || this.sellPriceValue <= 0 || this.busy) return;
    const { item, slot } = entry;
    const name = displayName(item);

    if (this.mode === 'offline') {
      this.listings = [
        {
          id: `L${Math.random().toString(36).slice(2, 7)}`,
          item,
          category: categoryOf(item),
          seller: t('marketplace.you'),
          price: this.sellPriceValue,
          listedAt: Date.now(),
          median: this.sellPriceValue,
          mine: true,
        },
        ...this.listings,
      ];
      this.inventory = this.inventory.filter((_, i) => i !== index);
      this.sellPick = null;
      this.sellPrice = '';
      this.flash = t('marketplace.listedFlash', { name });
      this.setTab('mine');
      return;
    }

    const price = this.sellPriceValue;
    this.setBusy(true);
    try {
      const { listing, token } = await this.deps.api.list({
        character: this.characterName,
        slot,
        price,
        category: categoryOf(item),
        item,
      });
      const result = await this.deps.bridge.send(token, listing.id);
      await this.settle(listing.id, result);
      if (result.status === 'ok') {
        runInAction(() => {
          this.sellPick = null;
          this.sellPrice = '';
          this.flash = t('marketplace.listedFlash', { name });
        });
        this.setTab('mine');
      } else {
        this.setFlash(escrowStatusText(result.status));
      }
    } catch (error) {
      this.setFlash(MarketplaceStore.errorText(error, 'marketplace.listRefused'));
    } finally {
      this.setBusy(false);
    }
    await this.refresh();
  }

  /**
   * Collects the Zen from sales: one token per sold box, sent one after
   * another, the amounts summed as the game server confirms them. The wallet
   * has a ceiling, so a `moneyCap` stops the run and says so; the rest waits
   * for the next Collect.
   */
  async collectPayout(): Promise<void> {
    if (this.payoutOwed <= 0 || this.busy) return;

    if (this.mode === 'offline') {
      this.zen += this.payoutOwed;
      this.flash = t('marketplace.collected', { amount: formatZen(this.payoutOwed) });
      this.payoutOwed = 0;
      return;
    }

    this.setBusy(true);
    let collected = 0;
    let stopped: string | null = null;
    try {
      const { payouts } = await this.deps.api.payout(this.characterName);
      if (payouts.length === 0) {
        this.setFlash(t('marketplace.nothingToCollect'));
        return;
      }
      for (const { listingId, token } of payouts) {
        const result = await this.deps.bridge.send(token, listingId);
        if (result.status === 'ok') {
          collected += result.amount;
          continue;
        }
        stopped = escrowStatusText(result.status);
        if (result.status === 'moneyCap') break;
      }
    } catch (error) {
      stopped = MarketplaceStore.errorText(error, 'marketplace.collectFailed');
    } finally {
      this.setBusy(false);
    }

    try {
      await this.deps.api.settlePayout();
    } catch (error) {
      console.warn('marketplace: payout settle failed', error);
    }

    const summary = collected > 0 ? t('marketplace.collected', { amount: formatZen(collected) }) : null;
    this.setFlash([summary, stopped].filter(Boolean).join(' ') || t('marketplace.collectFailed'));
    await this.refresh();
  }

  clearFlash(): void {
    this.flash = null;
  }

  /** The world page pushes the live numbers in; the harness pushes fixtures. */
  syncFromGame(zen: number, inventory: BagEntry[], characterName = ''): void {
    if (characterName) this.characterName = characterName;
    this.zen = zen;
    this.inventory = inventory;
    // The picked bag entry may have left the bag (listed, or moved in game).
    if (this.sellPick !== null && this.sellPick >= inventory.length) this.sellPick = null;
  }
}

export const Marketplace = new MarketplaceStore();

export const toggleMarketplaceWindow = () => Marketplace.toggle();

export function formatZen(zen: number): string {
  // Grouping follows the player's language: 1,250,000 in English, 1.250.000
  // in Spanish and German, 1 250 000 in French.
  return zen.toLocaleString(i18n.language);
}

/** "2h ago" / "3d ago", short enough for a card corner. */
export function sinceLabel(at: number): string {
  const mins = Math.max(0, Math.floor((Date.now() - at) / 60000));
  if (mins < 60) return t('marketplace.agoMinutes', { value: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t('marketplace.agoHours', { value: hours });
  return t('marketplace.agoDays', { value: Math.floor(hours / 24) });
}
